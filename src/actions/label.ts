"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createLabelSchema } from "@/lib/schemas";

export async function createLabel(formData: FormData) {
  const session = await requireAuth();
  const parsed = createLabelSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { projectId, name, color } = parsed.data;

  const existing = await prisma.label.findUnique({
    where: { name_projectId: { name, projectId } },
  });
  if (existing) return { error: { _form: ["Label already exists"] } };

  const label = await prisma.label.create({
    data: { name, color, projectId },
  });

  revalidatePath(`/project/${projectId}`);
  return { id: label.id, name: label.name, color: label.color };
}

export async function addTaskLabel(formData: FormData) {
  const session = await requireAuth();
  const taskId = formData.get("taskId") as string;
  const labelId = formData.get("labelId") as string;
  if (!taskId || !labelId) return { error: { _form: ["Required fields missing"] } };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!task) return { error: { _form: ["Task not found"] } };

  await prisma.taskLabel.create({
    data: { taskId, labelId },
  }).catch(() => {});

  revalidatePath(`/project/${task.column.board.projectId}`);
  return { success: true };
}

export async function removeTaskLabel(formData: FormData) {
  const session = await requireAuth();
  const taskId = formData.get("taskId") as string;
  const labelId = formData.get("labelId") as string;
  if (!taskId || !labelId) return { error: { _form: ["Required fields missing"] } };

  await prisma.taskLabel.deleteMany({
    where: { taskId, labelId },
  });

  revalidatePath(`/project/${taskId}`);
  return { success: true };
}
