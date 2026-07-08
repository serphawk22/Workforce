"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { addCommentSchema } from "@/lib/schemas";

export async function addComment(formData: FormData) {
  const session = await requireAuth();
  const parsed = addCommentSchema.safeParse({
    taskId: formData.get("taskId"),
    content: formData.get("content"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { taskId, content } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!task) return { error: { _form: ["Task not found"] } };

  await prisma.comment.create({
    data: { taskId, authorId: session.user.id, content },
  });

  revalidatePath(`/project/${task.column.board.projectId}`);
  return { success: true };
}

export async function deleteComment(formData: FormData) {
  const session = await requireAuth();
  const commentId = formData.get("commentId") as string;
  if (!commentId) return { error: { _form: ["Comment ID required"] } };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { task: { include: { column: { include: { board: { include: { project: true } } } } } } },
  });
  if (!comment) return { error: { _form: ["Comment not found"] } };
  if (comment.authorId !== session.user.id) return { error: { _form: ["Not authorized"] } };

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/project/${comment.task.column.board.projectId}`);
  return { success: true };
}
