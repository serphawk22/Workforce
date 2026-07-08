"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import {
  createSprintSchema,
  updateSprintSchema,
  assignTaskToSprintSchema,
  removeTaskFromSprintSchema,
} from "@/lib/schemas";

export async function createSprint(formData: FormData) {
  const session = await requireAuth();
  const parsed = createSprintSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    goal: formData.get("goal"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { projectId, name, goal, startDate, endDate } = parsed.data;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: { include: { members: { where: { userId: session.user.id } } } } },
  });
  if (!project || !project.workspace.members[0]) {
    return { error: { _form: ["Not found or not authorized"] } };
  }

  const sprint = await prisma.sprint.create({
    data: {
      projectId,
      name,
      goal: goal || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  revalidatePath(`/project/${projectId}`, "layout");
  return { id: sprint.id };
}

export async function updateSprint(formData: FormData) {
  const session = await requireAuth();
  const parsed = updateSprintSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    goal: formData.get("goal"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { id, name, goal, startDate, endDate } = parsed.data;

  const sprint = await prisma.sprint.findUnique({
    where: { id },
    include: { project: { include: { workspace: { include: { members: { where: { userId: session.user.id } } } } } } },
  });
  if (!sprint || !sprint.project.workspace.members[0]) {
    return { error: { _form: ["Not found or not authorized"] } };
  }

  await prisma.sprint.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(goal !== undefined && { goal: goal || null }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate !== null ? new Date(endDate) : null }),
    },
  });

  revalidatePath(`/project/${sprint.projectId}`, "layout");
  return { success: true };
}

export async function startSprint(formData: FormData) {
  const session = await requireAuth();
  const sprintId = formData.get("sprintId") as string;
  if (!sprintId) return { error: { _form: ["Sprint ID required"] } };

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { project: { include: { workspace: { include: { members: { where: { userId: session.user.id } } } } } } },
  });
  if (!sprint || !sprint.project.workspace.members[0]) {
    return { error: { _form: ["Not found or not authorized"] } };
  }
  if (sprint.status !== "PLANNED") {
    return { error: { _form: ["Only planned sprints can be started"] } };
  }

  // Set all other active sprints back to PLANNED
  await prisma.sprint.updateMany({
    where: { projectId: sprint.projectId, status: "ACTIVE" },
    data: { status: "PLANNED" },
  });

  await prisma.sprint.update({
    where: { id: sprintId },
    data: { status: "ACTIVE", startDate: sprint.startDate || new Date() },
  });

  revalidatePath(`/project/${sprint.projectId}`, "layout");
  return { success: true };
}

export async function completeSprint(formData: FormData) {
  const session = await requireAuth();
  const sprintId = formData.get("sprintId") as string;
  if (!sprintId) return { error: { _form: ["Sprint ID required"] } };

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { project: { include: { workspace: { include: { members: { where: { userId: session.user.id } } } } } } },
  });
  if (!sprint || !sprint.project.workspace.members[0]) {
    return { error: { _form: ["Not found or not authorized"] } };
  }
  if (sprint.status !== "ACTIVE") {
    return { error: { _form: ["Only active sprints can be completed"] } };
  }

  // Find "Done" columns for this project
  const allColumns = await prisma.column.findMany({
    where: { board: { projectId: sprint.projectId } },
    orderBy: { order: "desc" },
    select: { id: true, name: true },
  });
  const lastColumn = allColumns[0];
  const doneColumnIds = lastColumn
    ? [lastColumn.id]
    : [];

  // Move non-Done tasks back to backlog
  if (doneColumnIds.length > 0) {
    await prisma.task.updateMany({
      where: {
        sprintId,
        columnId: { notIn: doneColumnIds },
      },
      data: { sprintId: null },
    });
  } else {
    // If no "Done" column exists, move all tasks back to backlog
    await prisma.task.updateMany({
      where: { sprintId },
      data: { sprintId: null },
    });
  }

  await prisma.sprint.update({
    where: { id: sprintId },
    data: { status: "COMPLETED", endDate: sprint.endDate || new Date() },
  });

  revalidatePath(`/project/${sprint.projectId}`, "layout");
  return { success: true };
}

export async function deleteSprint(formData: FormData) {
  const session = await requireAuth();
  const sprintId = formData.get("sprintId") as string;
  if (!sprintId) return { error: { _form: ["Sprint ID required"] } };

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { project: { include: { workspace: { include: { members: { where: { userId: session.user.id } } } } } } },
  });
  if (!sprint || !sprint.project.workspace.members[0]) {
    return { error: { _form: ["Not found or not authorized"] } };
  }

  // Unassign tasks from this sprint before deleting
  await prisma.task.updateMany({
    where: { sprintId },
    data: { sprintId: null },
  });

  await prisma.sprint.delete({ where: { id: sprintId } });

  revalidatePath(`/project/${sprint.projectId}`, "layout");
  return { success: true };
}

export async function removeTaskFromSprint(formData: FormData) {
  const session = await requireAuth();
  const parsed = removeTaskFromSprintSchema.safeParse({
    taskId: formData.get("taskId"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { taskId } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!task) return { error: { _form: ["Task not found"] } };

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: task.column.board.project.workspaceId } },
  });
  if (!member) return { error: { _form: ["Not authorized"] } };

  await prisma.task.update({
    where: { id: taskId },
    data: { sprintId: null },
  });

  revalidatePath(`/project/${task.column.board.projectId}`, "layout");
  return { success: true };
}

export async function assignTaskToSprint(formData: FormData) {
  const session = await requireAuth();
  const parsed = assignTaskToSprintSchema.safeParse({
    taskId: formData.get("taskId"),
    sprintId: formData.get("sprintId"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { taskId, sprintId } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: true } } } } },
  });
  if (!task) return { error: { _form: ["Task not found"] } };

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: task.column.board.project.workspaceId } },
  });
  if (!member) return { error: { _form: ["Not authorized"] } };

  await prisma.task.update({
    where: { id: taskId },
    data: { sprintId },
  });

  revalidatePath(`/project/${task.column.board.projectId}`, "layout");
  return { success: true };
}
