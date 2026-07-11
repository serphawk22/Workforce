"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function getTaskDetails(taskId: string) {
  const session = await requireAuth();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
      sprint: { select: { id: true, name: true } },
      labels: { include: { label: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
      column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } },
    },
  });
  if (!task || task.column.board.project.workspace.members.length === 0) return null;

  const { column, ...data } = task;
  return data;
}
