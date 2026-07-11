import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { QuickSyncButton } from "@/components/dashboard/quick-sync-button";
import { formatDate, formatRelativeTime, getWeekStart } from "@/lib/dates";

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function isToday(date: Date): boolean {
  const n = new Date();
  return date.getFullYear() === n.getFullYear() && date.getMonth() === n.getMonth() && date.getDate() === n.getDate();
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const userId = session.user.id;
  const now = new Date();

  const myTasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    include: { column: { select: { name: true } } },
  });

  const myTotal = myTasks.length;
  const myCompleted = myTasks.filter((t) => ["Done", "Released", "Closed"].includes(t.column.name)).length;
  const myOverdue = myTasks.filter((t) => t.dueDate && t.dueDate < now && !["Done", "Released", "Closed"].includes(t.column.name)).length;
  const myDueToday = myTasks.filter((t) => t.dueDate && isToday(t.dueDate) && !["Done", "Released", "Closed"].includes(t.column.name)).length;
  const myPct = myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0;

  const weekStart = getWeekStart(now);

  const [totalEmployees, activeEmployees, totalTasks, totalProjects, columnStats, recentlyUpdated, unassignedCount, lastSync, qaPendingCount, completedThisWeekCount, recentlyReleased] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
    prisma.task.count(),
    prisma.project.count(),
    prisma.task.groupBy({ by: ["columnId"], _count: true }),
    prisma.task.findMany({
      where: { updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      include: {
        assignee: { select: { id: true, name: true } },
        column: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.task.count({ where: { assigneeId: null } }),
    prisma.syncLog.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.task.count({
      where: {
        column: { name: { in: ["Review"] } },
        dateOfQaOrUatComplete: null,
      },
    }),
    prisma.task.count({
      where: {
        column: { name: { in: ["Done", "Released", "Closed"] } },
        updatedAt: { gte: weekStart },
      },
    }),
    prisma.task.findMany({
      where: {
        dateOfReleaseToProd: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: {
        assignee: { select: { id: true, name: true } },
        column: { select: { name: true } },
      },
      orderBy: { dateOfReleaseToProd: "desc" },
      take: 10,
    }),
  ]);

  const columns = await prisma.column.findMany({
    where: { id: { in: columnStats.map((c) => c.columnId) } },
  });
  const columnNameMap = new Map(columns.map((c) => [c.id, c.name]));

  const doneColumnIds = columns
    .filter((c) => ["Done", "Released", "Closed"].includes(c.name))
    .map((c) => c.id);

  const completedCount = doneColumnIds.length > 0
    ? columnStats.filter((c) => doneColumnIds.includes(c.columnId)).reduce((sum, c) => sum + c._count, 0)
    : 0;

  const overdueCount = await prisma.task.count({
    where: { dueDate: { lt: now } },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Admin dashboard with your personal work and organization overview
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-blue-900">My Work</h2>
          <div className="flex gap-2">
            <Link href="/my-tasks" className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700">
              My Tasks
              <ArrowUpRight />
            </Link>
            <Link href="/my-projects" className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 transition-colors hover:bg-blue-100">
              My Projects
              <ArrowUpRight />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-3 shadow-sm border border-blue-100">
            <p className="text-xs text-gray-500">My Tasks</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{myTotal}</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm border border-blue-100">
            <p className="text-xs text-gray-500">Due Today</p>
            <p className={`text-xl font-bold mt-0.5 ${myDueToday > 0 ? "text-amber-600" : "text-gray-900"}`}>{myDueToday}</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm border border-blue-100">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{myCompleted}</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm border border-blue-100">
            <p className="text-xs text-gray-500">Overdue</p>
            <p className={`text-xl font-bold mt-0.5 ${myOverdue > 0 ? "text-red-600" : "text-gray-900"}`}>{myOverdue}</p>
          </div>
        </div>
        {myTotal > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-blue-700">Completion</span>
              <span className="font-medium text-blue-900">{myPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-blue-200">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${myPct}%` }} />
            </div>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Overview</h2>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<UsersIcon />}
          title="Total Employees"
          value={totalEmployees}
          description={`${activeEmployees} active`}
          accentClass="text-blue-600"
          bgAccentClass="bg-blue-50"
        />
        <StatCard
          icon={<FolderIcon />}
          title="Total Projects"
          value={totalProjects}
          description="Active projects"
          accentClass="text-indigo-600"
          bgAccentClass="bg-indigo-50"
        />
        <StatCard
          icon={<TasksIcon />}
          title="Total Tasks"
          value={totalTasks}
          description={`${unassignedCount} unassigned`}
          accentClass="text-purple-600"
          bgAccentClass="bg-purple-50"
        />
        <StatCard
          icon={<CheckIcon />}
          title="Completed"
          value={completedCount}
          description={`${totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0}% of all tasks`}
          accentClass="text-emerald-600"
          bgAccentClass="bg-emerald-50"
        />
        <StatCard
          icon={<TasksIcon />}
          title="Pending"
          value={totalTasks - completedCount}
          description="Not yet completed"
          accentClass="text-amber-600"
          bgAccentClass="bg-amber-50"
        />
        <StatCard
          icon={<AlertIcon />}
          title="Overdue"
          value={overdueCount}
          description="Past due date"
          accentClass="text-red-600"
          bgAccentClass="bg-red-50"
        />
      </div>

      {unassignedCount > 0 && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">
                {unassignedCount} Unassigned Task{unassignedCount !== 1 ? "s" : ""}
              </p>
              <p className="mt-0.5 text-xs text-orange-700">
                These tasks have no matching employee in the system. Original owner names are stored.
              </p>
            </div>
            <Link
              href="/admin/google-sync"
              className="rounded-lg bg-orange-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-900"
            >
              Sync Sheet
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Tasks by Column
          </h2>
          <div className="space-y-3">
            {columnStats.map((c) => {
              const colName = columnNameMap.get(c.columnId) ?? "Unknown";
              const pct = totalTasks > 0 ? Math.round((c._count / totalTasks) * 100) : 0;
              return (
                <div key={c.columnId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{colName}</span>
                    <span className="text-gray-500">
                      {c._count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {columnStats.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">No tasks yet</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Recently Updated Tasks
          </h2>
          <div className="space-y-3">
            {recentlyUpdated.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No recent updates</p>
            ) : (
              recentlyUpdated.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {t.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      {t.assignee && <span>{t.assignee.name}</span>}
                      <Badge variant="gray">{t.column.name}</Badge>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDateTime(t.updatedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-blue-700">Completed This Week</h2>
          <p className="text-3xl font-bold text-blue-600">{completedThisWeekCount}</p>
          <p className="mt-1 text-xs text-gray-500">Tasks moved to Done/Released/Closed</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-amber-700">QA Pending</h2>
          <p className="text-3xl font-bold text-amber-600">{qaPendingCount}</p>
          <p className="mt-1 text-xs text-gray-500">In Review without QA completion date</p>
        </div>
      </div>

      {recentlyReleased.length > 0 && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-purple-700">Recently Released (7 days)</h2>
          <div className="space-y-2">
            {recentlyReleased.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    {t.assignee && <span>{t.assignee.name}</span>}
                    <Badge variant="gray">{t.column.name}</Badge>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {t.dateOfReleaseToProd ? formatDate(t.dateOfReleaseToProd) : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/team"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Team Overview
            </Link>
            <Link
              href="/admin/google-sync"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Sync History
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              My Dashboard
            </Link>
            <Link
              href="/my-tasks"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              My Tasks
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Google Sheets Sync
          </h2>
          <div className="space-y-3">
            <QuickSyncButton />
            {lastSync && (
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Last sync</span>
                  <span className={`font-medium ${lastSync.error ? "text-red-600" : "text-green-600"}`}>
                    {lastSync.error ? "Failed" : "Success"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {lastSync.startedAt.toLocaleDateString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                  {lastSync.finishedAt && ` (${Math.round((lastSync.finishedAt.getTime() - lastSync.startedAt.getTime()) / 1000)}s)`}
                </p>
                {!lastSync.error && (
                  <p className="mt-1 text-xs text-gray-400">
                    {lastSync.rowsCreated} created &middot; {lastSync.rowsUpdated} updated &middot; {lastSync.rowsSkipped} skipped
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
