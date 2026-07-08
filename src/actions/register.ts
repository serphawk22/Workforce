"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/schemas";

export async function register(_prevState: unknown, formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: { email: ["Email already in use"] } };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  // Accept any pending invites for this email
  const pendingInvites = await prisma.pendingInvite.findMany({
    where: { email },
  });

  if (pendingInvites.length > 0) {
    await prisma.workspaceMember.createMany({
      data: pendingInvites.map((invite) => ({
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: "MEMBER",
      })),
    });
    await prisma.pendingInvite.deleteMany({ where: { email } });
  }

  return { success: true };
}
