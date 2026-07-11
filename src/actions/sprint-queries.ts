"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function getSprints(projectId: string) {
  const session = await requireAuth();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } },
  });
  if (!project || project.workspace.members.length === 0) return [];

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });
  return sprints;
}

export async function getSprintWithTasks(sprintId: string) {
  const session = await requireAuth();
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      project: { select: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!sprint || sprint.project.workspace.members.length === 0) return null;

  const { project, ...data } = sprint;
  return data;
}
