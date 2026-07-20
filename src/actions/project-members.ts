"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function addProjectMember(projectId: string, email: string) {
  const session = await requireAuth();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: { select: { id: true } } },
  });
  if (!project) return { error: "Project not found" };

  const caller = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: project.workspace.id } },
  });
  if (!caller || (caller.role !== "OWNER" && caller.role !== "ADMIN")) {
    return { error: "Not authorized" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "No user found with this email" };

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: project.workspace.id } },
  });
  if (existing) return { error: "Already a member" };

  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: project.workspace.id, role: "MEMBER" },
  });

  revalidatePath(`/project/${projectId}/members`);
  return { success: true };
}

export async function removeProjectMember(projectId: string, userId: string) {
  const session = await requireAuth();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: { select: { id: true } } },
  });
  if (!project) return { error: "Project not found" };

  const caller = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: project.workspace.id } },
  });
  if (!caller || (caller.role !== "OWNER" && caller.role !== "ADMIN")) {
    return { error: "Not authorized" };
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: project.workspace.id } },
  });
  if (!target) return { error: "Member not found" };
  if (target.role === "OWNER") return { error: "Cannot remove the owner" };

  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId, workspaceId: project.workspace.id } },
  });

  revalidatePath(`/project/${projectId}/members`);
  return { success: true };
}
