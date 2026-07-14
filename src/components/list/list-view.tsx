"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createTask, updateTask } from "@/actions/task";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TaskDetailModal } from "@/components/task/task-detail-modal";

type ListTask = {
  id: string;
  title: string;
  issueKey: string | null;
  type: string;
  epicId: string | null;
  priority: string;
  assignee: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  reporter: { id: string; name: string; email: string } | null;
  column: { id: string; name: string };
  sprint: { id: string; name: string; status: string } | null;
  labels: { id: string; name: string; color: string }[];
  subtasks: { id: string; title: string; status: string }[];
  epic: { id: string; title: string; issueKey: string | null } | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  storyPoints: number;
  githubLink: string | null;
  productionUrl: string | null;
  dateOfDevAcceptOrStart: string | null;
  dateOfDevComplete: string | null;
  dateOfQaOrUatStart: string | null;
  dateOfQaOrUatComplete: string | null;
  dateOfReleaseToProd: string | null;
};

type ColumnData = { id: string; name: string };
type MemberData = { id: string; name: string; email: string; avatarUrl: string | null };
type LabelData = { id: string; name: string; color: string };
type SprintData = { id: string; name: string; status: string };
type EpicData = { id: string; title: string; issueKey: string | null };

type SortConfig = { key: string; direction: "asc" | "desc" } | null;

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

const typeIcons: Record<string, string> = {
  EPIC: "⬡",
  TASK: "☐",
  STORY: "📖",
  BUG: "🐛",
  FEATURE_REQUEST: "★",
  IMPROVEMENT: "▲",
  SUBTASK: "⁝",
};

const doneStatuses = ["Done", "Released", "Closed"];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function ListView({
  tasks: initialTasks,
  columns,
  members,
  labels,
  sprints,
  epics,
  projectId,
  boardId,
}: {
  tasks: ListTask[];
  columns: ColumnData[];
  members: MemberData[];
  labels: LabelData[];
  sprints: SprintData[];
  epics: EpicData[];
  projectId: string;
  boardId: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sprintFilter, setSprintFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<ListTask | null>(null);
  const [quickCreate, setQuickCreate] = useState(false);
  const [quickCreateTitle, setQuickCreateTitle] = useState("");
  const [quickCreateType, setQuickCreateType] = useState("TASK");

  const epicIds = useMemo(() => new Set(epics.map((e) => e.id)), [epics]);

  const grouped = useMemo(() => {
    const epicChildren = new Map<string, ListTask[]>();
    const standalone: ListTask[] = [];

    for (const t of tasks) {
      if (t.epicId && epicIds.has(t.epicId)) {
        const arr = epicChildren.get(t.epicId) || [];
        arr.push(t);
        epicChildren.set(t.epicId, arr);
      } else if (!epicIds.has(t.id)) {
        standalone.push(t);
      }
    }

    const epicTasks = tasks.filter((t) => t.type === "EPIC");

    return { epicTasks, epicChildren, standalone };
  }, [tasks, epics, epicIds]);

  const filtered = useMemo(() => {
    let list = [...tasks];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.issueKey && t.issueKey.toLowerCase().includes(q)));
    }
    if (statusFilter) list = list.filter((t) => t.column.name === statusFilter);
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);
    if (assigneeFilter) list = list.filter((t) => t.assignee?.id === assigneeFilter);
    if (typeFilter) list = list.filter((t) => t.type === typeFilter);
    if (sprintFilter) list = list.filter((t) => t.sprint?.id === sprintFilter);
    if (hideCompleted) list = list.filter((t) => !doneStatuses.includes(t.column.name));

    if (sortConfig) {
      list.sort((a, b) => {
        let aVal: string | number | null | undefined = "";
        let bVal: string | number | null | undefined = "";
        switch (sortConfig.key) {
          case "issueKey": aVal = a.issueKey; bVal = b.issueKey; break;
          case "title": aVal = a.title; bVal = b.title; break;
          case "type": aVal = a.type; bVal = b.type; break;
          case "priority": aVal = priorityLabels[a.priority] || a.priority; bVal = priorityLabels[b.priority] || b.priority; break;
          case "status": aVal = a.column.name; bVal = b.column.name; break;
          case "assignee": aVal = a.assignee?.name || ""; bVal = b.assignee?.name || ""; break;
          case "reporter": aVal = a.reporter?.name || ""; bVal = b.reporter?.name || ""; break;
          case "sprint": aVal = a.sprint?.name || ""; bVal = b.sprint?.name || ""; break;
          case "dueDate": aVal = a.dueDate || ""; bVal = b.dueDate || ""; break;
          case "createdAt": aVal = a.createdAt; bVal = b.createdAt; break;
          case "updatedAt": aVal = a.updatedAt; bVal = b.updatedAt; break;
          case "storyPoints": aVal = a.storyPoints; bVal = b.storyPoints; break;
        }
        if (aVal === bVal) return 0;
        if (sortConfig.direction === "asc") return aVal! > bVal! ? 1 : -1;
        return aVal! < bVal! ? 1 : -1;
      });
    }

    return list;
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter, typeFilter, sprintFilter, hideCompleted, sortConfig]);

  const toggleEpic = useCallback((epicId: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) next.delete(epicId);
      else next.add(epicId);
      return next;
    });
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  }, [filtered, selectedIds]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }, []);

  const handleInlineUpdate = useCallback(async (taskId: string, field: string, value: string) => {
    const formData = new FormData();
    formData.set("id", taskId);
    formData.set(field, value);
    const result = await updateTask(formData);
    if (result?.success) {
      setTasks((prev) => prev.map((t) => {
        if (t.id !== taskId) return t;
        if (field === "priority") return { ...t, priority: value };
        if (field === "assigneeId") {
          const newAssignee = members.find((m) => m.id === value);
          return { ...t, assignee: newAssignee || null, assigneeId: value };
        }
        if (field === "columnId") {
          const newCol = columns.find((c) => c.id === value);
          return { ...t, column: newCol || t.column };
        }
        if (field === "sprintId") {
          const newSprint = sprints.find((s) => s.id === value);
          return { ...t, sprint: newSprint || null, sprintId: value || null };
        }
        return t;
      }));
      router.refresh();
    }
  }, [members, columns, sprints, router]);

  const handleQuickCreate = useCallback(async () => {
    if (!quickCreateTitle.trim()) return;
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("columnId", columns[0]?.id || "");
    formData.set("title", quickCreateTitle.trim());
    formData.set("type", quickCreateType);
    const result = await createTask(formData);
    if (result?.id) {
      setQuickCreateTitle("");
      setQuickCreate(false);
      router.refresh();
    }
  }, [quickCreateTitle, quickCreateType, projectId, columns, router]);

  function SortHeader({ label, sortKey }: { label: string; sortKey: string }) {
    const isActive = sortConfig?.key === sortKey;
    return (
      <th
        className="cursor-pointer select-none px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
        onClick={() => handleSort(sortKey)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {isActive && (
            <span className="text-gray-400">{sortConfig!.direction === "asc" ? "↑" : "↓"}</span>
          )}
        </span>
      </th>
    );
  }

  function assigneeSelect(taskId: string, current: string | undefined) {
    return (
      <select
        value={current || ""}
        onChange={(e) => handleInlineUpdate(taskId, "assigneeId", e.target.value)}
        className="max-w-[120px] rounded border-0 bg-transparent py-0 text-xs font-medium text-gray-700 focus:outline-none focus:ring-0 cursor-pointer hover:bg-gray-50"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    );
  }

  function prioritySelect(taskId: string, current: string) {
    return (
      <select
        value={current}
        onChange={(e) => handleInlineUpdate(taskId, "priority", e.target.value)}
        className="rounded border-0 bg-transparent py-0 text-xs font-medium focus:outline-none focus:ring-0 cursor-pointer hover:bg-gray-50"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>
    );
  }

  function statusSelect(taskId: string, current: string) {
    return (
      <select
        value={current}
        onChange={(e) => {
          const col = columns.find((c) => c.name === e.target.value);
          if (col) handleInlineUpdate(taskId, "columnId", col.id);
        }}
        className="rounded border-0 bg-transparent py-0 text-xs font-medium focus:outline-none focus:ring-0 cursor-pointer hover:bg-gray-50"
        onClick={(e) => e.stopPropagation()}
      >
        {columns.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
    );
  }

  function sprintSelect(taskId: string, current: string | undefined) {
    return (
      <select
        value={current || ""}
        onChange={(e) => handleInlineUpdate(taskId, "sprintId", e.target.value)}
        className="max-w-[100px] rounded border-0 bg-transparent py-0 text-xs text-gray-500 focus:outline-none focus:ring-0 cursor-pointer hover:bg-gray-50"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">No sprint</option>
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    );
  }

  function renderRow(t: ListTask, depth: number = 0) {
    const isEpic = t.type === "EPIC";
    const hasChildren = isEpic && (grouped.epicChildren.get(t.id)?.length || 0) > 0;
    const hasSubtasks = t.subtasks.length > 0;
    const isExpanded = isEpic ? expandedEpics.has(t.id) : expandedTasks.has(t.id);
    const showSubtasks = hasSubtasks && isExpanded;

    const children: ListTask[] = isEpic ? (grouped.epicChildren.get(t.id) || []) : [];

    return (
      <tbody key={t.id}>
        <tr className={`group border-b border-gray-100 transition-colors hover:bg-blue-50/30 ${selectedIds.has(t.id) ? "bg-blue-50" : ""}`} style={{ cursor: "pointer" }} onClick={() => setSelectedTask(t)}>
          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selectedIds.has(t.id)}
              onChange={() => toggleSelect(t.id)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </td>
          <td className="px-3 py-2.5" style={{ paddingLeft: `${16 + depth * 24}px` }}>
            <div className="flex items-center gap-1">
              {(hasChildren || hasSubtasks) && (
                <button
                  onClick={(e) => { e.stopPropagation(); isEpic ? toggleEpic(t.id) : toggleTask(t.id); }}
                  className="flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
                </button>
              )}
              {!hasChildren && !hasSubtasks && <span className="w-4" />}
              <span className="text-xs">{typeIcons[t.type] || "☐"}</span>
            </div>
          </td>
          <td className="px-3 py-2.5">
            <span className="text-xs font-mono text-gray-400">{t.issueKey || "—"}</span>
          </td>
          <td className="px-3 py-2.5 max-w-[250px]">
            <div className="truncate text-sm font-medium text-gray-900">
              {t.title}
              {t.epic && !epicIds.has(t.id) && (
                <span className="ml-2 text-xs text-gray-400">{t.epic.issueKey || t.epic.title}</span>
              )}
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap">
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Avatar name={t.assignee?.name || "?"} url={t.assignee?.avatarUrl} size="sm" />
              {assigneeSelect(t.id, t.assignee?.id)}
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap">
            <span className="text-xs text-gray-500">{t.reporter?.name || "—"}</span>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${priorityColors[t.priority] || "bg-gray-300"}`} />
              {prioritySelect(t.id, t.priority)}
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {statusSelect(t.id, t.column.name)}
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {sprintSelect(t.id, t.sprint?.id)}
          </td>
          <td className="px-3 py-2.5">
            <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
              {t.labels.slice(0, 2).map((l) => (
                <span key={l.id} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: l.color + "18", color: l.color }}>
                  {l.name}
                </span>
              ))}
              {t.labels.length > 2 && <span className="text-[10px] text-gray-400">+{t.labels.length - 2}</span>}
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-400">{formatDate(t.createdAt)}</td>
          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-400">{formatDate(t.updatedAt)}</td>
          <td className="px-3 py-2.5 whitespace-nowrap text-xs">
            <span className={isOverdue(t.dueDate) && !doneStatuses.includes(t.column.name) ? "font-medium text-red-600" : "text-gray-400"}>
              {formatDate(t.dueDate) || "—"}
            </span>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-400">
            {t.storyPoints > 0 ? t.storyPoints : "—"}
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2">
              {t.githubLink && (
                <a href={t.githubLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="GitHub">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                </a>
              )}
              {t.productionUrl && (
                <a href={t.productionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="Production">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              )}
            </div>
          </td>
        </tr>
        {showSubtasks && t.subtasks.map((st) => (
          <tr key={`sub-${st.id}`} className="border-b border-gray-50 bg-gray-50/50 text-xs">
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-gray-400" style={{ paddingLeft: `${16 + (depth + 1) * 24}px` }}>
              <span className="text-[10px]">⁝</span>
            </td>
            <td className="px-3 py-2 text-gray-400">—</td>
            <td className="px-3 py-2 text-gray-600">{st.title}</td>
            <td className="px-3 py-2 text-gray-400" colSpan={11}>
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                st.status === "DONE" ? "bg-emerald-50 text-emerald-600" :
                st.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
              }`}>{st.status.replace("_", " ")}</span>
            </td>
          </tr>
        ))}
        {hasChildren && isExpanded && children.map((child) => renderRow(child, depth + 1))}
      </tbody>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none">
          <option value="">All statuses</option>
          {columns.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none">
          <option value="">All priorities</option>
          {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none">
          <option value="">All assignees</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none">
          <option value="">All types</option>
          <option value="EPIC">Epic</option>
          <option value="TASK">Task</option>
          <option value="STORY">Story</option>
          <option value="BUG">Bug</option>
          <option value="FEATURE_REQUEST">Feature Request</option>
          <option value="IMPROVEMENT">Improvement</option>
        </select>

        <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none">
          <option value="">All sprints</option>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
          Hide completed
        </label>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{filtered.length} of {tasks.length} tasks</span>
          {selectedIds.size > 0 && (
            <span className="text-xs font-medium text-blue-600">{selectedIds.size} selected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setExpandedEpics(new Set(epics.map((e) => e.id)));
              setExpandedTasks(new Set(tasks.filter((t) => t.subtasks.length > 0).map((t) => t.id)));
            }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Expand all
          </button>
          <button
            onClick={() => { setExpandedEpics(new Set()); setExpandedTasks(new Set()); }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Collapse all
          </button>
          <div className="flex items-center gap-1">
            <select
              value={quickCreateType}
              onChange={(e) => setQuickCreateType(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none"
            >
              <option value="TASK">Task</option>
              <option value="EPIC">Epic</option>
              <option value="STORY">Story</option>
              <option value="BUG">Bug</option>
              <option value="FEATURE_REQUEST">Feature Request</option>
              <option value="IMPROVEMENT">Improvement</option>
              <option value="SUBTASK">Subtask</option>
            </select>
            <button
              onClick={() => setQuickCreate(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full table-fixed">
          <thead className="border-b border-gray-200 bg-gray-50/80">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="w-8 px-3 py-3" />
              <SortHeader label="Key" sortKey="issueKey" />
              <SortHeader label="Title" sortKey="title" />
              <SortHeader label="Assignee" sortKey="assignee" />
              <SortHeader label="Reporter" sortKey="reporter" />
              <SortHeader label="Priority" sortKey="priority" />
              <SortHeader label="Status" sortKey="status" />
              <SortHeader label="Sprint" sortKey="sprint" />
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Labels</th>
              <SortHeader label="Created" sortKey="createdAt" />
              <SortHeader label="Updated" sortKey="updatedAt" />
              <SortHeader label="Due Date" sortKey="dueDate" />
              <SortHeader label="Points" sortKey="storyPoints" />
              <th className="w-16 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Links</th>
            </tr>
          </thead>

          {quickCreate && (
            <tbody>
              <tr className="border-b border-blue-200 bg-blue-50/50">
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-xs text-blue-400">+</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2" colSpan={12}>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      {quickCreateType.replace("_", " ")}
                    </span>
                    <input
                      type="text"
                      value={quickCreateTitle}
                      onChange={(e) => setQuickCreateTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleQuickCreate(); if (e.key === "Escape") { setQuickCreate(false); setQuickCreateTitle(""); } }}
                      placeholder="What needs to be done?"
                      className="flex-1 rounded border-0 bg-transparent px-2 py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                      autoFocus
                    />
                    <button onClick={handleQuickCreate} className="rounded bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800">Create</button>
                    <button onClick={() => { setQuickCreate(false); setQuickCreateTitle(""); }} className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                  </div>
                </td>
              </tr>
            </tbody>
          )}

          {filtered.length === 0 && !quickCreate ? (
            <tbody>
              <tr>
                <td colSpan={15} className="py-16 text-center">
                  <p className="text-sm text-gray-400">No tasks match the current filters.</p>
                  <button
                    onClick={() => setQuickCreate(true)}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Create first task
                  </button>
                </td>
              </tr>
            </tbody>
          ) : (
            <>
              {grouped.epicTasks.map((epic) => renderRow(epic))}
              {grouped.standalone.filter((t) => t.type !== "EPIC").map((t) => renderRow(t))}
            </>
          )}
        </table>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask as any}
          projectId={projectId}
          members={members as any}
          labels={labels as any}
          sprints={sprints as any}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={(updatedTask) => {
            setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? { ...t, ...updatedTask } as ListTask : t));
          }}
        />
      )}
    </div>
  );
}
