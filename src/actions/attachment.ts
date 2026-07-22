"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function uploadAttachment(taskId: string, formData: FormData) {
  const session = await requireAuth();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } } },
  });
  if (!task) return { error: "Task not found" };
  if (task.column.board.project.workspace.members.length === 0) return { error: "Not authorized" };

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      url: dataUri,
      uploadedById: session.user.id,
    },
  });

  revalidatePath(`/project/${task.column.board.projectId}/attachments`);
  return { attachment: { id: attachment.id, fileName: attachment.fileName, fileSize: attachment.fileSize, fileType: attachment.fileType, url: attachment.url, createdAt: attachment.createdAt.toISOString() } };
}

export async function getAttachments(taskId: string) {
  await requireAuth();
  const attachments = await prisma.attachment.findMany({
    where: { taskId },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return attachments.map((a) => ({
    id: a.id,
    fileName: a.fileName,
    fileSize: a.fileSize,
    fileType: a.fileType,
    url: a.url,
    uploadedByName: a.uploadedBy.name,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function deleteAttachment(attachmentId: string) {
  const session = await requireAuth();

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { include: { column: { include: { board: { include: { project: { select: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } } } } } },
  });
  if (!attachment) return { error: "Attachment not found" };
  if (attachment.task.column.board.project.workspace.members.length === 0) return { error: "Not authorized" };

  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/project/${attachment.task.column.board.projectId}/attachments`);
  return { success: true };
}
