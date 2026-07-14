"use client";

import { useState } from "react";

type ReportsData = {
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
  overdueTasks: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  projects: { id: string; name: string; count: number }[];
  employees: { name: string; count: number; completed: number }[];
  monthly: [string, { created: number; completed: number }][];
};

export function ReportsView({ data }: { data: ReportsData }) {
  const now = new Date();

  function handleExportCSV() {
    const rows = [["Metric", "Value"]];
    rows.push(["Total Tasks", String(data.totalTasks)]);
    rows.push(["Completed Tasks", String(data.completedTasks)]);
    rows.push(["Completion Rate", `${data.completionPct}%`]);
    rows.push(["Overdue Tasks", String(data.overdueTasks)]);
    rows.push([]);
    rows.push(["Status", "Count"]);
    for (const [s, c] of Object.entries(data.statusCounts)) rows.push([s, String(c)]);
    rows.push([]);
    rows.push(["Priority", "Count"]);
    for (const [p, c] of Object.entries(data.priorityCounts)) rows.push([p, String(c)]);
    rows.push([]);
    rows.push(["Project", "Task Count"]);
    for (const p of data.projects) rows.push([p.name, String(p.count)]);
    rows.push([]);
    rows.push(["Employee", "Total", "Completed"]);
    for (const e of data.employees) rows.push([e.name, String(e.count), String(e.completed)]);
    rows.push([]);
    rows.push(["Month", "Created", "Completed"]);
    for (const [m, c] of data.monthly) rows.push([m, String(c.created), String(c.completed)]);

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${now.toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  const maxStatusCount = Math.max(...Object.values(data.statusCounts), 1);
  const maxPriorityCount = Math.max(...Object.values(data.priorityCounts), 1);
  const maxProjectCount = Math.max(...data.projects.map((p) => p.count), 1);
  const maxMonthlyCount = Math.max(...data.monthly.map(([, c]) => c.created + c.completed), 1);

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

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={handleExportCSV} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Export CSV
        </button>
        <button onClick={handlePrint} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Print
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalTasks}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{data.completedTasks}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Completion Rate</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{data.completionPct}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{data.overdueTasks}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Tasks by Status</h2>
          <div className="space-y-3">
            {Object.entries(data.statusCounts).sort(([, a], [, b]) => b - a).map(([status, count]) => {
              const pct = Math.round((count / maxStatusCount) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{status}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full transition-all duration-500 ${statusColors[status] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(data.statusCounts).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Tasks by Priority</h2>
          <div className="space-y-3">
            {Object.entries(data.priorityCounts).sort(([, a], [, b]) => b - a).map(([priority, count]) => {
              const pct = Math.round((count / maxPriorityCount) * 100);
              return (
                <div key={priority}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{priority}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full transition-all duration-500 ${priorityColors[priority] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(data.priorityCounts).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Tasks by Project</h2>
        {data.projects.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No data</p>
        ) : (
          <div className="space-y-3">
            {data.projects.map((proj) => {
              const pct = Math.round((proj.count / maxProjectCount) * 100);
              return (
                <div key={proj.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{proj.name}</span>
                    <span className="text-gray-500">{proj.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Tasks by Employee</h2>
        {data.employees.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No data</p>
        ) : (
          <div className="space-y-3">
            {data.employees.map((emp) => {
              const pct = emp.count > 0 ? Math.round((emp.completed / emp.count) * 100) : 0;
              return (
                <div key={emp.name} className="flex items-center gap-4">
                  <span className="w-40 truncate text-sm text-gray-700">{emp.name}</span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-20 text-right">{emp.completed}/{emp.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Activity</h2>
        {data.monthly.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No data</p>
        ) : (
          <div className="space-y-3">
            {data.monthly.map(([month, counts]) => {
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
                      <div className="h-full rounded-l-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.round((counts.created / total) * 100)}%` }} />
                    )}
                    {counts.completed > 0 && (
                      <div className={`h-full transition-all duration-500 ${counts.created > 0 ? "" : "rounded-l-full"} rounded-r-full bg-emerald-500`} style={{ width: `${Math.round((counts.completed / total) * 100)}%` }} />
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
    </div>
  );
}
