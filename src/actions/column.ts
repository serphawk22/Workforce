"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { addColumnSchema, reorderColumnsSchema } from "@/lib/schemas";

export async function addColumn(formData: FormData) {
  const session = await requireAuth();
  const parsed = addColumnSchema.safeParse({
    boardId: formData.get("boardId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { boardId, name } = parsed.data;
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
    include: { board: { include: { project: true } }, tasks: true },
  });
  if (!column) return { error: { _form: ["Column not found"] } };
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
    include: { project: true },
  });
  if (!board) return { error: { _form: ["Board not found"] } };

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
