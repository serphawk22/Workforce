import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { Badge } from "@/components/ui/badge";
import { getMonthKey } from "@/lib/dates";

export default async function AnalyticsPage() {
  await requireAdmin();

  const tasks = await prisma.task.findMany({
    include: {
      assignee: { select: { id: true, name: true } },
      column: { select: { name: true } },
    },
  });

  const now = new Date();

  const childTasks = await prisma.task.findMany({
    where: { parentTaskId: { not: null } },
    include: { parentTask: { include: { column: { include: { board: { include: { project: true } } } } } }, column: { select: { name: true } }, assignee: { select: { id: true, name: true } } },
  });

  const subtaskStatusCounts: Record<string, number> = {};
  const subtaskPerProject: Record<string, { total: number; completed: number }> = {};
  for (const ct of childTasks) {
    subtaskStatusCounts[ct.column.name] = (subtaskStatusCounts[ct.column.name] || 0) + 1;
    const projectName = ct.parentTask?.column.board.project.name || "Unknown";
    if (!subtaskPerProject[projectName]) subtaskPerProject[projectName] = { total: 0, completed: 0 };
    subtaskPerProject[projectName].total++;
    if (["Done", "Released", "Closed"].includes(ct.column.name)) {
      subtaskPerProject[projectName].completed++;
    }
  }

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  const employeeCounts: Record<string, { name: string; count: number; completed: number }> = {};
  const monthlyCounts: Record<string, { created: number; completed: number }> = {};

  for (const t of tasks) {
    statusCounts[t.column.name] = (statusCounts[t.column.name] || 0) + 1;
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;

    if (t.assignee) {
      if (!employeeCounts[t.assignee.id]) {
        employeeCounts[t.assignee.id] = { name: t.assignee.name, count: 0, completed: 0 };
      }
      employeeCounts[t.assignee.id].count++;
      if (["Done", "Released", "Closed"].includes(t.column.name)) {
        employeeCounts[t.assignee.id].completed++;
      }
    }

    const monthKey = getMonthKey(t.createdAt);
    if (!monthlyCounts[monthKey]) monthlyCounts[monthKey] = { created: 0, completed: 0 };
    monthlyCounts[monthKey].created++;
  }

  for (const t of tasks) {
    if (["Done", "Released", "Closed"].includes(t.column.name)) {
      const monthKey = getMonthKey(t.updatedAt);
      if (!monthlyCounts[monthKey]) monthlyCounts[monthKey] = { created: 0, completed: 0 };
      monthlyCounts[monthKey].completed++;
    }
  }

  const sortedMonths = Object.entries(monthlyCounts).sort(([a], [b]) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

  const statusColors: Record<string, string> = {
    "To Do": "bg-gray-400",
    "In Progress": "bg-blue-500",
    Review: "bg-amber-500",
    Done: "bg-emerald-500",
    Released: "bg-purple-500",
    Closed: "bg-gray-600",
  };

  const priorityColors: Record<string, string> = {
    LOW: "bg-gray-400",
    MEDIUM: "bg-blue-500",
    HIGH: "bg-orange-500",
    CRITICAL: "bg-red-500",
  };

  const maxStatusCount = Math.max(...Object.values(statusCounts), 1);
  const maxPriorityCount = Math.max(...Object.values(priorityCounts), 1);
  const maxMonthlyCount = Math.max(...sortedMonths.map(([, v]) => v.created + v.completed), 1);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => ["Done", "Released", "Closed"].includes(t.column.name)).length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && !["Done", "Released", "Closed"].includes(t.column.name)).length;

  const sortedEmployees = Object.values(employeeCounts).sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of task trends and distributions
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalTasks}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completedTasks}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Completion Rate</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{completionPct}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{overdueTasks}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Tasks by Status</h2>
          <div className="space-y-3">
            {Object.entries(statusCounts).sort(([, a], [, b]) => b - a).map(([status, count]) => {
              const pct = Math.round((count / maxStatusCount) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{status}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${statusColors[status] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(statusCounts).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Tasks by Priority</h2>
          <div className="space-y-3">
            {Object.entries(priorityCounts).sort(([, a], [, b]) => b - a).map(([priority, count]) => {
              const pct = Math.round((count / maxPriorityCount) * 100);
              return (
                <div key={priority}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{priority}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${priorityColors[priority] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(priorityCounts).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
          </div>
        </div>
      </div>

      {/* Subtask Statistics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Subtasks by Status</h2>
          {Object.keys(subtaskStatusCounts).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No subtasks</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(subtaskStatusCounts).sort(([, a], [, b]) => b - a).map(([status, count]) => {
                const pct = Math.round((count / Math.max(...Object.values(subtaskStatusCounts), 1)) * 100);
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{status}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${statusColors[status] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Subtasks per Project</h2>
          {Object.keys(subtaskPerProject).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No subtask data</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(subtaskPerProject).sort(([, a], [, b]) => b.total - a.total).slice(0, 10).map(([project, stats]) => {
                const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                return (
                  <div key={project}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate">{project}</span>
                      <span className="text-gray-500">{stats.completed}/{stats.total}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Task Activity</h2>
        {sortedMonths.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No data</p>
        ) : (
          <div className="space-y-3">
            {sortedMonths.map(([month, counts]) => {
              const total = counts.created + counts.completed;
              const pct = Math.round((total / maxMonthlyCount) * 100);
              return (
                <div key={month}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{month}</span>
                    <span className="text-xs text-gray-500">
                      {counts.created} created &middot; {counts.completed} completed
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 flex">
                    {counts.created > 0 && (
                      <div className="h-full rounded-l-full bg-blue-500" style={{ width: `${Math.round((counts.created / total) * 100)}%` }} />
                    )}
                    {counts.completed > 0 && (
                      <div className={`h-full ${counts.created > 0 ? "" : "rounded-l-full"} rounded-r-full bg-emerald-500`} style={{ width: `${Math.round((counts.completed / total) * 100)}%` }} />
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500" /> Created</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Completed</span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Employees by Task Count</h2>
        {sortedEmployees.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No data</p>
        ) : (
          <div className="space-y-3">
            {sortedEmployees.map((emp) => {
              const pct = emp.count > 0 ? Math.round((emp.completed / emp.count) * 100) : 0;
              return (
                <div key={emp.name} className="flex items-center gap-4">
                  <span className="w-40 truncate text-sm text-gray-700">{emp.name}</span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-20 text-right">
                    {emp.completed}/{emp.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
