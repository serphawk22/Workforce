import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { WorkspaceDashboardClient } from "@/components/workspace-dashboard/dashboard-client";

const DONE_COLUMNS = ["Done", "Released", "Closed"];

export default async function WorkspaceDashboardPage() {
  const session = await requireAuth();

  const now = new Date();

  const [projects, tasks, users, sprints, dailyWorkEntries] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        workspaceId: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      include: {
        column: { select: { id: true, name: true, order: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true } },
        sprint: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
        _count: { select: { comments: true, subtasks: true, workUpdates: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, avatarUrl: true, department: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.sprint.findMany({
      include: {
        _count: { select: { tasks: true } },
        project: { select: { id: true, name: true, key: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dailyWorkEntry.findMany({
      include: {
        employee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        project: { select: { id: true, name: true, key: true } },
        task: { select: { id: true, title: true, code: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 500,
    }),
  ]);

  const columns = await prisma.column.findMany({
    select: { id: true, name: true, boardId: true, board: { select: { projectId: true } } },
  });

  const columnProjectMap = new Map(columns.map((c) => [c.id, c.board.projectId]));
  const projectColumnMap = new Map<string, string[]>();
  for (const c of columns) {
    const existing = projectColumnMap.get(c.board.projectId) || [];
    existing.push(c.id);
    projectColumnMap.set(c.board.projectId, existing);
  }

  const projectMembersMap = new Map<string, Set<string>>();
  for (const t of tasks) {
    const pid = columnProjectMap.get(t.columnId);
    if (!pid) continue;
    if (!projectMembersMap.has(pid)) projectMembersMap.set(pid, new Set());
    if (t.assigneeId) projectMembersMap.get(pid)!.add(t.assigneeId);
    if (t.reporterId) projectMembersMap.get(pid)!.add(t.reporterId);
  }

  const projectTaskMap = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const pid = columnProjectMap.get(t.columnId);
    if (!pid) continue;
    if (!projectTaskMap.has(pid)) projectTaskMap.set(pid, []);
    projectTaskMap.get(pid)!.push(t);
  }

  const dailyWorkProjectMap = new Map<string, typeof dailyWorkEntries>();
  for (const d of dailyWorkEntries) {
    if (!d.projectId) continue;
    if (!dailyWorkProjectMap.has(d.projectId)) dailyWorkProjectMap.set(d.projectId, []);
    dailyWorkProjectMap.get(d.projectId)!.push(d);
  }

  const serializedProjects = projects.map((p) => {
    const pTasks = projectTaskMap.get(p.id) || [];
    const total = pTasks.length;
    const done = pTasks.filter((t) => DONE_COLUMNS.includes(t.column.name)).length;
    const inProgress = pTasks.filter((t) => t.column.name === "In Progress").length;
    const pending = pTasks.filter((t) => t.column.name === "To Do").length;
    const overdue = pTasks.filter((t) => t.dueDate && t.dueDate < now && !DONE_COLUMNS.includes(t.column.name)).length;
    const memberCount = projectMembersMap.get(p.id)?.size || 0;
    const pSprints = sprints.filter((s) => s.projectId === p.id);
    const activeSprint = pSprints.find((s) => s.status === "ACTIVE");
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const dailyWorkEntriesForProject = dailyWorkProjectMap.get(p.id) || [];

    return {
      id: p.id,
      name: p.name,
      key: p.key,
      workspaceId: p.workspaceId,
      totalTasks: total,
      completed: done,
      inProgress,
      pending,
      overdue,
      progress: pct,
      memberCount,
      members: Array.from(projectMembersMap.get(p.id) || []),
      sprintCount: pSprints.length,
      activeSprint: activeSprint
        ? { id: activeSprint.id, name: activeSprint.name, status: activeSprint.status }
        : null,
      dailyWorkCount: dailyWorkEntriesForProject.length,
    };
  });

  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    code: t.code,
    priority: t.priority,
    status: t.column.name,
    columnId: t.columnId,
    projectId: columnProjectMap.get(t.columnId) || null,
    projectName: projects.find((p) => p.id === columnProjectMap.get(t.columnId))?.name || null,
    projectKey: projects.find((p) => p.id === columnProjectMap.get(t.columnId))?.key || null,
    assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name, email: t.assignee.email } : null,
    reporter: t.reporter ? { id: t.reporter.id, name: t.reporter.name } : null,
    sprint: t.sprint ? { id: t.sprint.id, name: t.sprint.name, status: t.sprint.status } : null,
    labels: t.labels.map((tl) => ({ id: tl.label.id, name: tl.label.name, color: tl.label.color })),
    dueDate: t.dueDate?.toISOString() || null,
    commentCount: t._count.comments,
    subtaskCount: t._count.subtasks,
    createdAt: t.createdAt.toISOString(),
  }));

  const serializedSprints = sprints.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    projectId: s.projectId,
    projectName: s.project.name,
    projectKey: s.project.key,
    startDate: s.startDate?.toISOString() || null,
    endDate: s.endDate?.toISOString() || null,
    goal: s.goal,
    taskCount: s._count.tasks,
  }));

  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    department: u.department,
    role: u.role,
  }));

  const serializedDailyWork = dailyWorkEntries.map((d) => ({
    id: d.id,
    employeeId: d.employeeId,
    employeeName: d.employee.name,
    projectId: d.projectId,
    projectName: d.project?.name || null,
    projectKey: d.project?.key || null,
    taskId: d.taskId,
    taskTitle: d.task?.title || null,
    taskCode: d.task?.code || null,
    todayWork: d.todayWork,
    todayWorkCompleted: d.todayWorkCompleted,
    tomorrowTask: d.tomorrowTask,
    status: d.status,
    submittedAt: d.submittedAt.toISOString(),
  }));

  return (
    <WorkspaceDashboardClient
      projects={serializedProjects}
      tasks={serializedTasks}
      sprints={serializedSprints}
      users={serializedUsers}
      dailyWorkEntries={serializedDailyWork}
      userId={session.user.id}
    />
  );
}
