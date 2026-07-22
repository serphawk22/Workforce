"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  GitBranch,
  ArrowUpRight,
  Filter,
  X,
  CalendarDays,
  User,
  MessageSquare,
  ChevronDown,
  BarChart3,
  Activity,
  ListChecks,
  PlayCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateShort } from "@/lib/dates";

type ProjectData = {
  id: string; name: string; key: string; workspaceId: string;
  totalTasks: number; completed: number; inProgress: number; pending: number;
  overdue: number; progress: number; memberCount: number;
  members: string[]; sprintCount: number;
  activeSprint: { id: string; name: string; status: string } | null;
  dailyWorkCount: number;
};

type TaskData = {
  id: string; title: string; code: string | null;
  priority: string; status: string; columnId: string;
  projectId: string | null; projectName: string | null; projectKey: string | null;
  assignee: { id: string; name: string; email: string } | null;
  reporter: { id: string; name: string } | null;
  sprint: { id: string; name: string; status: string } | null;
  labels: { id: string; name: string; color: string }[];
  dueDate: string | null; commentCount: number; subtaskCount: number;
  createdAt: string;
};

type SprintData = {
  id: string; name: string; status: string;
  projectId: string; projectName: string; projectKey: string;
  startDate: string | null; endDate: string | null;
  goal: string | null; taskCount: number;
};

type UserData = {
  id: string; name: string; email: string;
  avatarUrl: string | null; department: string | null; role: string;
};

type DailyWorkData = {
  id: string; employeeId: string; employeeName: string;
  projectId: string | null; projectName: string | null; projectKey: string | null;
  taskId: string | null; taskTitle: string | null; taskCode: string | null;
  todayWork: string; todayWorkCompleted: string;
  tomorrowTask: string; status: string; submittedAt: string;
};

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const DONE_COLUMNS = ["Done", "Released", "Closed"];

function priorityColor(p: string) {
  switch (p) {
    case "CRITICAL": return "text-red-600 bg-red-50 border-red-200";
    case "HIGH": return "text-orange-600 bg-orange-50 border-orange-200";
    case "MEDIUM": return "text-blue-600 bg-blue-50 border-blue-200";
    case "LOW": return "text-gray-500 bg-gray-50 border-gray-200";
    default: return "text-gray-500 bg-gray-50 border-gray-200";
  }
}

function statusColor(s: string) {
  switch (s) {
    case "To Do": return "bg-gray-100 text-gray-700";
    case "In Progress": return "bg-blue-50 text-blue-700";
    case "Review": return "bg-amber-50 text-amber-700";
    case "Testing": return "bg-purple-50 text-purple-700";
    case "Done": case "Released": case "Closed": return "bg-emerald-50 text-emerald-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

export function WorkspaceDashboardClient({
  projects, tasks, sprints, users, dailyWorkEntries, userId,
}: {
  projects: ProjectData[];
  tasks: TaskData[];
  sprints: SprintData[];
  users: UserData[];
  dailyWorkEntries: DailyWorkData[];
  userId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") || "dashboard";

  const [selectedProjectId, setSelectedProjectId] = useState<string>("__all__");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [priorityFilter, setPriorityFilter] = useState<string>("__all__");
  const [sprintFilter, setSprintFilter] = useState<string>("__all__");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("__all__");
  const [labelFilter, setLabelFilter] = useState<string>("__all__");

  const allLabels = useMemo(() => {
    const labelSet = new Set<string>();
    tasks.forEach((t) => t.labels.forEach((l) => labelSet.add(l.name)));
    return Array.from(labelSet).sort();
  }, [tasks]);

  const filteredProjects = useMemo(() => {
    if (selectedProjectId === "__all__") return projects;
    return projects.filter((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (selectedProjectId !== "__all__") {
      result = result.filter((t) => t.projectId === selectedProjectId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.code && t.code.toLowerCase().includes(q)) ||
          (t.projectName && t.projectName.toLowerCase().includes(q)) ||
          (t.assignee && t.assignee.name.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "__all__") result = result.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "__all__") result = result.filter((t) => t.priority === priorityFilter);
    if (sprintFilter !== "__all__") result = result.filter((t) => t.sprint?.id === sprintFilter);
    if (assigneeFilter !== "__all__") result = result.filter((t) => t.assignee?.id === assigneeFilter);
    if (labelFilter !== "__all__") result = result.filter((t) => t.labels.some((l) => l.name === labelFilter));
    return result;
  }, [tasks, selectedProjectId, searchQuery, statusFilter, priorityFilter, sprintFilter, assigneeFilter, labelFilter]);

  const filteredSprints = useMemo(() => {
    let result = [...sprints];
    if (selectedProjectId !== "__all__") {
      result = result.filter((s) => s.projectId === selectedProjectId);
    }
    return result;
  }, [sprints, selectedProjectId]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => DONE_COLUMNS.includes(t.status)).length;
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress").length;
  const pendingTasks = tasks.filter((t) => t.status === "To Do").length;
  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !DONE_COLUMNS.includes(t.status)).length;

  const projectOptions = useMemo(() => {
    const dailyWorkProjectIds = new Set(dailyWorkEntries.filter((d) => d.projectId).map((d) => d.projectId as string));
    const allProjectIds = new Set<string>([...projects.map((p) => p.id), ...dailyWorkProjectIds]);
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const result: { id: string; name: string; key: string; dailyWorkCount: number }[] = [];
    for (const pid of allProjectIds) {
      const p = projectMap.get(pid);
      const dailyCount = dailyWorkEntries.filter((d) => d.projectId === pid).length;
      result.push({
        id: pid,
        name: p?.name || "Unknown Project",
        key: p?.key || "",
        dailyWorkCount: dailyCount,
      });
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [projects, dailyWorkEntries]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === "__all__") return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const setView = (view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "dashboard") params.delete("view");
    else params.set("view", view);
    router.push(`/workspace-dashboard?${params.toString()}`);
  };

  const activeFilterCount = [statusFilter, priorityFilter, sprintFilter, assigneeFilter, labelFilter].filter(
    (f) => f !== "__all__"
  ).length + (searchQuery ? 1 : 0);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("__all__");
    setPriorityFilter("__all__");
    setSprintFilter("__all__");
    setAssigneeFilter("__all__");
    setLabelFilter("__all__");
  };

  const allStatuses = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => s.add(t.status));
    return Array.from(s);
  }, [tasks]);

  const sprintOptions = useMemo(() => {
    const s = new Map<string, { id: string; name: string }>();
    sprints.forEach((sp) => s.set(sp.id, { id: sp.id, name: sp.name }));
    return Array.from(s.values());
  }, [sprints]);

  const allAssignees = useMemo(() => {
    const a = new Map<string, { id: string; name: string }>();
    tasks.forEach((t) => {
      if (t.assignee) a.set(t.assignee.id, { id: t.assignee.id, name: t.assignee.name });
    });
    return Array.from(a.values());
  }, [tasks]);

  const renderProjectSelector = () => (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="appearance-none rounded-xl border border-border bg-card px-4 py-2.5 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm min-w-[200px]"
        >
          <option value="__all__">All Projects</option>
          {projectOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      <div className="flex items-center gap-1.5">
        {["dashboard", "sprints"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              (viewParam === v || (!searchParams.get("view") && v === "dashboard"))
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {v === "dashboard" ? "Dashboard" : "Sprints"}
          </button>
        ))}
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="appearance-none rounded-xl border border-border bg-card px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="__all__">Status</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="appearance-none rounded-xl border border-border bg-card px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="__all__">Priority</option>
          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={sprintFilter}
          onChange={(e) => setSprintFilter(e.target.value)}
          className="appearance-none rounded-xl border border-border bg-card px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[160px]"
        >
          <option value="__all__">Sprint</option>
          {sprintOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="appearance-none rounded-xl border border-border bg-card px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[160px]"
        >
          <option value="__all__">Assignee</option>
          {allAssignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <select
          value={labelFilter}
          onChange={(e) => setLabelFilter(e.target.value)}
          className="appearance-none rounded-xl border border-border bg-card px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[140px]"
        >
          <option value="__all__">Labels</option>
          {allLabels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );

  const renderStatsCards = () => {
    const stats = selectedProjectId === "__all__" ? [
      { icon: FolderKanban, label: "Total Projects", value: projects.length, color: "text-blue-600 bg-blue-50" },
      { icon: CheckSquare, label: "Total Tasks", value: totalTasks, color: "text-purple-600 bg-purple-50" },
      { icon: CheckCircle2, label: "Completed", value: completedTasks, color: "text-emerald-600 bg-emerald-50" },
      { icon: PlayCircle, label: "In Progress", value: inProgressTasks, color: "text-blue-600 bg-blue-50" },
      { icon: Clock, label: "Pending", value: pendingTasks, color: "text-amber-600 bg-amber-50" },
      { icon: AlertTriangle, label: "Overdue", value: overdueTasks, color: "text-red-600 bg-red-50" },
      { icon: Users, label: "Team Members", value: users.length, color: "text-indigo-600 bg-indigo-50" },
      { icon: GitBranch, label: "Active Sprints", value: sprints.filter((s) => s.status === "ACTIVE").length, color: "text-cyan-600 bg-cyan-50" },
    ] : [
      { icon: CheckSquare, label: "Total Tasks", value: selectedProject!.totalTasks, color: "text-purple-600 bg-purple-50" },
      { icon: CheckCircle2, label: "Completed", value: selectedProject!.completed, color: "text-emerald-600 bg-emerald-50" },
      { icon: PlayCircle, label: "In Progress", value: selectedProject!.inProgress, color: "text-blue-600 bg-blue-50" },
      { icon: AlertTriangle, label: "Overdue", value: selectedProject!.overdue, color: "text-red-600 bg-red-50" },
    ];

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {stats.map((s) => (
          <Card key={s.label} padding="sm" className="flex flex-col items-center text-center p-4">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color} mb-2`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>
    );
  };

  const renderProjectProgress = () => {
    if (selectedProjectId !== "__all__") return null;
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          Project Progress
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} href={`/project/${p.id}/board`}>
              <Card hover className="p-5 h-full">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{p.name}</p>
                    {p.key && <p className="text-xs text-muted-foreground mt-0.5">{p.key}</p>}
                  </div>
                  {p.activeSprint && <Badge variant="primary" size="sm">{p.activeSprint.name}</Badge>}
                </div>
                <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {p.completed}</span>
                  <span className="flex items-center gap-1"><PlayCircle className="h-3 w-3 text-blue-500" /> {p.inProgress}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> {p.pending}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      p.progress === 0 ? "bg-gray-300" : "bg-emerald-500"
                    }`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.progress}% complete</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.memberCount}</span>
                    <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {p.sprintCount}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderUnifiedBoard = () => (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
        {selectedProjectId === "__all__" ? "All Tasks" : `${selectedProject?.name || "Project"} Tasks`}
        <Badge variant="gray" size="sm">{filteredTasks.length}</Badge>
      </h2>

      {renderFilters()}

      {filteredTasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks found" description="No tasks match your current filters." />
      ) : (
        <div className="space-y-2">
          {filteredTasks.slice(0, 100).map((t) => (
            <Link key={t.id} href={`/project/${t.projectId}/board`}>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {t.projectName && (
                    <Badge variant="gray" size="sm" className="shrink-0">{t.projectName}</Badge>
                  )}
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{t.code || "TASK"}</span>
                  <span className="text-sm font-medium text-foreground truncate">{t.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${priorityColor(t.priority)}`}>
                    {t.priority}
                  </span>
                  {t.assignee && <Avatar name={t.assignee.name} size="sm" />}
                  {t.sprint && <Badge variant="info" size="sm">{t.sprint.name}</Badge>}
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(t.status)}`}>
                    {t.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {filteredTasks.length > 100 && (
            <p className="text-center text-sm text-muted-foreground py-2">
              Showing 100 of {filteredTasks.length} tasks
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderSprintView = () => {
    const sprintStatusFilter = searchParams.get("sprintStatus") || "__all__";
    let filteredByStatus = filteredSprints;
    if (sprintStatusFilter !== "__all__") {
      filteredByStatus = filteredByStatus.filter((s) => s.status === sprintStatusFilter);
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            Sprints
          </h2>
          <div className="flex items-center gap-2">
            {["__all__", "ACTIVE", "COMPLETED", "PLANNED"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (s === "__all__") params.delete("sprintStatus");
                  else params.set("sprintStatus", s);
                  router.push(`/workspace-dashboard?view=sprints&${params.toString()}`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sprintStatusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {s === "__all__" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {filteredByStatus.length === 0 ? (
          <EmptyState icon={GitBranch} title="No sprints found" description="No sprints match your current selection." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredByStatus.map((s) => {
              const sprintTasks = tasks.filter((t) => t.sprint?.id === s.id);
              const sprintDone = sprintTasks.filter((t) => DONE_COLUMNS.includes(t.status)).length;
              const sprintTotal = sprintTasks.length;
              const sprintPct = sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0;
              const remaining = sprintTotal - sprintDone;

              return (
                <Link key={s.id} href={`/project/${s.projectId}/sprint/${s.id}`}>
                  <Card hover className="p-5 h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{s.name}</p>
                        <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "COMPLETED" ? "gray" : "warning"} size="sm" className="mt-1">
                          {s.status}
                        </Badge>
                      </div>
                      <Badge variant="gray" size="sm">{s.projectName}</Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {s.startDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateShort(s.startDate)}
                        </span>
                      )}
                      {s.endDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateShort(s.endDate)}
                        </span>
                      )}
                    </div>

                    {sprintTotal > 0 && (
                      <div className="mb-3">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${sprintPct}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{sprintPct}% complete</span>
                      <div className="flex items-center gap-3">
                        <span>{remaining} remaining</span>
                        <span>{sprintDone} done</span>
                        <span>{sprintTotal} total</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCharts = () => {
    const statusData = useMemo(() => {
      const counts: Record<string, number> = {};
      const sourceTasks = selectedProjectId === "__all__" ? tasks : tasks.filter((t) => t.projectId === selectedProjectId);
      sourceTasks.forEach((t) => {
        counts[t.status] = (counts[t.status] || 0) + 1;
      });
      return Object.entries(counts).sort(([, a], [, b]) => b - a);
    }, [tasks, selectedProjectId]);

    const projectData = useMemo(() => {
      const counts: Record<string, number> = {};
      tasks.forEach((t) => {
        const name = t.projectName || "Unknown";
        counts[name] = (counts[name] || 0) + 1;
      });
      return Object.entries(counts).sort(([, a], [, b]) => b - a);
    }, [tasks]);

    const employeeWorkload = useMemo(() => {
      const counts: Record<string, { name: string; total: number; done: number }> = {};
      tasks.forEach((t) => {
        if (!t.assignee) return;
        if (!counts[t.assignee.id]) {
          counts[t.assignee.id] = { name: t.assignee.name, total: 0, done: 0 };
        }
        counts[t.assignee.id].total++;
        if (DONE_COLUMNS.includes(t.status)) counts[t.assignee.id].done++;
      });
      return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 10);
    }, [tasks]);

    const maxStatusCount = Math.max(...statusData.map(([, c]) => c), 1);
    const maxProjectCount = Math.max(...projectData.map(([, c]) => c), 1);
    const maxEmployeeCount = Math.max(...employeeWorkload.map((e) => e.total), 1);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Tasks by Status
          </h3>
          <div className="space-y-3">
            {statusData.map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-muted-foreground">{status}</span>
                  <span className="text-foreground">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      status === "Done" || status === "Released" || status === "Closed"
                        ? "bg-emerald-500"
                        : status === "In Progress"
                        ? "bg-blue-500"
                        : status === "Review"
                        ? "bg-amber-500"
                        : "bg-gray-400"
                    }`}
                    style={{ width: `${Math.round((count / maxStatusCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {statusData.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            Tasks by Project
          </h3>
          <div className="space-y-3">
            {projectData.map(([name, count]) => (
              <div key={name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-muted-foreground truncate">{name}</span>
                  <span className="text-foreground">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                    style={{ width: `${Math.round((count / maxProjectCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {projectData.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Workload by Employee
          </h3>
          <div className="space-y-3">
            {employeeWorkload.map((emp) => (
              <div key={emp.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-muted-foreground truncate">{emp.name}</span>
                  <span className="text-foreground">{emp.done}/{emp.total}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.round((emp.done / (emp.total || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {employeeWorkload.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Overdue Tasks
          </h3>
          {overdueTasks === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No overdue tasks</p>
          ) : (
            <div className="space-y-2">
              {tasks
                .filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !DONE_COLUMNS.includes(t.status))
                .slice(0, 10)
                .map((t) => (
                  <Link key={t.id} href={`/project/${t.projectId}/board`}>
                    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/50 transition-colors">
                      <AlertTriangle className="h-3.5 w-3.5 text-danger shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{t.title}</span>
                      {t.projectName && <Badge variant="gray" size="sm">{t.projectName}</Badge>}
                      {t.dueDate && <span className="text-xs text-danger shrink-0">{formatDate(t.dueDate)}</span>}
                    </div>
                  </Link>
                ))}
              {tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !DONE_COLUMNS.includes(t.status)).length > 10 && (
                <p className="text-xs text-muted-foreground text-center">Showing 10 of {overdueTasks}</p>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderDailyWorkByProject = () => {
    if (selectedProjectId === "__all__") return null;
    const projectEntries = dailyWorkEntries
      .filter((d) => d.projectId === selectedProjectId)
      .slice(0, 20);

    if (projectEntries.length === 0) return null;

    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Daily Work Entries
        </h3>
        <div className="space-y-3">
          {projectEntries.map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Avatar name={d.employeeName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{d.employeeName}</span>
                  <Badge variant={d.todayWorkCompleted === "YES" ? "success" : d.todayWorkCompleted === "PARTIALLY" ? "warning" : "danger"} size="sm">
                    {d.todayWorkCompleted}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{d.todayWork}</p>
                {d.tomorrowTask && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">Tomorrow:</span> {d.tomorrowTask}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">{formatDate(d.submittedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderIndividualProjectView = () => {
    if (!selectedProject) return null;
    const projectTabs = [
      { label: "Overview", href: `/project/${selectedProject.id}/overview` },
      { label: "Board", href: `/project/${selectedProject.id}/board` },
      { label: "Backlog", href: `/project/${selectedProject.id}/backlog` },
      { label: "Sprint", href: `/project/${selectedProject.id}/sprint` },
      { label: "Timeline", href: `/project/${selectedProject.id}/timeline` },
      { label: "Members", href: `/project/${selectedProject.id}/members` },
      { label: "Reports", href: `/project/${selectedProject.id}/reports` },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{selectedProject.name}</h1>
            <p className="text-sm text-muted-foreground">{selectedProject.key}</p>
          </div>
          <Link href={`/project/${selectedProject.id}/board`}>
            <Button variant="primary" size="sm">
              Open Project <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 flex-wrap border-b border-border pb-2">
          {projectTabs.map((tab) => (
            <Link key={tab.label} href={tab.href}>
              <span className="inline-block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                {tab.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card padding="sm" className="text-center p-4">
            <p className="text-2xl font-bold text-foreground">{selectedProject.totalTasks}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Tasks</p>
          </Card>
          <Card padding="sm" className="text-center p-4">
            <p className="text-2xl font-bold text-emerald-600">{selectedProject.completed}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </Card>
          <Card padding="sm" className="text-center p-4">
            <p className="text-2xl font-bold text-blue-600">{selectedProject.inProgress}</p>
            <p className="text-xs text-muted-foreground mt-1">In Progress</p>
          </Card>
          <Card padding="sm" className="text-center p-4">
            <p className="text-2xl font-bold text-red-600">{selectedProject.overdue}</p>
            <p className="text-xs text-muted-foreground mt-1">Overdue</p>
          </Card>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              selectedProject.progress === 0 ? "bg-gray-300" : "bg-emerald-500"
            }`}
            style={{ width: `${selectedProject.progress}%` }}
          />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {selectedProject.memberCount} members</span>
          <span className="flex items-center gap-1"><GitBranch className="h-4 w-4" /> {selectedProject.sprintCount} sprints</span>
          {selectedProject.activeSprint && (
            <Badge variant="success" size="sm">Active: {selectedProject.activeSprint.name}</Badge>
          )}
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {renderStatsCards()}
      {renderProjectProgress()}
      {renderCharts()}
      {renderUnifiedBoard()}
      {renderDailyWorkByProject()}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {selectedProject?.name || "Workspace Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedProjectId === "__all__"
              ? `Aggregated view across ${projects.length} projects`
              : `Project overview and management`
            }
          </p>
        </div>
      </div>

      {renderProjectSelector()}

      <AnimatePresence mode="wait">
        <motion.div
          key={viewParam + selectedProjectId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {viewParam === "sprints" ? renderSprintView() : renderDashboard()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
