"use client";

import { useState, useMemo } from "react";

type AwaitingTask = {
  id: string;
  taskId: string;
  employeeId: string;
  employeeName: string;
  projectName: string;
  projectKey: string;
  taskTitle: string;
  issueKey: string | null;
  currentStatus: string;
  assignedDate: string;
  dueDate: string | null;
};

const statusColors: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Review: "bg-amber-50 text-amber-700",
  Testing: "bg-purple-50 text-purple-700",
  Done: "bg-emerald-50 text-emerald-700",
};

export function TasksAwaitingTable({ tasks }: { tasks: AwaitingTask[] }) {
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const employees = useMemo(() => {
    const names = new Set(tasks.map((t) => t.employeeName));
    return Array.from(names).sort();
  }, [tasks]);

  const projects = useMemo(() => {
    const names = new Set(tasks.map((t) => t.projectName));
    return Array.from(names).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.taskTitle.toLowerCase().includes(search.toLowerCase()) && !t.employeeName.toLowerCase().includes(search.toLowerCase()) && !(t.issueKey || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (employeeFilter && t.employeeName !== employeeFilter) return false;
      if (projectFilter && t.projectName !== projectFilter) return false;
      return true;
    });
  }, [tasks, search, employeeFilter, projectFilter]);

  if (tasks.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Tasks Awaiting First Update</h2>
      <p className="text-sm text-gray-500 mb-4">
        {tasks.length} task{tasks.length !== 1 ? "s" : ""} with no work update submitted yet
      </p>

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
          {employees.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All projects</option>
          {projects.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">{t.employeeName.charAt(0)}</div>
                    <span className="text-sm font-medium text-gray-900">{t.employeeName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{t.projectName}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{t.issueKey ? `${t.issueKey} ` : ""}{t.taskTitle}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(t.assignedDate).toLocaleDateString("en-US")}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-US") : "-"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[t.currentStatus] || "bg-gray-100 text-gray-700"}`}>
                    {t.currentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}