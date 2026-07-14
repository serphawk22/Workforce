"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity-log";

export async function createSubtask(taskId: string, title: string) {
  const session = await requireAuth();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } } },
  });
  if (!task) return { error: "Task not found" };
  if (task.column.board.project.workspace.members.length === 0) return { error: "Not authorized" };

  const subtask = await prisma.subtask.create({
    data: { taskId, title, createdById: session.user.id },
  });

  await logActivity(taskId, session.user.id, "subtask_created", {
    metadata: { subtaskId: subtask.id, title },
  });

  revalidatePath(`/project/${task.column.board.projectId}`);
  return { subtask: { id: subtask.id, title: subtask.title, status: subtask.status, createdAt: subtask.createdAt.toISOString(), updatedAt: subtask.updatedAt.toISOString() } };
}

export async function updateSubtaskStatus(subtaskId: string, status: string) {
  const session = await requireAuth();

  const subtask = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: { include: { column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } } } } },
  });
  if (!subtask) return { error: "Subtask not found" };
  if (subtask.task.column.board.project.workspace.members.length === 0) return { error: "Not authorized" };

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { status },
  });

  await logActivity(subtask.taskId, session.user.id, "subtask_status_changed", {
    fieldName: "status",
    oldValue: subtask.status,
    newValue: status,
    metadata: { subtaskId, title: subtask.title },
  });

  revalidatePath(`/project/${subtask.task.column.board.projectId}`);
  return { success: true };
}

export async function getSubtacks(taskId: string) {
  const subtasks = await prisma.subtask.findMany({
    where: { taskId },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return subtasks.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    createdBy: s.createdBy.name,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}
