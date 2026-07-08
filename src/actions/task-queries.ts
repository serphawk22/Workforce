"use server";

import { prisma } from "@/lib/prisma";

export async function getTaskDetails(taskId: string) {
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
    },
  });
  return task;
}
