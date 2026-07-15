"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ReassignTaskModal } from "@/components/task/reassign-task-modal";
import { createSubtask } from "@/actions/subtask";

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-300",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const priorityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

function formatDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Task = {
  id: string;
  title: string;
  code?: string | null;
  priority: string;
  dueDate: string | null;
  category: string | null;
  assignee: { id: string; name: string; email: string } | null;
  reporter: { id: string; name: string } | null;
  column: { name: string; board: { project: { id: string; name: string } } };
  labels: { label: { id: string; name: string; color: string } }[];
};

type Props = {
  tasks: Task[];
  projects: { id: string; name: string }[];
  employees: { id: string; name: string; displayName: string | null }[];
  statuses: string[];
  categories: string[];
  priorities: string[];
};

export function AllTasksClient({ tasks, projects, employees, statuses, categories, priorities }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [reassignTarget, setReassignTarget] = useState<Task | null>(null);
  const [subtaskTarget, setSubtaskTarget] = useState<Task | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);
  const [subtaskError, setSubtaskError] = useState("");

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (projectFilter && t.column.board.project.id !== projectFilter) return false;
    if (employeeFilter && t.assignee?.id !== employeeFilter) return false;
    if (statusFilter && t.column.name !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    return true;
  });

  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  async function handleCreateSubtask(taskId: string) {
    if (!subtaskTitle.trim()) return;
    setSubtaskLoading(true);
    setSubtaskError("");
    const result = await createSubtask(taskId, subtaskTitle.trim());
    if (result.error) {
      setSubtaskError(typeof result.error === "string" ? result.error : "Failed to create subtask");
      setSubtaskLoading(false);
      return;
    }
    setSubtaskTitle("");
    setSubtaskTarget(null);
    setSubtaskLoading(false);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none"
        >
          <option value="">All employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.displayName || e.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none"
        >
          <option value="">All priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>{priorityLabels[p] || p}</option>
          ))}
        </select>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">No tasks match the selected filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((t) => (
              <Link
                key={t.id}
                href={`/project/${t.column.board.project.id}`}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityColors[t.priority] || "bg-gray-300"}`} />
                <span className="text-xs font-mono text-gray-400 w-12 shrink-0">{t.code ? `#${t.code}` : ""}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {t.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Badge variant="gray">{t.column.board.project.name}</Badge>
                    <span>{t.column.name}</span>
                    {t.assignee && <span>{t.assignee.name}</span>}
                    {t.category && <Badge variant="gray">{t.category}</Badge>}
                    {t.dueDate && (
                      <span className={isOverdue(t.dueDate) ? "font-medium text-red-600" : ""}>
                        Due {formatDate(t.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.labels.slice(0, 2).map((l) => (
                    <span
                      key={l.label.id}
                      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: l.label.color + "18", color: l.label.color }}
                    >
                      {l.label.name}
                    </span>
                  ))}
                  <span className={`text-xs font-medium ${priorityColors[t.priority] ? "text-gray-500" : ""}`}>
                    {priorityLabels[t.priority] || t.priority}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Showing {filtered.length} of {tasks.length} tasks
      </p>
    </div>
  );
}
