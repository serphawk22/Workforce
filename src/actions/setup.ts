"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { z } from "zod";

const setupAccountSchema = z.object({
  password: z.string().min(6).max(100),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export async function setupAccount(prevState: unknown, formData: FormData) {
  const session = await requireAuth();

  const parsed = setupAccountSchema.safeParse({
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    avatarUrl: formData.get("avatarUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { password, displayName, avatarUrl } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash,
      ...(displayName !== undefined && displayName.trim() ? { displayName } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      firstLoginRequired: false,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
