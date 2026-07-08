"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { updateProfileSchema } from "@/lib/schemas";

export async function updateProfile(formData: FormData) {
  const session = await requireAuth();
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    avatarUrl: formData.get("avatarUrl"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { name, avatarUrl } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
