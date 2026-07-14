import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { StatCard } from "@/components/dashboard/stat-card";
import { TaskItem } from "@/components/dashboard/task-item";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelativeTime, isToday, getWeekStart } from "@/lib/dates";
import { UpdateWorkButton } from "@/components/work-update/update-work-button";

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

export default async function DashboardPage() {
  const session = await requireSetup();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const now = new Date();
  const weekStart = getWeekStart(now);

  const allMyTasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: { include: { board: { include: { project: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const overdueTasks = allMyTasks.filter(
    (t) => t.dueDate && t.dueDate < now && t.column.name !== "Done"
  );

  const tasksDueToday = allMyTasks.filter(
    (t) => t.dueDate && isToday(t.dueDate) && t.column.name !== "Done"
  );

  const tasksStartedToday = allMyTasks.filter(
    (t) => t.dateOfDevAcceptOrStart && isToday(t.dateOfDevAcceptOrStart)
  );

  const completedThisWeek = allMyTasks.filter(
    (t) =>
      ["Done", "Released", "Closed"].includes(t.column.name) &&
      t.updatedAt >= weekStart
  );

  const recentlyReleased = allMyTasks.filter(
    (t) =>
      t.dateOfReleaseToProd &&
      t.dateOfReleaseToProd >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  );

  const upcomingReleases = allMyTasks
    .filter(
      (t) =>
        t.dateOfReleaseToProd &&
        t.dateOfReleaseToProd >= now &&
        !["Done", "Released", "Closed"].includes(t.column.name)
    )
    .sort((a, b) => a.dateOfReleaseToProd!.getTime() - b.dateOfReleaseToProd!.getTime())
    .slice(0, 5);

  const completedTasks = allMyTasks.filter((t) =>
    ["Done", "Released", "Closed"].includes(t.column.name)
  );

  const inProgressTasks = allMyTasks.filter((t) =>
    ["In Progress", "Review"].includes(t.column.name)
  );

  const totalAssigned = allMyTasks.length;
  const completionPct = totalAssigned > 0
    ? Math.round((completedTasks.length / totalAssigned) * 100)
    : 0;

  const projectNames = [
    ...new Set(allMyTasks.map((t) => t.column.board.project.name)),
  ];

  const recentTasks = await prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: session.user.id },
        { reporterId: session.user.id },
      ],
    },
    include: {
      column: { include: { board: { include: { project: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const upcomingTasks = allMyTasks
    .filter((t) => t.dueDate && t.dueDate >= now && t.column.name !== "Done")
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 5);

  const employeeProjectData = Array.from(new Map(allMyTasks.map((t) => {
    const p = t.column.board.project;
    return [p.id, { id: p.id, name: p.name, key: p.key, tasks: [] as { id: string; title: string; issueKey: string | null }[] }] as const;
  })).values());
  for (const t of allMyTasks) {
    const p = employeeProjectData.find((p) => p.id === t.column.board.project.id);
    if (p) p.tasks.push({ id: t.id, title: t.title, issueKey: t.issueKey });
  }

  return (
    <div className="bg-white min-h-screen">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, {user.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UpdateWorkButton projects={employeeProjectData} />
            <a
              href="/my-tasks"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              View all tasks
              <ArrowUpRight />
            </a>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<ListIcon />} title="Assigned to me" value={totalAssigned} description={completionPct > 0 ? `${completionPct}% completed` : "Tasks assigned to you"} accentClass="text-blue-600" bgAccentClass="bg-blue-50" />
          <StatCard icon={<ClockIcon />} title="Due Today" value={tasksDueToday.length} description="Tasks due today" accentClass="text-amber-600" bgAccentClass="bg-amber-50" />
          <StatCard icon={<CheckIcon />} title="Completed" value={completedTasks.length} description={completionPct > 0 ? `${completionPct}% of assigned` : "Tasks completed"} accentClass="text-emerald-600" bgAccentClass="bg-emerald-50" />
          <StatCard icon={<RocketIcon />} title="Started Today" value={tasksStartedToday.length} description="Dev started today" accentClass="text-blue-600" bgAccentClass="bg-blue-50" />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {tasksDueToday.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-amber-700">Due Today</h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-xs font-medium text-amber-700">{tasksDueToday.length}</span>
              </div>
              <div className="space-y-1">
                {tasksDueToday.map((t) => <TaskItem key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {overdueTasks.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-red-700">Overdue Tasks</h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100 text-xs font-medium text-red-700">{overdueTasks.length}</span>
              </div>
              <div className="space-y-1">
                {overdueTasks.slice(0, 5).map((t) => <TaskItem key={t.id} task={t} />)}
              </div>
            </div>
          )}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {completedThisWeek.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-emerald-700">Completed This Week</h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-xs font-medium text-emerald-700">{completedThisWeek.length}</span>
              </div>
              <div className="space-y-1">
                {completedThisWeek.slice(0, 5).map((t) => <TaskItem key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {recentlyReleased.length > 0 && (
            <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-purple-700">Recently Released</h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-xs font-medium text-purple-700">{recentlyReleased.length}</span>
              </div>
              <div className="space-y-1">
                {recentlyReleased.slice(0, 5).map((t) => <TaskItem key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {upcomingReleases.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-blue-700">Upcoming Releases</h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-xs font-medium text-blue-700">{upcomingReleases.length}</span>
              </div>
              <div className="space-y-1">
                {upcomingReleases.map((t) => <TaskItem key={t.id} task={t} />)}
              </div>
            </div>
          )}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Statistics</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Assigned</span>
                <span className="font-medium text-gray-900">{totalAssigned}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Completed</span>
                <span className="font-medium text-emerald-600">{completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">In Progress</span>
                <span className="font-medium text-blue-600">{inProgressTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Pending</span>
                <span className="font-medium text-gray-900">{totalAssigned - completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Overdue</span>
                <span className="font-medium text-red-600">{overdueTasks.length}</span>
              </div>
              {completionPct > 0 && (
                <div className="pt-2">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Completion</span>
                    <span className="font-medium text-gray-900">{completionPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completionPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Your Projects</h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-600">{projectNames.length}</span>
            </div>
            {projectNames.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No projects yet</p>
            ) : (
              <div className="space-y-1">
                {projectNames.map((name) => (
                  <div key={name} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recently Updated</h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-600">{recentTasks.length}</span>
            </div>
            <div className="space-y-1">
              {recentTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No recent tasks</p>
              ) : (
                recentTasks.map((t) => <TaskItem key={t.id} task={t} />)
              )}
            </div>
          </div>
        </div>

        {upcomingTasks.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Upcoming Timeline</h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-xs font-medium text-blue-700">{upcomingTasks.length}</span>
            </div>
            <div className="space-y-1">
              {upcomingTasks.map((t) => (
                <div key={t.id} className="relative pl-8">
                  <div className="absolute left-3 top-3 h-2 w-2 rounded-full border-2 border-blue-400 bg-white" />
                  <div className="absolute left-[11px] top-6 h-full w-px bg-gray-200" />
                  <TaskItem task={t} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
