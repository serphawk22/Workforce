"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTask, updateTask } from "@/actions/task";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TaskDetailModal } from "@/components/task/task-detail-modal";
import {
  Bug,
  CheckSquare,
  Layers,
  BookOpen,
  Wand2,
  TrendingUp,
  Indent,
  ChevronsUp,
  ChevronUp,
  Minus,
  ChevronDown,
  Search,
  Plus,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  GitBranch,
  Globe,
} from "lucide-react";

type ListTask = {
  id: string;
  title: string;
  issueKey: string | null;
  code: string | null;
  type: string;
  epicId: string | null;
  priority: string;
  assignee: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  reporter: { id: string; name: string; email: string } | null;
  column: { id: string; name: string };
  sprint: { id: string; name: string; status: string } | null;
  labels: { id: string; name: string; color: string }[];
  subtasks: { id: string; title: string; status: string; code: string | null }[];
  completedSubtaskCount: number;
  epic: { id: string; title: string; issueKey: string | null } | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
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

const typeConfig: Record<string, { icon: typeof Bug; color: string; bg: string; label: string }> = {
  EPIC: { icon: Layers, color: "#7C3AED", bg: "bg-purple-50", label: "Epic" },
  TASK: { icon: CheckSquare, color: "#3B82F6", bg: "bg-blue-50", label: "Task" },
  STORY: { icon: BookOpen, color: "#10B981", bg: "bg-green-50", label: "Story" },
  BUG: { icon: Bug, color: "#EF4444", bg: "bg-red-50", label: "Bug" },
  FEATURE_REQUEST: { icon: Wand2, color: "#F59E0B", bg: "bg-amber-50", label: "Feature" },
  IMPROVEMENT: { icon: TrendingUp, color: "#06B6D4", bg: "bg-cyan-50", label: "Improvement" },
  SUBTASK: { icon: Indent, color: "#6B7280", bg: "bg-gray-50", label: "Subtask" },
};

const priorityConfig: Record<string, { icon: typeof Bug; color: string; label: string }> = {
  CRITICAL: { icon: ChevronsUp, color: "#DC2626", label: "Critical" },
  HIGH: { icon: ChevronUp, color: "#F59E0B", label: "High" },
  MEDIUM: { icon: Minus, color: "#3B82F6", label: "Medium" },
  LOW: { icon: ChevronDown, color: "#9CA3AF", label: "Low" },
};

const priorityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
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
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
      list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.issueKey && t.issueKey.toLowerCase().includes(q)) || (t.code && t.code.toLowerCase().includes(q)));
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

  const visibleEpics = useMemo(() => {
    return grouped.epicTasks.filter((t) => filtered.find((ft) => ft.id === t.id));
  }, [grouped.epicTasks, filtered]);

  const visibleStandalone = useMemo(() => {
    return grouped.standalone.filter((t) => t.type !== "EPIC" && filtered.find((ft) => ft.id === t.id));
  }, [grouped.standalone, filtered]);

  function SortHeader({ label, sortKey, align = "left" }: { label: string; sortKey: string; align?: "left" | "right" | "center" }) {
    const isActive = sortConfig?.key === sortKey;
    const textAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
    return (
      <th
        className={`cursor-pointer select-none px-3 py-3 ${textAlign} text-[11px] font-semibold text-gray-500 uppercase tracking-widest hover:text-gray-800 transition-colors`}
        onClick={() => handleSort(sortKey)}
      >
        <span className="inline-flex items-center gap-1.5">
          {label}
          <span className="relative w-3 h-3">
            {isActive && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-primary font-bold">
                {sortConfig!.direction === "asc" ? "↑" : "↓"}
              </span>
            )}
          </span>
        </span>
      </th>
    );
  }

  function TypeIcon({ type }: { type: string }) {
    const config = typeConfig[type];
    if (!config) return <CheckSquare className="h-3.5 w-3.5 text-gray-400" />;
    const Icon = config.icon;
    return (
      <div className={`flex h-5 w-5 items-center justify-center rounded ${config.bg}`} title={config.label}>
        <Icon className="h-3 w-3" style={{ color: config.color }} strokeWidth={2.5} />
      </div>
    );
  }

  function PriorityIcon({ priority }: { priority: string }) {
    const config = priorityConfig[priority];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: config.color }} strokeWidth={2.5} />;
  }

  function assigneeSelect(taskId: string, current: string | undefined) {
    return (
      <select
        value={current || ""}
        onChange={(e) => handleInlineUpdate(taskId, "assigneeId", e.target.value)}
        className="max-w-[110px] rounded-md border-0 bg-transparent py-0 text-[11px] font-medium text-gray-700 focus:outline-none focus:ring-0 cursor-pointer hover:bg-gray-50 transition-colors"
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
        className="rounded-md border-0 bg-transparent py-0 text-[11px] font-semibold focus:outline-none focus:ring-0 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ color: priorityConfig[current]?.color || "#9CA3AF" }}
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
        className="rounded-md border-0 bg-transparent py-0 text-[11px] font-medium focus:outline-none focus:ring-0 cursor-pointer hover:bg-gray-50 transition-colors"
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
        className="max-w-[90px] rounded-md border-0 bg-transparent py-0 text-[11px] text-gray-500 focus:outline-none focus:ring-0 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">No sprint</option>
        {sprints.filter((s) => s.status !== "COMPLETED").map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    );
  }

  function renderSubtaskRow(st: ListTask["subtasks"][0], hasNext: boolean, depth: number) {
    return (
      <tr key={`sub-${st.id}`} className="border-b border-gray-100 group hover:bg-blue-50/20 transition-colors">
        <td className="px-3 py-2 w-10" />
        <td className="px-3 py-2" colSpan={16}>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 18}px` }}>
            <div className="flex items-stretch h-full mr-1">
              <div className="w-[18px] shrink-0 relative">
                <div className="absolute left-1/2 top-0 bottom-1/2 w-px bg-gray-200" />
                <div className="absolute left-1/2 top-1/2 w-1/2 h-px bg-gray-200" />
                {hasNext && (
                  <div className="absolute left-1/2 bottom-0 w-px bg-gray-200" style={{ top: "50%" }} />
                )}
              </div>
            </div>
            <Indent className="h-3 w-3 text-gray-400 shrink-0" strokeWidth={2} />
            <span className="font-mono text-[11px] text-gray-400 w-16 shrink-0">{st.code ? `#${st.code}` : "—"}</span>
            <span className={`text-[12px] ${st.status === "DONE" ? "line-through text-gray-400" : "text-gray-700 font-medium"}`}>
              {st.title}
            </span>
            <Badge variant={
              st.status === "DONE" ? "success" :
              st.status === "IN_PROGRESS" ? "info" : "default"
            } size="sm">
              {st.status.replace("_", " ")}
            </Badge>
          </div>
        </td>
      </tr>
    );
  }

  function renderTaskRow(t: ListTask, depth: number = 0, hasNextSibling: boolean = false, treeParentHasNext: boolean[] = []) {
    const isEpic = t.type === "EPIC";
    const hasChildren = isEpic && (grouped.epicChildren.get(t.id)?.length || 0) > 0;
    const hasSubtasks = t.subtasks.length > 0;
    const isExpanded = isEpic ? expandedEpics.has(t.id) : expandedTasks.has(t.id);
    const showSubtasks = hasSubtasks && isExpanded;

    const children: ListTask[] = isEpic ? (grouped.epicChildren.get(t.id) || []) : [];
    const TypeConf = typeConfig[t.type] || typeConfig.TASK;
    const TypeIconComp = TypeConf.icon;
    const PriorityConf = priorityConfig[t.priority] || priorityConfig.MEDIUM;

    return (
      <tbody key={t.id} className="animate-fade-in">
        <tr
          className={`border-b border-gray-100 group transition-all duration-150 ${
            selectedIds.has(t.id) ? "bg-blue-50/60" : "hover:bg-blue-50/20"
          }`}
          style={{ cursor: "pointer" }}
          onClick={() => setSelectedTask(t)}
        >
          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center h-full">
              {depth > 0 && (
                <div className="flex items-stretch h-full mr-1">
                  {treeParentHasNext.map((hasNext, i) => (
                    <div key={i} className="w-[18px] shrink-0">
                      {hasNext && <div className="mx-auto w-px h-full min-h-[36px] bg-gray-200" />}
                    </div>
                  ))}
                  <div className="w-[18px] shrink-0 relative">
                    <div className="absolute left-1/2 top-0 bottom-1/2 w-px bg-gray-200" />
                    <div className="absolute left-1/2 top-1/2 w-1/2 h-px bg-gray-200" />
                    {hasNextSibling && (
                      <div className="absolute left-1/2 bottom-0 w-px bg-gray-200" style={{ top: "50%" }} />
                    )}
                  </div>
                </div>
              )}
              <input
                type="checkbox"
                checked={selectedIds.has(t.id)}
                onChange={() => toggleSelect(t.id)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 shrink-0"
              />
            </div>
          </td>
          <td className="px-3 py-2.5 w-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-0.5">
              {(hasChildren || hasSubtasks) && (
                <button
                  onClick={(e) => { e.stopPropagation(); isEpic ? toggleEpic(t.id) : toggleTask(t.id); }}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  {isExpanded ? <ChevronDownIcon className="h-3 w-3" strokeWidth={2.5} /> : <ChevronRight className="h-3 w-3" strokeWidth={2.5} />}
                </button>
              )}
              {!hasChildren && !hasSubtasks && <span className="w-5" />}
              <TypeIcon type={t.type} />
            </div>
          </td>
          <td className="px-3 py-2.5 w-24">
            <span className="font-mono text-[11px] text-gray-400 font-medium">
              {t.code ? `#${t.code}` : t.issueKey || "—"}
            </span>
          </td>
          <td className="px-3 py-2.5 min-w-[180px] max-w-[300px]">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-medium text-gray-900 group-hover:text-primary transition-colors">
                {t.title}
              </span>
              {t.epic && !epicIds.has(t.id) && (
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">
                  {t.epic.issueKey || t.epic.title}
                </span>
              )}
              {t.githubLink && (
                <a href={t.githubLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors">
                  <GitBranch className="h-3 w-3" strokeWidth={2} />
                </a>
              )}
              {t.productionUrl && (
                <a href={t.productionUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors">
                  <Globe className="h-3 w-3" strokeWidth={2} />
                </a>
              )}
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              {t.assignee ? (
                <>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9px] font-semibold text-gray-600 ring-1 ring-white shrink-0">
                    {t.assignee.avatarUrl ? (
                      <img src={t.assignee.avatarUrl} alt={t.assignee.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      t.assignee.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                    )}
                  </div>
                  {assigneeSelect(t.id, t.assignee?.id)}
                </>
              ) : (
                <span className="text-[11px] text-gray-400 italic">Unassigned</span>
              )}
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-gray-400">
            {t.reporter?.name || "—"}
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <PriorityIcon priority={t.priority} />
              {prioritySelect(t.id, t.priority)}
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center">
              <div className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                doneStatuses.includes(t.column.name) ? "bg-green-50 text-green-700" :
                t.column.name === "In Progress" ? "bg-blue-50 text-blue-700" :
                t.column.name === "Review" ? "bg-amber-50 text-amber-700" :
                "bg-gray-50 text-gray-600"
              }`}>
                {statusSelect(t.id, t.column.name)}
              </div>
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {t.sprint ? (
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                {sprintSelect(t.id, t.sprint?.id)}
              </div>
            ) : (
              sprintSelect(t.id, undefined)
            )}
          </td>
          <td className="px-3 py-2.5">
            <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
              {t.labels.slice(0, 2).map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: l.color + "15", color: l.color }}
                >
                  {l.name}
                </span>
              ))}
              {t.labels.length > 2 && (
                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-gray-50 text-gray-500">
                  +{t.labels.length - 2}
                </span>
              )}
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-gray-400">{formatDate(t.createdAt)}</td>
          <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-gray-400">{formatDate(t.updatedAt)}</td>
          <td className="px-3 py-2.5 whitespace-nowrap text-[11px]">
            <span className={
              isOverdue(t.dueDate) && !doneStatuses.includes(t.column.name)
                ? "font-semibold text-red-600"
                : t.dueDate ? "text-gray-500" : "text-gray-300"
            }>
              {formatDate(t.dueDate) || "—"}
            </span>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-gray-500">
            {t.subtasks.length > 0 && (
              <span className="font-medium">{t.completedSubtaskCount}/{t.subtasks.length}</span>
            )}
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap min-w-[90px]">
            {t.subtasks.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-12 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(t.completedSubtaskCount / t.subtasks.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-gray-400">
                  {Math.round((t.completedSubtaskCount / t.subtasks.length) * 100)}%
                </span>
              </div>
            )}
          </td>
        </tr>
        {showSubtasks && t.subtasks.map((st, idx) => renderSubtaskRow(st, idx < t.subtasks.length - 1, depth + 1))}
        {hasChildren && isExpanded && children.map((child, idx) =>
          renderTaskRow(child, depth + 1, idx < children.length - 1, [...treeParentHasNext, hasNextSibling])
        )}
      </tbody>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search tasks...  "
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-800 placeholder-gray-400 shadow-sm transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            ⌘K
          </kbd>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none"
        >
          <option value="">All statuses</option>
          {columns.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none"
        >
          <option value="">All priorities</option>
          {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none"
        >
          <option value="">All assignees</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none"
        >
          <option value="">All types</option>
          {Object.entries(typeConfig).filter(([k]) => k !== "SUBTASK").map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={sprintFilter}
          onChange={(e) => setSprintFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none"
        >
          <option value="">All sprints</option>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
          />
          Hide done
        </label>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500">
            {filtered.length} <span className="text-gray-400 font-normal">of</span> {tasks.length} tasks
          </span>
          {selectedIds.size > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setExpandedEpics(new Set(epics.map((e) => e.id)));
              setExpandedTasks(new Set(tasks.filter((t) => t.subtasks.length > 0).map((t) => t.id)));
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300"
          >
            Expand all
          </button>
          <button
            onClick={() => { setExpandedEpics(new Set()); setExpandedTasks(new Set()); }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300"
          >
            Collapse all
          </button>
          <div className="flex items-center gap-1.5 ml-2 border-l border-gray-200 pl-3">
            <select
              value={quickCreateType}
              onChange={(e) => setQuickCreateType(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 focus:outline-none"
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
            >
              <Plus className="h-3 w-3" strokeWidth={2.5} />
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.02]">
        <table className="w-full min-w-[1200px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm">
              <th className="w-10 px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
              </th>
              <th className="w-8 px-3 py-3.5" />
              <SortHeader label="Key" sortKey="issueKey" />
              <SortHeader label="Title" sortKey="title" />
              <SortHeader label="Assignee" sortKey="assignee" />
              <SortHeader label="Reporter" sortKey="reporter" />
              <SortHeader label="Priority" sortKey="priority" />
              <SortHeader label="Status" sortKey="status" />
              <SortHeader label="Sprint" sortKey="sprint" />
              <th className="px-3 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Labels</th>
              <SortHeader label="Created" sortKey="createdAt" />
              <SortHeader label="Updated" sortKey="updatedAt" />
              <SortHeader label="Due" sortKey="dueDate" />
              <th className="px-3 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Sub</th>
              <SortHeader label="Progress" sortKey="dueDate" />
            </tr>
          </thead>

          {quickCreate && (
            <tbody>
              <tr className="border-b border-primary/20 bg-primary/[0.03]">
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5">
                  <Wand2 className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                </td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" colSpan={12}>
                  <div className="flex items-center gap-2.5">
                    <Badge variant="primary" size="sm">
                      {quickCreateType.replace("_", " ")}
                    </Badge>
                    <input
                      type="text"
                      value={quickCreateTitle}
                      onChange={(e) => setQuickCreateTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleQuickCreate(); if (e.key === "Escape") { setQuickCreate(false); setQuickCreateTitle(""); } }}
                      placeholder="What needs to be done?"
                      className="flex-1 rounded-lg border-0 bg-transparent px-2 py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                      autoFocus
                    />
                    <button
                      onClick={handleQuickCreate}
                      className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setQuickCreate(false); setQuickCreateTitle(""); }}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          )}

          {filtered.length === 0 && !quickCreate ? (
            <tbody>
              <tr>
                <td colSpan={16} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <Search className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No tasks match the current filters</p>
                    <button
                      onClick={() => setQuickCreate(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Create first task
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : (
            <>
              {visibleEpics.map((epic, idx) =>
                renderTaskRow(epic, 0, idx < visibleEpics.length - 1, [])
              )}
              {visibleStandalone.length > 0 && (
                <>
                  {visibleStandalone.map((t, idx) =>
                    renderTaskRow(t, 0, idx < visibleStandalone.length - 1, [])
                  )}
                </>
              )}
            </>
          )}
        </table>
        {!quickCreate && filtered.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3">
            <button
              onClick={() => setQuickCreate(true)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Create task
            </button>
          </div>
        )}
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
