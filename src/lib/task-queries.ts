import { prisma } from "./prisma";
import { requireAuth } from "./auth-helpers";
import { isAdmin } from "./authorization";
import type { Prisma } from "@prisma/client";

const taskInclude = {
  column: {
    include: {
      board: {
        include: { project: true },
      },
    },
  },
  labels: { include: { label: true } },
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
} satisfies Prisma.TaskInclude;

export type TaskWithDetails = Prisma.Result<typeof prisma.task, { include: typeof taskInclude }, "findFirst">;

export async function getMyTasks() {
  const session = await requireAuth();

  return prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: taskInclude,
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
  });
}

export async function getMyDashboardTasks() {
  const session = await requireAuth();

  return prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: {
        include: {
          board: {
            include: { project: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
}

export async function getMyRecentTasks() {
  const session = await requireAuth();

  return prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: session.user.id },
        { reporterId: session.user.id },
      ],
    },
    include: {
      column: {
        include: {
          board: {
            include: { project: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
}

export async function getAllTasks() {
  await requireAuth();
  const admin = await isAdmin();

  if (!admin) {
    return getMyTasks();
  }

  return prisma.task.findMany({
    include: taskInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export type AdminDashboardStats = {
  totalEmployees: number;
  totalTasks: number;
  employeesWithTasks: number;
  recentlyUpdated: Array<{
    id: string;
    title: string;
    updatedAt: Date;
    assignee: { id: string; name: string } | null;
    column: { name: string };
  }>;
  columnStats: Array<{ name: string; count: number }>;
  overdueCount: number;
  completedCount: number;
  pendingCount: number;
  users: Array<{ id: string; name: string }>;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats | null> {
  await requireAuth();
  const admin = await isAdmin();

  if (!admin) return null;

  const now = new Date();

  const [
    totalEmployees,
    totalTasks,
    taskByColumn,
    employeeTaskGroups,
    users,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.task.count(),
    prisma.task.groupBy({ by: ["columnId"], _count: true }),
    prisma.task.groupBy({ by: ["assigneeId"], _count: true }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: { id: true, name: true },
    }),
  ]);

  const columns = await prisma.column.findMany({
    where: { id: { in: taskByColumn.map((c) => c.columnId) } },
  });

  const columnNameMap = new Map(columns.map((c) => [c.id, c.name]));

  const columnStats = taskByColumn.map((c) => ({
    name: columnNameMap.get(c.columnId) ?? "Unknown",
    count: c._count,
  }));

  const overdueCount = await prisma.task.count({
    where: {
      dueDate: { lt: now },
    },
  });

  const completedCount = await prisma.task.count({
    where: {
      column: {
        name: { in: ["Done", "Released", "Closed"] },
      },
    },
  });

  const recentlyUpdated = await prisma.task.findMany({
    where: { updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    include: {
      assignee: { select: { id: true, name: true } },
      column: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return {
    totalEmployees,
    totalTasks,
    employeesWithTasks: employeeTaskGroups.length,
    recentlyUpdated,
    columnStats,
    overdueCount,
    completedCount,
    pendingCount: totalTasks - completedCount,
    users,
  };
}