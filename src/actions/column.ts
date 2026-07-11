"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { addColumnSchema, reorderColumnsSchema } from "@/lib/schemas";

async function checkColumnAccess(boardId: string, userId: string): Promise<boolean> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { project: { select: { workspace: { select: { members: { where: { userId }, select: { id: true } } } } } } },
  });
  return !!board && board.project.workspace.members.length > 0;
}

export async function addColumn(formData: FormData) {
  const session = await requireAuth();
  const parsed = addColumnSchema.safeParse({
    boardId: formData.get("boardId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { boardId, name } = parsed.data;
  if (!(await checkColumnAccess(boardId, session.user.id))) {
    return { error: { _form: ["Not authorized"] } };
  }

  const maxOrder = await prisma.column.aggregate({
    where: { boardId },
    _max: { order: true },
  });

  const column = await prisma.column.create({
    data: { boardId, name, order: (maxOrder._max.order ?? -1) + 1 },
    include: { board: { include: { project: true } } },
  });

  revalidatePath(`/project/${column.board.projectId}`);
  return { id: column.id };
}

export async function renameColumn(formData: FormData) {
  const session = await requireAuth();
  const columnId = formData.get("columnId") as string;
  const name = formData.get("name") as string;
  if (!columnId || !name) return { error: { _form: ["Required fields missing"] } };

  const existing = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: { select: { id: true, project: { select: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } } },
  });
  if (!existing || existing.board.project.workspace.members.length === 0) {
    return { error: { _form: ["Not authorized"] } };
  }

  const column = await prisma.column.update({
    where: { id: columnId },
    data: { name },
    include: { board: { include: { project: true } } },
  });

  revalidatePath(`/project/${column.board.projectId}`);
  return { success: true };
}

export async function deleteColumn(formData: FormData) {
  const session = await requireAuth();
  const columnId = formData.get("columnId") as string;
  if (!columnId) return { error: { _form: ["Column ID required"] } };

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: { include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } } }, tasks: true },
  });
  if (!column) return { error: { _form: ["Column not found"] } };
  if (column.board.project.workspace.members.length === 0) return { error: { _form: ["Not authorized"] } };
  if (column.tasks.length > 0) return { error: { _form: ["Column not empty"] } };

  await prisma.column.delete({ where: { id: columnId } });
  revalidatePath(`/project/${column.board.projectId}`);
  return { success: true };
}

export async function reorderColumns(formData: FormData) {
  const session = await requireAuth();
  const parsed = reorderColumnsSchema.safeParse({
    boardId: formData.get("boardId"),
    columnIds: JSON.parse(formData.get("columnIds") as string),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { boardId, columnIds } = parsed.data;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { project: { include: { workspace: { select: { members: { where: { userId: session.user.id }, select: { id: true } } } } } } },
  });
  if (!board) return { error: { _form: ["Board not found"] } };
  if (board.project.workspace.members.length === 0) return { error: { _form: ["Not authorized"] } };

  await prisma.$transaction(
    columnIds.map((id, index) =>
      prisma.column.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  revalidatePath(`/project/${board.projectId}`);
  return { success: true };
}
