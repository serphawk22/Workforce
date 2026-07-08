"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from "@/lib/schemas";

export async function createTask(formData: FormData) {
  const session = await requireAuth();
  const raw: Record<string, unknown> = {
    columnId: formData.get("columnId"),
    title: formData.get("title"),
  };
  const desc = formData.get("description");
  if (desc) raw.description = desc;
  const prio = formData.get("priority");
  if (prio) raw.priority = prio;
  const assignee = formData.get("assigneeId");
  if (assignee) raw.assigneeId = assignee;
  const due = formData.get("dueDate");
  if (due) raw.dueDate = due;
  const sprint = formData.get("sprintId");
  if (sprint) raw.sprintId = sprint;
  const labelIdList = formData.getAll("labelIds");
  if (labelIdList.length) raw.labelIds = labelIdList;

  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { columnId, title, description, priority, assigneeId, dueDate, sprintId, labelIds } = parsed.data;

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: { include: { project: true } } },
  });
  if (!column) return { error: { _form: ["Column not found"] } };

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: column.board.project.workspaceId } },
  });
  if (!member) return { error: { _form: ["Not authorized"] } };

  const maxOrder = await prisma.task.aggregate({
    where: { columnId },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      columnId,
      title,
      description: description || null,
      priority: priority || "MEDIUM",
      assigneeId: assigneeId || null,
      reporterId: session.user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
      sprintId: sprintId || null,
      order: (maxOrder._max.order ?? -1) + 1,
      ...(labelIds && labelIds.length > 0
        ? { labels: { create: labelIds.map((id) => ({ labelId: id })) } }
        : {}),
    },
  });

  revalidatePath(`/project/${column.board.projectId}`);
  return { id: task.id };
}

export async function updateTask(formData: FormData) {
  const session = await requireAuth();
  const raw: Record<string, unknown> = { id: formData.get("id") };
  const titleField = formData.get("title");
  if (titleField !== null) raw.title = titleField;
  const descField = formData.get("description");
  raw.description = descField;
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

  const parsed = updateTaskSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { id, title, description, priority, assigneeId, dueDate, columnId, sprintId } = parsed.data;

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!existing) return { error: { _form: ["Task not found"] } };

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (priority !== undefined) data.priority = priority;
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (columnId !== undefined) data.columnId = columnId;
  if (sprintId !== undefined) data.sprintId = sprintId || null;

  await prisma.task.update({ where: { id }, data });

  revalidatePath(`/project/${existing.column.board.projectId}`);
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
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!task) return { error: { _form: ["Task not found"] } };

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

  revalidatePath(`/project/${task.column.board.projectId}`);
  return { success: true };
}

export async function deleteTask(formData: FormData) {
  const session = await requireAuth();
  const taskId = formData.get("taskId") as string;
  if (!taskId) return { error: { _form: ["Task ID required"] } };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!task) return { error: { _form: ["Task not found"] } };

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/project/${task.column.board.projectId}`);
  return { success: true };
}
