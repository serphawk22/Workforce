"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

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
  const employeeId      = formData.get("employeeId") as string;
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

  // ── Save daily work entry ─────────────────────────────────────────────────
  await prisma.dailyWorkEntry.create({
    data: {
      employee:     { connect: { id: employeeId } },
      project:      projectId ? { connect: { id: projectId } } : undefined,
      task:         resolvedTaskId ? { connect: { id: resolvedTaskId } } : undefined,
      todayWork:    todayWork.trim(),
      todayWorkCompleted: todayWorkCompleted || "",
      yesterdayPlan:     yesterdayPlan || undefined,
      yesterdayCompleted: yesterdayCompleted || undefined,
      tomorrowTask: tomorrowTask.trim(),
      status:       workStatus || "IN_PROGRESS",
      blockers:     blockers || undefined,
      referenceLinks: referenceLinks || undefined,
      attachments:  attachments || undefined,
    },
  });

  // ── Also create a WorkUpdate + move task column when a real task is linked ─
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

      await prisma.workUpdate.create({
        data: {
          taskId:       resolvedTaskId,
          userId:       employeeId,
          subtaskId:    subtaskId || null,
          status:       workStatus,
          progressNotes: progressNotes || null,
          workSummary:  todayWork.trim() || null,
          githubLink:   githubLink || null,
          productionUrl: productionUrl || null,
          timeSpent,
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
  const where: Record<string, unknown> = {};

  if (filters?.employeeId) where.employeeId = filters.employeeId;
  if (filters?.projectId) where.projectId = filters.projectId;
  if (filters?.status) where.status = filters.status;

  if (filters?.from || filters?.to) {
    const dateFilter: Record<string, Date> = {};
    if (filters?.from) dateFilter.gte = new Date(filters.from);
    if (filters?.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.submittedAt = dateFilter;
  }

  let entries = await prisma.dailyWorkEntry.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, email: true, avatarUrl: true, department: true } },
      project: { select: { id: true, name: true, key: true } },
      task: { select: { id: true, title: true, code: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 500,
  });

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.employee.name.toLowerCase().includes(q) ||
        e.todayWork.toLowerCase().includes(q) ||
        e.tomorrowTask.toLowerCase().includes(q) ||
        (e.task?.title && e.task.title.toLowerCase().includes(q)) ||
        (e.project?.name && e.project.name.toLowerCase().includes(q))
    );
  }

  return entries.map((e) => ({
    id: e.id,
    employeeId: e.employeeId,
    employeeName: e.employee.name,
    employeeEmail: e.employee.email,
    employeeAvatar: e.employee.avatarUrl,
    employeeDepartment: e.employee.department,
    projectId: e.projectId,
    projectName: e.project?.name ?? null,
    projectKey: e.project?.key ?? null,
    taskId: e.taskId,
    taskTitle: e.task?.title ?? null,
    taskCode: e.task?.code ?? null,
    todayWork: e.todayWork,
    todayWorkCompleted: e.todayWorkCompleted,
    yesterdayPlan: e.yesterdayPlan,
    yesterdayCompleted: e.yesterdayCompleted,
    tomorrowTask: e.tomorrowTask,
    status: e.status,
    blockers: e.blockers,
    referenceLinks: e.referenceLinks,
    attachments: e.attachments,
    submittedAt: e.submittedAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));
}

export async function getYesterdaysPlan(employeeId: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const yesterdayEntry = await prisma.dailyWorkEntry.findFirst({
    where: {
      employeeId,
      submittedAt: {
        gte: yesterday,
        lte: end,
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  if (!yesterdayEntry) return null;

  return {
    tomorrowTask: yesterdayEntry.tomorrowTask,
    id: yesterdayEntry.id,
  };
}

export async function getEmployees() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, department: true },
    orderBy: { name: "asc" },
  });
  return users;
}

export async function getProjects() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
  });
  return projects;
}

export async function getProjectTasks(projectId: string) {
  if (!projectId) return [];
  const tasks = await prisma.task.findMany({
    where: {
      column: { board: { projectId } },
    },
    select: { id: true, title: true, code: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return tasks;
}
