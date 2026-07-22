"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/authorization";
import { logActivity } from "@/lib/activity-log";
import { generateNextTaskCode } from "@/lib/task-code";

const STATUS_COLUMN_MAP: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  TESTING: "Testing",
  DONE: "Done",
};

const STATUS_DATE_FIELD: Record<string, string> = {
  IN_PROGRESS: "dateOfDevAcceptOrStart",
  REVIEW: "dateOfDevComplete",
  TESTING: "dateOfQaOrUatStart",
  DONE: "dateOfReleaseToProd",
};

export async function submitWorkUpdate(formData: FormData) {
  const session = await requireAuth();

  const taskId = formData.get("taskId") as string;
  const subtaskId = formData.get("subtaskId") as string | null;
  const status = formData.get("status") as string;
  const progressNotes = formData.get("progressNotes") as string;
  const workSummary = formData.get("workSummary") as string;
  const githubLink = formData.get("githubLink") as string;
  const productionUrl = formData.get("productionUrl") as string;
  const timeSpent = Math.round((parseFloat(formData.get("timeSpent") as string) || 0) * 60);
  const newTaskTitle = formData.get("newTaskTitle") as string;
  const newTaskProjectId = formData.get("newTaskProjectId") as string;
  const newTaskDescription = formData.get("newTaskDescription") as string;
  const customCode = formData.get("customCode") as string;

  if (!status) return { error: "Status is required" };

  if (newTaskTitle) {
    if (!newTaskProjectId) return { error: "Project is required to create a task" };

    const board = await prisma.board.findUnique({
      where: { projectId: newTaskProjectId },
      include: { columns: { orderBy: { order: "asc" } } },
    });
    if (!board) return { error: "Board not found for this project" };

    const todoColumn = board.columns.find((c) => c.name === "To Do") || board.columns[0];

    const code = customCode?.trim() || (await generateNextTaskCode());

    const maxOrder = await prisma.task.aggregate({
      where: { columnId: todoColumn.id },
      _max: { order: true },
    });

    const newTask = await prisma.task.create({
      data: {
        columnId: todoColumn.id,
        code,
        issueKey: code,
        title: newTaskTitle,
        description: newTaskDescription || null,
        reporterId: session.user.id,
        assigneeId: session.user.id,
        order: (maxOrder._max.order ?? 0) + 1,
      },
      include: {
        column: { include: { board: { include: { project: true } } } },
      },
    });

    const columnName = STATUS_COLUMN_MAP[status] || status;

    const targetColumn = board.columns.find((c) => c.name === columnName);

    const dateField = STATUS_DATE_FIELD[status];
    const dateUpdate: Record<string, Date | null> = {};
    if (dateField) dateUpdate[dateField] = new Date();

    await prisma.task.update({
      where: { id: newTask.id },
      data: {
        ...(targetColumn ? { columnId: targetColumn.id } : {}),
        ...dateUpdate,
        ...(githubLink ? { githubLink } : {}),
        ...(productionUrl ? { productionUrl } : {}),
      },
    });

    const workUpdate = await prisma.workUpdate.create({
      data: {
        taskId: newTask.id,
        userId: session.user.id,
        subtaskId: subtaskId || null,
        status,
        progressNotes: progressNotes || null,
        workSummary: workSummary || null,
        githubLink: githubLink || null,
        productionUrl: productionUrl || null,
        timeSpent,
      },
    });

    await logActivity(newTask.id, session.user.id, "work_update", {
      fieldName: "status",
      oldValue: todoColumn.name,
      newValue: columnName,
      metadata: {
        subtaskId: subtaskId || undefined,
        timeSpent: String(timeSpent),
        hasNotes: progressNotes ? "true" : "false",
      },
    });

    revalidatePath(`/project/${newTask.column.board.projectId}`);
    revalidatePath("/admin/daily-work");
    revalidatePath("/admin/employee-tracking");
    revalidatePath("/dashboard");
    return { success: true, workUpdateId: workUpdate.id, isNewTask: true, taskId: newTask.id };
  }

  if (!taskId) return { error: "Task ID is required" };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } },
      assignee: { select: { id: true, name: true } },
      _count: { select: { subtasks: true } },
    },
  });
  if (!task) return { error: "Task not found" };
  const isWorkspaceMember = task.column.board.project.workspace.members.length > 0;
  const isAssignee = task.assigneeId === session.user.id;
  if (!isWorkspaceMember && !isAssignee) return { error: "Not authorized" };
  if (task.assigneeId && !isAssignee) return { error: "You can only update your own tasks" };

  if (!subtaskId && task._count.subtasks > 0) {
    const admin = await isAdmin();
    if (!admin) return { error: "Employees must select a subtask to update. Choose an existing subtask or create a new one." };
  }

  const columnName = STATUS_COLUMN_MAP[status] || status;

  const targetColumn = await prisma.column.findFirst({
    where: { boardId: task.column.boardId, name: columnName },
  });

  const dateField = STATUS_DATE_FIELD[status];
  const dateUpdate: Record<string, Date | null> = {};
  if (dateField && !(task as any)[dateField]) {
    dateUpdate[dateField] = new Date();
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(targetColumn ? { columnId: targetColumn.id } : {}),
      ...dateUpdate,
      ...(githubLink ? { githubLink } : {}),
      ...(productionUrl ? { productionUrl } : {}),
    },
  });

  const workUpdate = await prisma.workUpdate.create({
    data: {
      taskId,
      userId: session.user.id,
      subtaskId: subtaskId || null,
      status,
      progressNotes: progressNotes || null,
      workSummary: workSummary || null,
      githubLink: githubLink || null,
      productionUrl: productionUrl || null,
      timeSpent,
    },
  });

  await logActivity(taskId, session.user.id, "work_update", {
    fieldName: "status",
    oldValue: task.column.name,
    newValue: columnName,
    metadata: {
      subtaskId: subtaskId || undefined,
      timeSpent: String(timeSpent),
      hasNotes: progressNotes ? "true" : "false",
    },
  });

  revalidatePath(`/project/${task.column.board.projectId}`);
  revalidatePath("/admin/daily-work");
  revalidatePath("/admin/employee-tracking");
  revalidatePath("/dashboard");
  return { success: true, workUpdateId: workUpdate.id };
}

export async function getWorkUpdates(taskId?: string) {
  const session = await requireAuth();
  const where: Record<string, unknown> = {};
  if (taskId) where.taskId = taskId;
  if (!(await isAdmin())) where.userId = session.user.id;

  const updates = await prisma.workUpdate.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      subtask: { select: { id: true, title: true, status: true } },
      task: {
        select: { id: true, title: true, issueKey: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return updates.map((u) => ({
    id: u.id,
    taskId: u.taskId,
    userId: u.userId,
    subtaskId: u.subtaskId,
    status: u.status,
    progressNotes: u.progressNotes,
    workSummary: u.workSummary,
    githubLink: u.githubLink,
    productionUrl: u.productionUrl,
    timeSpent: u.timeSpent,
    createdAt: u.createdAt.toISOString(),
    user: u.user,
    subtask: u.subtask,
    task: u.task,
  }));
}

export async function getEmployeeProjects(userId: string) {
  await requireAuth();
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId, parentTaskId: null },
    include: {
      column: { include: { board: { include: { project: true } } } },
    },
    distinct: ["columnId"],
  });

  const projectMap = new Map<string, { id: string; name: string; key: string; tasks: { id: string; title: string; code: string | null; issueKey: string | null }[] }>();

  for (const task of tasks) {
    const project = task.column.board.project;
    if (!projectMap.has(project.id)) {
      projectMap.set(project.id, { id: project.id, name: project.name, key: project.key, tasks: [] });
    }
    projectMap.get(project.id)!.tasks.push({ id: task.id, title: task.title, code: task.code, issueKey: task.issueKey });
  }

  return Array.from(projectMap.values());
}

export async function getWorkUpdateChildTasks(taskId: string) {
  await requireAuth();
  if (!taskId) return [];
  return await prisma.task.findMany({
    where: { parentTaskId: taskId },
    select: { id: true, title: true, code: true },
    orderBy: { order: "asc" },
  });
}

export async function getNextCode() {
  await requireAuth();
  return await generateNextTaskCode();
}

export async function updateWorkSummary(workUpdateId: string, workSummary: string) {
  const session = await requireAuth();
  const update = await prisma.workUpdate.findUnique({ where: { id: workUpdateId } });
  if (!update) return { error: "Work update not found" };
  if (update.userId !== session.user.id) return { error: "Not authorized" };

  await prisma.workUpdate.update({
    where: { id: workUpdateId },
    data: { workSummary: workSummary || null },
  });

  revalidatePath(`/project/[projectId]`);
  return { success: true };
}
