"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
});

export async function createEmployee(prevState: unknown, formData: FormData) {
  await requireAdmin();

  const parsed = createEmployeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role") || "EMPLOYEE",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, email, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: { email: ["Email already in use"] } };
  }

  const tempPassword = crypto.randomUUID()?.replace(/-/g, "").slice(0, 12) ?? Math.random().toString(36).slice(2, 14);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      firstLoginRequired: true,
    },
  });

  const adminWorkspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId: (await requireAdmin()).user.id } } },
    select: { id: true },
  });

  if (adminWorkspace) {
    const newUser = await prisma.user.findUnique({ where: { email } });
    if (newUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: newUser.id, workspaceId: adminWorkspace.id } },
      });
      if (!existingMember) {
        await prisma.workspaceMember.create({
          data: { userId: newUser.id, workspaceId: adminWorkspace.id, role: "MEMBER" },
        });
      }
    }
  }

  revalidatePath("/admin/team");
  return { success: true, tempPassword };
}

export async function disableEmployee(userId: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  if (user.role === "ADMIN") return { error: "Cannot disable admin accounts" };

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${userId}`);
  return { success: true };
}

export async function addEmployeeToWorkspace(userId: string) {
  const session = await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId: session.user.id } } },
    select: { id: true, name: true },
  });
  if (!workspace) return { error: "No workspace found" };

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: workspace.id } },
  });
  if (existing) return { error: `Already a member of ${workspace.name}` };

  await prisma.workspaceMember.create({
    data: { userId, workspaceId: workspace.id, role: "MEMBER" },
  });

  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${userId}`);
  return { success: true, workspaceName: workspace.name };
}

export async function enableEmployee(userId: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });

  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${userId}`);
  return { success: true };
}

export async function resetEmployeePassword(userId: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  const tempPassword = crypto.randomUUID()?.replace(/-/g, "").slice(0, 12) ?? Math.random().toString(36).slice(2, 14);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      firstLoginRequired: true,
    },
  });

  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${userId}`);
  return { success: true, tempPassword };
}
