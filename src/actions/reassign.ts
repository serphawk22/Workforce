"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { requireAdmin } from "@/lib/authorization";
import { syncTaskToSheet } from "@/lib/sheet-writer";
import { logActivity } from "@/lib/activity-log";

export async function reassignTask(formData: FormData): Promise<{ error: string; success?: undefined } | { success: true; error?: undefined }> {
  const session = await requireAdmin();
  const taskId = formData.get("taskId") as string;
  const newAssigneeId = formData.get("newAssigneeId") as string;
  const reason = formData.get("reason") as string;

  if (!taskId || !newAssigneeId) {
    return { error: "Task ID and new assignee are required" };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } },
      assignee: true,
    },
  });

  if (!task) return { error: "Task not found" };
  if (task.column.board.project.workspace.members.length === 0) return { error: "Not authorized" };

  if (task.assigneeId === newAssigneeId) return { error: "Task is already assigned to this user" };

  const previousAssigneeId = task.assigneeId;

  await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId: newAssigneeId },
  });

  await prisma.reassignmentHistory.create({
    data: {
      taskId,
      previousAssigneeId,
      newAssigneeId,
      changedById: session.user.id,
      reason: reason || null,
    },
  });

  await logActivity(taskId, session.user.id, "reassigned", {
    fieldName: "assigneeId",
    oldValue: previousAssigneeId ?? undefined,
    newValue: newAssigneeId,
    metadata: { reason: reason || undefined },
  });

  await prisma.notification.create({
    data: {
      userId: newAssigneeId,
      type: "reassignment",
      title: `Reassigned: ${task.issueKey || task.title}`,
      message: reason ? `"${reason}"` : `You have been assigned to "${task.title}"`,
      taskId,
    },
  });

  if (task.sheetCode) {
    const newAssignee = await prisma.user.findUnique({
      where: { id: newAssigneeId },
      select: { name: true, email: true },
    });
    const ownerValue = newAssignee?.name || newAssignee?.email || "";
    await syncTaskToSheet(task.sheetCode, { "current owner": ownerValue }).catch(() => {});
  }

  revalidatePath(`/project/${task.column.board.projectId}`);
  return { success: true };
}

export async function getReassignmentHistory(taskId: string) {
  const session = await requireAuth();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      column: {
        select: {
          board: {
            select: {
              project: {
                select: {
                  workspace: {
                    select: {
                      members: {
                        where: { userId: session.user.id },
                        select: { id: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!task) return [];
  if (task.column.board.project.workspace.members.length === 0) return [];

  const history = await prisma.reassignmentHistory.findMany({
    where: { taskId },
    include: {
      previousAssignee: { select: { id: true, name: true } },
      newAssignee: { select: { id: true, name: true } },
      changedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return history.map((h) => ({
    ...h,
    createdAt: h.createdAt.toISOString(),
  }));
}
