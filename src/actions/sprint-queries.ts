"use server";

import { prisma } from "@/lib/prisma";

export async function getSprints(projectId: string) {
  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });
  return sprints;
}

export async function getSprintWithTasks(sprintId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      _count: { select: { tasks: true } },
    },
  });
  return sprint;
}
