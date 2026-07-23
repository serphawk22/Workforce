"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { generateAISummary } from "@/lib/ai-summary";
import { generateNextChildTaskCode } from "@/lib/task-code";
import { requireAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/authorization";

// Maps work-update status values → board column names
const STATUS_COLUMN_MAP: Record<string, string> = {
  TODO:        "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW:      "Review",
  TESTING:     "Testing",
  DONE:        "Done",
};

// Auto-set date fields when status first reaches that stage
const STATUS_DATE_FIELD: Record<string, string> = {
  IN_PROGRESS: "dateOfDevAcceptOrStart",
  REVIEW:      "dateOfDevComplete",
  TESTING:     "dateOfQaOrUatStart",
  DONE:        "dateOfReleaseToProd",
};

export async function submitDailyWork(formData: FormData) {
  const session = await requireAuth();
  const employeeId = formData.get("employeeId") as string;
  if (employeeId !== session.user.id) {
    const admin = await isAdmin();
    if (!admin) return { error: "You can only submit work on behalf of yourself" };
  }

  const projectId       = formData.get("projectId") as string;
  const taskId          = formData.get("taskId") as string;
  const todayWork       = formData.get("todayWork") as string;
  const todayWorkCompleted = formData.get("todayWorkCompleted") as string;
  const tomorrowTask    = formData.get("tomorrowTask") as string;
  const blockers        = formData.get("blockers") as string;
  const yesterdayPlan   = formData.get("yesterdayPlan") as string;
  const yesterdayCompleted = formData.get("yesterdayCompleted") as string;
  const referenceLinks  = formData.get("referenceLinks") as string;
  const attachments     = formData.get("attachments") as string;

  // Work-update fields (new)
  const workStatus      = formData.get("status") as string | null;
  const subtaskId       = formData.get("subtaskId") as string | null;
  const progressNotes   = formData.get("progressNotes") as string | null;
  const githubLink      = formData.get("githubLink") as string | null;
  const productionUrl   = formData.get("productionUrl") as string | null;
  const timeSpentHours  = parseFloat(formData.get("timeSpent") as string || "0");
  const timeSpent       = Math.round(timeSpentHours * 60); // store as minutes

  if (!employeeId) return { error: "Employee name is required" };
  if (!todayWork?.trim()) return { error: "Today's work is required" };
  if (!tomorrowTask?.trim()) return { error: "Tomorrow's task is required" };

  let resolvedTaskId = taskId || null;

  // ── Create new task if requested ──────────────────────────────────────────
  if (taskId === "__new__") {
    const newTaskTitle = formData.get("newTaskTitle") as string;
    if (!newTaskTitle?.trim()) return { error: "New task title is required" };
    if (!projectId) return { error: "Project is required to create a task" };

    const board = await prisma.board.findUnique({
      where: { projectId },
      include: { columns: { orderBy: { order: "asc" } } },
    });
    if (!board) return { error: "Board not found for this project" };

    const todoColumn = board.columns.find((c) => c.name === "To Do") || board.columns[0];
    if (!todoColumn) return { error: "No columns found in this project" };

    const maxOrder = await prisma.task.aggregate({
      where: { columnId: todoColumn.id },
      _max: { order: true },
    });

    const newTask = await prisma.task.create({
      data: {
        columnId: todoColumn.id,
        title: newTaskTitle.trim(),
        reporterId: employeeId,
        assigneeId: employeeId,
        order: (maxOrder._max.order ?? 0) + 1,
      },
    });
    resolvedTaskId = newTask.id;
  }

  // ── Create a WorkUpdate + move task column when a real task is linked ─
  if (resolvedTaskId && workStatus) {
    const task = await prisma.task.findUnique({
      where: { id: resolvedTaskId },
      include: { column: { include: { board: true } } },
    });

    if (task) {
      const columnName  = STATUS_COLUMN_MAP[workStatus] ?? workStatus;
      const targetColumn = await prisma.column.findFirst({
        where: { boardId: task.column.boardId, name: columnName },
      });

      const dateField = STATUS_DATE_FIELD[workStatus];
      const dateUpdate: Record<string, Date> = {};
      if (dateField && !(task as Record<string, unknown>)[dateField]) {
        dateUpdate[dateField] = new Date();
      }

      await prisma.task.update({
        where: { id: resolvedTaskId },
        data: {
          ...(targetColumn ? { columnId: targetColumn.id } : {}),
          ...dateUpdate,
          ...(githubLink    ? { githubLink }    : {}),
          ...(productionUrl ? { productionUrl } : {}),
        },
      });

      const subtaskTitle = subtaskId ? (await prisma.subtask.findUnique({ where: { id: subtaskId }, select: { title: true } }))?.title : null;
      const aiSummary = generateAISummary({
        taskTitle: task.title,
        subtaskTitle,
        todayWork: todayWork.trim(),
        tomorrowTask: tomorrowTask.trim(),
        timeSpent,
        status: workStatus,
        blockers: blockers || null,
        githubLink: githubLink || null,
        productionUrl: productionUrl || null,
      });

      await prisma.workUpdate.create({
        data: {
          taskId:       resolvedTaskId,
          userId:       employeeId,
          subtaskId:    subtaskId || null,
          status:       workStatus,
          progressNotes: progressNotes || null,
          workSummary:  todayWork.trim() || null,
          aiSummary,
          githubLink:   githubLink || null,
          productionUrl: productionUrl || null,
          timeSpent,
          todayWork:    todayWork.trim(),
          todayWorkCompleted,
          yesterdayPlan:     yesterdayPlan || undefined,
          yesterdayCompleted: yesterdayCompleted || undefined,
          tomorrowTask: tomorrowTask.trim(),
          blockers:     blockers || undefined,
          referenceLinks: referenceLinks || undefined,
          attachments:  attachments || undefined,
        },
      });

      await logActivity(resolvedTaskId, employeeId, "work_update", {
        fieldName: "status",
        oldValue:  task.column.name,
        newValue:  columnName,
        metadata: {
          subtaskId:  subtaskId || undefined,
          timeSpent:  String(timeSpent),
          hasNotes:   progressNotes ? "true" : "false",
          source:     "daily_work",
        },
      });

      // Revalidate the project board so the card moves visually
      revalidatePath(`/project/${task.column.board.projectId}`);
      revalidatePath(`/project/${task.column.board.projectId}/board`);
    }
  } else if (!resolvedTaskId) {
    const aiSummary = generateAISummary({
      taskTitle: null,
      subtaskTitle: null,
      todayWork: todayWork.trim(),
      tomorrowTask: tomorrowTask.trim(),
      timeSpent,
      status: workStatus || "IN_PROGRESS",
      blockers: blockers || null,
      githubLink: githubLink || null,
      productionUrl: productionUrl || null,
    });

    await prisma.workUpdate.create({
      data: {
        userId:       employeeId,
        status:       workStatus || "IN_PROGRESS",
        progressNotes: progressNotes || null,
        workSummary:  todayWork.trim() || null,
        aiSummary,
        githubLink:   githubLink || null,
        productionUrl: productionUrl || null,
        timeSpent,
        todayWork:    todayWork.trim(),
        todayWorkCompleted,
        yesterdayPlan:     yesterdayPlan || undefined,
        yesterdayCompleted: yesterdayCompleted || undefined,
        tomorrowTask: tomorrowTask.trim(),
        blockers:     blockers || undefined,
        referenceLinks: referenceLinks || undefined,
        attachments:  attachments || undefined,
      },
    });
  }

  revalidatePath("/daily-work");
  revalidatePath("/admin/daily-work");
  revalidatePath("/admin/employee-tracking");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getDailyWorkEntries(filters?: {
  employeeId?: string;
  projectId?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}) {
  const session = await requireAuth();
  const admin = await isAdmin();

  const where: Record<string, unknown> = {};

  if (!admin) {
    where.userId = session.user.id;
  } else if (filters?.employeeId) {
    where.userId = filters.employeeId;
  }
  if (filters?.projectId) where.taskId = { in: (await prisma.task.findMany({ where: { column: { board: { projectId: filters.projectId } } }, select: { id: true } })).map(t => t.id) };
  if (filters?.status) where.status = filters.status;

  if (filters?.from || filters?.to) {
    const dateFilter: Record<string, Date> = {};
    if (filters?.from) dateFilter.gte = new Date(filters.from);
    if (filters?.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.createdAt = dateFilter;
  }

  let entries = await prisma.workUpdate.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, department: true } },
      task: { select: { id: true, title: true, code: true, column: { include: { board: { select: { project: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.user.name.toLowerCase().includes(q) ||
        (e.todayWork && e.todayWork.toLowerCase().includes(q)) ||
        (e.tomorrowTask && e.tomorrowTask.toLowerCase().includes(q)) ||
        (e.task?.title && e.task.title.toLowerCase().includes(q)) ||
        (e.task?.column.board.project?.name && e.task.column.board.project.name.toLowerCase().includes(q))
    );
  }

  return entries.map((e) => ({
    id: e.id,
    employeeId: e.userId,
    employeeName: e.user.name,
    employeeEmail: e.user.email,
    employeeAvatar: e.user.avatarUrl,
    employeeDepartment: e.user.department,
    projectId: e.task?.column.board.project?.id ?? null,
    projectName: e.task?.column.board.project?.name ?? null,
    projectKey: e.task?.column.board.project?.key ?? null,
    taskId: e.taskId,
    taskTitle: e.task?.title ?? null,
    taskCode: e.task?.code ?? null,
    todayWork: e.todayWork ?? null,
    todayWorkCompleted: e.todayWorkCompleted ?? null,
    yesterdayPlan: e.yesterdayPlan ?? null,
    yesterdayCompleted: e.yesterdayCompleted ?? null,
    tomorrowTask: e.tomorrowTask ?? null,
    status: e.status,
    timeSpent: e.timeSpent,
    workSummary: e.workSummary ?? null,
    blockers: e.blockers ?? null,
    aiSummary: e.aiSummary ?? null,
    referenceLinks: e.referenceLinks ?? null,
    attachments: e.attachments ?? null,
    submittedAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt?.toISOString() ?? e.createdAt.toISOString(),
  }));
}

export async function getYesterdaysPlan(employeeId: string) {
  const session = await requireAuth();
  if (employeeId !== session.user.id) {
    const admin = await isAdmin();
    if (!admin) return null;
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const yesterdayEntry = await prisma.workUpdate.findFirst({
    where: {
      userId: employeeId,
      createdAt: {
        gte: yesterday,
        lte: end,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!yesterdayEntry) return null;

  return {
    tomorrowTask: yesterdayEntry.tomorrowTask,
    id: yesterdayEntry.id,
  };
}

export async function getEmployees() {
  await requireAuth();
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, department: true },
    orderBy: { name: "asc" },
  });
  return users;
}

export async function getProjects() {
  await requireAuth();
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
  });
  return projects;
}

export async function getProjectTasks(projectId: string) {
  await requireAuth();
  if (!projectId) return [];
  const tasks = await prisma.task.findMany({
    where: {
      column: { board: { projectId } },
      parentTaskId: null,
    },
    select: { id: true, title: true, code: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return tasks;
}

export async function createDailyWorkChildTask(parentTaskId: string, title: string) {
  const session = await requireAuth();
  if (!parentTaskId || !title?.trim()) return { error: "Parent task and title required" };

  const parent = await prisma.task.findUnique({
    where: { id: parentTaskId },
    include: { column: { include: { board: { include: { project: { include: { workspace: true } } } } } } },
  });
  if (!parent) return { error: "Parent task not found" };
  if (!parent.code) return { error: "Parent task has no code" };

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: parent.column.board.project.workspaceId } },
  });
  if (!membership) return { error: "Not authorized" };

  const code = await generateNextChildTaskCode(parent.code);

  const maxOrder = await prisma.task.aggregate({
    where: { columnId: parent.columnId },
    _max: { order: true },
  });

  const child = await prisma.task.create({
    data: {
      columnId: parent.columnId,
      title: title.trim(),
      code,
      issueKey: code,
      parentTaskId,
      priority: parent.priority,
      reporterId: parent.reporterId,
      assigneeId: parent.assigneeId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: {
      column: { select: { name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  revalidatePath(`/project/${parent.column.board.project.id}/board`);
  revalidatePath("/dashboard");

  return {
    id: child.id,
    title: child.title,
    code: child.code,
    columnName: child.column.name,
    assignee: child.assignee,
  };
}

export async function getParentChildTasks(taskId: string) {
  await requireAuth();
  if (!taskId) return [];
  const childTasks = await prisma.task.findMany({
    where: { parentTaskId: taskId },
    select: { id: true, title: true, code: true },
    orderBy: { order: "asc" },
  });
  return childTasks;
}

export async function regenerateAISummary(workUpdateId: string) {
  const session = await requireAuth();
  const wu = await prisma.workUpdate.findUnique({
    where: { id: workUpdateId },
    include: { task: { select: { title: true } }, subtask: { select: { title: true } } },
  });
  if (!wu) return { error: "Work update not found" };
  if (wu.userId !== session.user.id) {
    const admin = await isAdmin();
    if (!admin) return { error: "Not authorized" };
  }

  const aiSummary = generateAISummary({
    taskTitle: wu.task?.title ?? null,
    subtaskTitle: wu.subtask?.title ?? null,
    todayWork: wu.todayWork ?? "",
    tomorrowTask: wu.tomorrowTask ?? "",
    timeSpent: wu.timeSpent,
    status: wu.status,
    blockers: wu.blockers ?? null,
    githubLink: wu.githubLink ?? null,
    productionUrl: wu.productionUrl ?? null,
  });

  await prisma.workUpdate.update({
    where: { id: workUpdateId },
    data: { aiSummary },
  });

  revalidatePath("/admin/daily-work");
  revalidatePath("/admin/employee-tracking");

  return { success: true, aiSummary };
}
