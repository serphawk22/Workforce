"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activity-log";
import { generateNextTaskCode, generateNextChildTaskCode } from "@/lib/task-code";

export async function createTask(formData: FormData): Promise<{ error: Record<string, string[]>; id?: undefined } | { id: string; error?: undefined }> {
  const session = await requireAuth();
  const raw: Record<string, unknown> = {
    columnId: formData.get("columnId"),
    title: formData.get("title"),
  };
  const desc = formData.get("description");
  if (desc) raw.description = desc;
  const typeField = formData.get("type");
  if (typeField) raw.type = typeField;
  const epic = formData.get("epicId");
  if (epic) raw.epicId = epic;
  const parentTaskField = formData.get("parentTaskId");
  if (parentTaskField) raw.parentTaskId = parentTaskField;
  const prio = formData.get("priority");
  if (prio) raw.priority = prio;
  const assignee = formData.get("assigneeId");
  if (assignee) raw.assigneeId = assignee;
  const reporter = formData.get("reporterId");
  if (reporter) raw.reporterId = reporter;
  const due = formData.get("dueDate");
  if (due) raw.dueDate = due;
  const sprint = formData.get("sprintId");
  if (sprint) raw.sprintId = sprint;
  const labelIdList = formData.getAll("labelIds");
  if (labelIdList.length) raw.labelIds = labelIdList;
  const projectIdField = formData.get("projectId");
  if (projectIdField) raw.projectId = projectIdField;

  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { columnId: rawColumnId, title, description, type, epicId, parentTaskId, priority, assigneeId, reporterId, dueDate, sprintId, labelIds, projectId } = parsed.data;

  let columnId = rawColumnId;
  let projectIdResolved: string;

  if (!columnId && projectId) {
    const board = await prisma.board.findUnique({
      where: { projectId },
      include: { columns: { orderBy: { order: "asc" }, take: 1 } },
    });
    if (!board || board.columns.length === 0) return { error: { _form: ["Project has no board or columns"] } };
    columnId = board.columns[0].id;
    projectIdResolved = projectId;
  } else {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { include: { project: true } } },
    });
    if (!column) return { error: { _form: ["Column not found"] } };
    projectIdResolved = column.board.projectId;
  }

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: { include: { project: true } } },
  });
  if (!column) return { error: { _form: ["Column not found"] } };

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: column.board.project.workspaceId } },
  });
  if (!member) return { error: { _form: ["Not authorized"] } };

  let parentTaskCode: string | null = null;
  if (parentTaskId) {
    const parent = await prisma.task.findUnique({ where: { id: parentTaskId }, select: { code: true } });
    if (!parent || !parent.code) return { error: { _form: ["Parent task not found or has no code"] } };
    parentTaskCode = parent.code;
  }

  const code = parentTaskCode
    ? await generateNextChildTaskCode(parentTaskCode)
    : await generateNextTaskCode();

  const maxOrder = await prisma.task.aggregate({
    where: { columnId },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      columnId,
      code,
      title,
      description: description || null,
      type: type || "TASK",
      epicId: epicId || null,
      parentTaskId: parentTaskId || null,
      priority: priority || "MEDIUM",
      assigneeId: assigneeId || null,
      reporterId: reporterId || session.user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
      sprintId: sprintId || null,
      issueKey: code,
      order: (maxOrder._max.order ?? -1) + 1,
      ...(labelIds && labelIds.length > 0
        ? { labels: { create: labelIds.map((id) => ({ labelId: id })) } }
        : {}),
    },
  });

  await logActivity(task.id, session.user.id, parentTaskId ? "subtask_created" : "created", {
    metadata: { issueKey: code, title, parentTaskId: parentTaskId || undefined },
  });

  if (assigneeId) {
    await logActivity(task.id, session.user.id, "assigned", {
      newValue: assigneeId,
      metadata: { issueKey: code },
    });
    await prisma.notification.create({
      data: {
        userId: assigneeId,
        type: "assignment",
        title: `Assigned: #${code}`,
        message: `You have been assigned to "${title}"`,
        taskId: task.id,
      },
    });
  }

  revalidatePath(`/project/${projectIdResolved}/board`);
  revalidatePath("/dashboard");
  revalidatePath("/admin/all-tasks");
  return { id: task.id };
}

export async function updateTask(formData: FormData) {
  const session = await requireAuth();
  const raw: Record<string, unknown> = { id: formData.get("id") };
  const titleField = formData.get("title");
  if (titleField !== null) raw.title = titleField;
  const descField = formData.get("description");
  raw.description = descField;
  const typeField = formData.get("type");
  if (typeField !== null) raw.type = typeField;
  const epicField = formData.get("epicId");
  raw.epicId = epicField !== "" ? epicField : null;
  const prioField = formData.get("priority");
  if (prioField !== null) raw.priority = prioField;
  const assigneeField = formData.get("assigneeId");
  raw.assigneeId = assigneeField;
  const dueField = formData.get("dueDate");
  raw.dueDate = dueField !== "" ? dueField : null;
  const colField = formData.get("columnId");
  if (colField !== null) raw.columnId = colField;
  const sprintField = formData.get("sprintId");
  raw.sprintId = sprintField !== "" ? sprintField : null;
  const githubLinkField = formData.get("githubLink");
  if (githubLinkField !== null) raw.githubLink = githubLinkField;
  const prodUrlField = formData.get("productionUrl");
  if (prodUrlField !== null) raw.productionUrl = prodUrlField;

  const parsed = updateTaskSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { id, title, description, type, epicId, priority, assigneeId, dueDate, columnId, sprintId, githubLink, productionUrl } = parsed.data;

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } } },
  });
  if (!existing) return { error: { _form: ["Task not found"] } };
  if (existing.column.board.project.workspace.members.length === 0) return { error: { _form: ["Not authorized"] } };

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (type !== undefined) data.type = type;
  if (epicId !== undefined) data.epicId = epicId || null;
  if (priority !== undefined) data.priority = priority;
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (columnId !== undefined) data.columnId = columnId;
  if (sprintId !== undefined) data.sprintId = sprintId || null;
  if (githubLink !== undefined) data.githubLink = githubLink || null;
  if (productionUrl !== undefined) data.productionUrl = productionUrl || null;

  await prisma.task.update({ where: { id }, data });

  if (priority !== undefined && priority !== existing.priority) {
    await logActivity(id, session.user.id, "priority_changed", {
      fieldName: "priority",
      oldValue: existing.priority,
      newValue: priority,
    });
  }

  if (assigneeId !== undefined && assigneeId !== existing.assigneeId) {
    await logActivity(id, session.user.id, "assigned", {
      fieldName: "assigneeId",
      oldValue: existing.assigneeId ?? undefined,
      newValue: assigneeId || undefined,
    });
    if (assigneeId) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          type: "assignment",
          title: `Reassigned: ${existing.issueKey || existing.title}`,
          message: `You have been assigned to "${existing.title}"`,
          taskId: id,
        },
      });
    }
  }

  if (columnId !== undefined && columnId !== existing.columnId) {
    const newColumn = await prisma.column.findUnique({ where: { id: columnId } });
    const oldColumn = existing.column;
    await logActivity(id, session.user.id, "status_changed", {
      fieldName: "columnId",
      oldValue: oldColumn.name,
      newValue: newColumn?.name,
    });
  }

  if (title !== undefined && title !== existing.title) {
    await logActivity(id, session.user.id, "updated", {
      fieldName: "title",
      oldValue: existing.title,
      newValue: title,
    });
  }

  revalidatePath(`/project/${existing.column.board.projectId}/board`);
  revalidatePath("/dashboard");
  revalidatePath("/admin/all-tasks");
  return { success: true };
}

export async function moveTask(formData: FormData) {
  const session = await requireAuth();
  const parsed = moveTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    newColumnId: formData.get("newColumnId"),
    newOrder: Number(formData.get("newOrder")),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { taskId, newColumnId, newOrder } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } } },
  });
  if (!task) return { error: { _form: ["Task not found"] } };
  if (task.column.board.project.workspace.members.length === 0) return { error: { _form: ["Not authorized"] } };

  let newColumnName: string | undefined;

  await prisma.$transaction(async (tx) => {
    const columnTasks = await tx.task.findMany({
      where: { columnId: newColumnId, id: { not: taskId } },
      orderBy: { order: "asc" },
    });

    const insertAt = Math.min(newOrder, columnTasks.length);
    const updated = [
      ...columnTasks.slice(0, insertAt),
      { id: taskId },
      ...columnTasks.slice(insertAt),
    ];

    const newColumn = await tx.column.findUnique({ where: { id: newColumnId } });
    newColumnName = newColumn?.name;

    await tx.task.update({
      where: { id: taskId },
      data: { columnId: newColumnId },
    });

    for (let i = 0; i < updated.length; i++) {
      await tx.task.update({
        where: { id: updated[i].id },
        data: { order: i },
      });
    }
  });

  await logActivity(task.id, session.user.id, "status_changed", {
    fieldName: "columnId",
    oldValue: task.column.name,
    newValue: newColumnName,
  });

  revalidatePath(`/project/${task.column.board.projectId}/board`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTask(formData: FormData) {
  const session = await requireAuth();
  const taskId = formData.get("taskId") as string;
  if (!taskId) return { error: { _form: ["Task ID required"] } };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } } },
  });
  if (!task) return { error: { _form: ["Task not found"] } };
  if (task.column.board.project.workspace.members.length === 0) return { error: { _form: ["Not authorized"] } };

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/project/${task.column.board.projectId}/board`);
  revalidatePath("/dashboard");
  return { success: true };
}
