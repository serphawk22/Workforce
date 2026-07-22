import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { WorkspaceDashboardClient } from "./workspace-dashboard-client";

export default async function WorkspaceDashboardPage() {
  const session = await requireSetup();

  const [
    projects,
    allTasks,
    sprints,
    employees,
    allColumns,
    allActivityLogs,
    allWorkUpdates,
  ] = await Promise.all([
    prisma.project.findMany({
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        column: { select: { id: true, name: true, board: { select: { projectId: true, project: { select: { id: true, name: true, key: true } } } } } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        sprint: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.sprint.findMany({
      include: {
        tasks: { select: { id: true, column: { select: { name: true } } } },
        project: { select: { id: true, name: true, key: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
    prisma.column.findMany({
      select: { id: true, name: true, board: { select: { projectId: true } } },
    }),
    prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        task: { select: { id: true, title: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.workUpdate.findMany({
      select: { id: true, userId: true, timeSpent: true, createdAt: true, task: { select: { assigneeId: true } } },
    }),
  ]);

  return (
    <WorkspaceDashboardClient
      projects={projects}
      tasks={allTasks}
      sprints={sprints}
      employees={employees}
      columns={allColumns}
      activityLogs={allActivityLogs}
      workUpdates={allWorkUpdates}
    />
  );
}
