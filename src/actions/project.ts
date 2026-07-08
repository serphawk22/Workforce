"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/schemas";

export async function createProject(formData: FormData) {
  const session = await requireAuth();
  const parsed = createProjectSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { workspaceId, name, description } = parsed.data;

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!member) return { error: { _form: ["Not a workspace member"] } };

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      workspaceId,
      boards: {
        create: {
          name: "Main Board",
          columns: {
            create: [
              { name: "To Do", order: 0 },
              { name: "In Progress", order: 1 },
              { name: "Review", order: 2 },
              { name: "Done", order: 3 },
            ],
          },
        },
      },
    },
  });

  revalidatePath(`/workspace/${workspaceId}`);
  return { id: project.id };
}

export async function updateProject(formData: FormData) {
  const session = await requireAuth();
  const parsed = updateProjectSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { id, name, description } = parsed.data;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { workspace: { include: { members: { where: { userId: session.user.id } } } } },
  });
  if (!project || !project.workspace.members[0]) {
    return { error: { _form: ["Not found or not authorized"] } };
  }

  await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
    },
  });

  revalidatePath(`/workspace/${project.workspaceId}`);
  revalidatePath(`/project/${id}`);
  return { success: true };
}

export async function deleteProject(formData: FormData) {
  const session = await requireAuth();
  const projectId = formData.get("projectId") as string;
  if (!projectId) return { error: { _form: ["Project ID required"] } };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: { include: { members: { where: { userId: session.user.id } } } } },
  });
  if (!project || !project.workspace.members[0]) {
    return { error: { _form: ["Not found or not authorized"] } };
  }

  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath(`/workspace/${project.workspaceId}`);
  return { success: true };
}
