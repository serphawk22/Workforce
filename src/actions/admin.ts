"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { revalidatePath } from "next/cache";

export async function setUserRole(userId: string, role: string) {
  await requireAdmin();

  const validRoles = ["EMPLOYEE", "ADMIN"];
  if (!validRoles.includes(role)) {
    return { error: "Invalid role" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: "User not found" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/team");
  return { success: true };
}

export async function getAdminUserCounts() {
  await requireAdmin();

  const [totalEmployees, totalTasks] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.task.count(),
  ]);

  return { totalEmployees, totalTasks };
}