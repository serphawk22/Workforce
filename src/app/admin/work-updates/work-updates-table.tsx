"use client";

import { useState, useMemo } from "react";

type Update = {
  id: string;
  taskId: string;
  userId: string;
  subtaskId: string | null;
  status: string;
  taskStatus: string;
  progressNotes: string | null;
  workSummary: string | null;
  githubLink: string | null;
  productionUrl: string | null;
  timeSpent: number;
  createdAt: string;
  updatedAt: string | null;
  user: { id: string; name: string };
  subtask: { id: string; title: string; status: string } | null;
  task: { id: string; title: string; issueKey: string | null; sheetCode: string | null; column: { name: string; board: { project: { id: string; name: string; key: string } } } };
};

type Employee = { id: string; name: string };

const taskStatusColors: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Review: "bg-amber-50 text-amber-700",
  Testing: "bg-purple-50 text-purple-700",
  Done: "bg-emerald-50 text-emerald-700",
};

function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
}

export function WorkUpdatesTable({ updates: initialUpdates, employees }: { updates: Update[]; employees: Employee[] }) {
  const [updates] = useState(initialUpdates);
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const projects = useMemo(() => {
    const names = new Set(updates.map((u) => u.task.column.board.project.name));
    return Array.from(names).sort();
  }, [updates]);

  const filtered = useMemo(() => {
    return updates.filter((u) => {
      if (search && !u.task.title.toLowerCase().includes(search.toLowerCase()) && !u.user.name.toLowerCase().includes(search.toLowerCase()) && !(u.task.issueKey || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (employeeFilter && u.user.id !== employeeFilter) return false;
      if (projectFilter && u.task.column.board.project.name !== projectFilter) return false;
      return true;
    });
  }, [updates, search, employeeFilter, projectFilter]);

  function handleExportCSV() {
    const headers = ["Employee", "Project", "Task", "Issue Key", "Subtask", "Task Status", "Work Summary", "Progress Notes", "Time Spent (min)", "GitHub Link", "Production URL", "Submitted At", "Updated At"];
    const rows = filtered.map((u) => [
      u.user.name,
      u.task.column.board.project.name,
      u.task.title,
      u.task.issueKey || "",
      u.subtask?.title || "",
      u.taskStatus,
      u.workSummary || "",
      u.progressNotes || "",
      String(u.timeSpent),
      u.githubLink || "",
      u.productionUrl || "",
      formatDateTime(u.createdAt),
      formatDateTime(u.updatedAt),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-updates-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by task, employee, issue key..."
          className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All employees</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={handleExportCSV} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Export CSV
        </button>
        <button onClick={handlePrint} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Print
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtask</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Summary</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress Notes</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GitHub</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Production</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted At</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-sm text-gray-400">No work updates found</td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">{u.user.name.charAt(0)}</div>
                      <span className="text-sm font-medium text-gray-900">{u.user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.task.column.board.project.name}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{u.task.issueKey ? `${u.task.issueKey} ` : ""}{u.task.title}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.subtask?.title || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${taskStatusColors[u.taskStatus] || "bg-gray-100 text-gray-700"}`}>
                      {u.taskStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="text-sm text-gray-600 truncate" title={u.workSummary || ""}>{u.workSummary || "-"}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="text-sm text-gray-600 truncate" title={u.progressNotes || ""}>{u.progressNotes || "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.timeSpent > 0 ? `${u.timeSpent}m` : "-"}</td>
                  <td className="px-4 py-3">
                    {u.githubLink ? (
                      <a href={u.githubLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block max-w-[120px]">{u.githubLink.replace(/^https?:\/\//, "")}</a>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.productionUrl ? (
                      <a href={u.productionUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block max-w-[120px]">{u.productionUrl.replace(/^https?:\/\//, "")}</a>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(u.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">{filtered.length} of {updates.length} updates shown</p>
    </div>
  );
}
