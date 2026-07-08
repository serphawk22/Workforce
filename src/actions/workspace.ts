"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import {
  createWorkspaceSchema,
  inviteMemberSchema,
  removeMemberSchema,
} from "@/lib/schemas";

export async function createWorkspace(formData: FormData) {
  const session = await requireAuth();
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  revalidatePath("/dashboard");
  return { id: workspace.id };
}

export async function inviteMember(formData: FormData) {
  const session = await requireAuth();
  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    workspaceId: formData.get("workspaceId"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { email, workspaceId } = parsed.data;

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    return { error: { _form: ["Not authorized"] } };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: existingUser.id, workspaceId } },
    });
    if (alreadyMember) return { error: { _form: ["Already a member"] } };

    await prisma.workspaceMember.create({
      data: { userId: existingUser.id, workspaceId, role: "MEMBER" },
    });
  } else {
    const pending = await prisma.pendingInvite.findFirst({
      where: { email, workspaceId },
    });
    if (pending) return { error: { _form: ["Already invited"] } };

    await prisma.pendingInvite.create({
      data: { email, workspaceId, invitedById: session.user.id },
    });
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function removeMember(formData: FormData) {
  const session = await requireAuth();
  const parsed = removeMemberSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { workspaceId, userId } = parsed.data;

  const caller = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!caller || (caller.role !== "OWNER" && caller.role !== "ADMIN")) {
    return { error: { _form: ["Not authorized"] } };
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!target) return { error: { _form: ["Member not found"] } };
  if (target.role === "OWNER") return { error: { _form: ["Cannot remove owner"] } };

  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}
