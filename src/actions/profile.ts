"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { updateProfileSettingsSchema } from "@/lib/schemas";

export async function updateProfile(formData: FormData) {
  const session = await requireAuth();
  const parsed = updateProfileSettingsSchema.safeParse({
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    avatarUrl: formData.get("avatarUrl"),
    themePreference: formData.get("themePreference"),
    notificationPreferences: formData.get("notificationPreferences"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { displayName, password, avatarUrl, themePreference, notificationPreferences } = parsed.data;

  const updateData: Record<string, unknown> = {};

  if (displayName !== undefined) {
    updateData.displayName = displayName || null;
  }
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 12);
  }
  if (avatarUrl !== undefined) {
    updateData.avatarUrl = avatarUrl || null;
  }
  if (themePreference) {
    updateData.themePreference = themePreference;
  }
  if (notificationPreferences) {
    try {
      updateData.notificationPreferences = JSON.parse(notificationPreferences);
    } catch {
      return { error: { notificationPreferences: ["Invalid JSON"] } };
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { success: true };
}
