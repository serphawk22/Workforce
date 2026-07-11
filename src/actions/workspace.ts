"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import {
  createWorkspaceSchema,
  inviteMemberSchema,
  removeMemberSchema,
} from "@/lib/schemas";
import { sendInviteEmail } from "@/lib/email";

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
    const activeInvite = await prisma.pendingInvite.findFirst({
      where: {
        email,
        workspaceId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });
    if (activeInvite) return { error: { _form: ["Already invited"] } };

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    const invite = await prisma.pendingInvite.create({
      data: {
        email,
        workspaceId,
        invitedById: session.user.id,
        token: crypto.randomUUID() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const inviterName = session.user.name || session.user.email || "Workspace Owner";

    const emailResult = await sendInviteEmail({
      email,
      workspaceName: workspace?.name ?? "a workspace",
      invitedByName: inviterName,
      token: invite.token,
      expiresAt: invite.expiresAt,
    });

    if (!emailResult.success) {
      console.error("[inviteMember] Email failed for", email, emailResult.error);
      return {
        success: true,
        warning: "Invitation created but email could not be sent. The recipient will need to be invited again or you can resend later.",
      };
    }
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function resendInvitation(formData: FormData) {
  const session = await requireAuth();
  const inviteId = formData.get("inviteId") as string;
  if (!inviteId) return { error: "Invite ID required" };

  const invite = await prisma.pendingInvite.findUnique({
    where: { id: inviteId },
    include: { workspace: { select: { name: true } } },
  });

  if (!invite) return { error: "Invitation not found" };

  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId: invite.workspaceId },
    },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    return { error: "Not authorized" };
  }

  const inviterName = session.user.name || session.user.email || "Workspace Owner";

  const emailResult = await sendInviteEmail({
    email: invite.email,
    workspaceName: invite.workspace.name,
    invitedByName: inviterName,
    token: invite.token,
    expiresAt: invite.expiresAt,
  });

  if (!emailResult.success) {
    return { error: emailResult.error ?? "Failed to send email" };
  }

  revalidatePath(`/workspace/${invite.workspaceId}`);
  return { success: true };
}

export async function cancelInvitation(formData: FormData) {
  const session = await requireAuth();
  const inviteId = formData.get("inviteId") as string;
  if (!inviteId) return { error: "Invite ID required" };

  const invite = await prisma.pendingInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) return { error: "Invitation not found" };

  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId: invite.workspaceId },
    },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    return { error: "Not authorized" };
  }

  await prisma.pendingInvite.update({
    where: { id: inviteId },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/workspace/${invite.workspaceId}`);
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
