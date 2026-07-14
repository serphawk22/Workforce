"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity-log";
import { syncTaskToSheet } from "@/lib/sheet-writer";

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
  const timeSpent = parseInt(formData.get("timeSpent") as string) || 0;
  const newTaskTitle = formData.get("newTaskTitle") as string;
  const newTaskProjectId = formData.get("newTaskProjectId") as string;
  const newTaskDescription = formData.get("newTaskDescription") as string;

  if (!status) return { error: "Status is required" };

  if (newTaskTitle) {
    if (!newTaskProjectId) return { error: "Project is required to create a task" };

    const board = await prisma.board.findUnique({
      where: { projectId: newTaskProjectId },
      include: { columns: { orderBy: { order: "asc" } } },
    });
    if (!board) return { error: "Board not found for this project" };

    const todoColumn = board.columns.find((c) => c.name === "To Do") || board.columns[0];

    const maxOrder = await prisma.task.aggregate({
      where: { columnId: todoColumn.id },
      _max: { order: true },
    });

    const newTask = await prisma.task.create({
      data: {
        columnId: todoColumn.id,
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

    const sheetStatus = STATUS_COLUMN_MAP[status] || status;

    const targetColumn = board.columns.find((c) => c.name === sheetStatus);

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
      newValue: sheetStatus,
      metadata: {
        subtaskId: subtaskId || undefined,
        timeSpent: String(timeSpent),
        hasNotes: progressNotes ? "true" : "false",
      },
    });

    revalidatePath(`/project/${newTask.column.board.projectId}`);
    revalidatePath("/dashboard");
    return { success: true, workUpdateId: workUpdate.id, isNewTask: true, taskId: newTask.id };
  }

  if (!taskId) return { error: "Task ID is required" };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } },
      assignee: { select: { id: true, name: true } },
    },
  });
  if (!task) return { error: "Task not found" };
  const isWorkspaceMember = task.column.board.project.workspace.members.length > 0;
  const isAssignee = task.assigneeId === session.user.id;
  if (!isWorkspaceMember && !isAssignee) return { error: "Not authorized" };
  if (task.assigneeId && !isAssignee) return { error: "You can only update your own tasks" };

  const sheetStatus = STATUS_COLUMN_MAP[status] || status;

  const targetColumn = await prisma.column.findFirst({
    where: { boardId: task.column.boardId, name: sheetStatus },
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

  if (task.sheetCode) {
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    const sheetUpdates: Record<string, string> = {
      "current state": sheetStatus,
    };
    if (githubLink) sheetUpdates["github link"] = githubLink;
    if (productionUrl) sheetUpdates["Production URL"] = productionUrl;
    if (progressNotes) sheetUpdates["progress notes"] = progressNotes;
    sheetUpdates["current owner"] = session.user.name || session.user.email || "Employee";
    sheetUpdates["last updated"] = `${today} ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    if (dateField) {
      if (dateField === "dateOfDevAcceptOrStart") sheetUpdates["date of dev accept or start"] = today;
      else if (dateField === "dateOfDevComplete") sheetUpdates["date of dev complete"] = today;
      else if (dateField === "dateOfQaOrUatStart") sheetUpdates["date of qa or uat start"] = today;
      else if (dateField === "dateOfReleaseToProd") sheetUpdates["date of release to prod"] = today;
    }
    await syncTaskToSheet(task.sheetCode, sheetUpdates).catch(() => {});
  }

  await logActivity(taskId, session.user.id, "work_update", {
    fieldName: "status",
    oldValue: task.column.name,
    newValue: sheetStatus,
    metadata: {
      subtaskId: subtaskId || undefined,
      timeSpent: String(timeSpent),
      hasNotes: progressNotes ? "true" : "false",
    },
  });

  revalidatePath(`/project/${task.column.board.projectId}`);
  revalidatePath("/dashboard");
  return { success: true, workUpdateId: workUpdate.id };
}

export async function getWorkUpdates(taskId?: string) {
  const where: Record<string, unknown> = {};
  if (taskId) where.taskId = taskId;

  const updates = await prisma.workUpdate.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      subtask: { select: { id: true, title: true, status: true } },
      task: {
        select: { id: true, title: true, issueKey: true, sheetCode: true },
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
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    include: {
      column: { include: { board: { include: { project: true } } } },
    },
    distinct: ["columnId"],
  });

  const projectMap = new Map<string, { id: string; name: string; key: string; tasks: { id: string; title: string; issueKey: string | null }[] }>();

  for (const task of tasks) {
    const project = task.column.board.project;
    if (!projectMap.has(project.id)) {
      projectMap.set(project.id, { id: project.id, name: project.name, key: project.key, tasks: [] });
    }
    projectMap.get(project.id)!.tasks.push({ id: task.id, title: task.title, issueKey: task.issueKey });
  }

  return Array.from(projectMap.values());
}
