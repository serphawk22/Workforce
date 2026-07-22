"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Columns3,
  GitBranch,
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  ArrowUpRight,
  BarChart3,
  ListChecks,
  Search,
  Activity,
  Settings,
  ChevronRight,
  ChevronLeft,
  PieChart,
  TrendingUp,
  UserCheck,
  AlertCircle,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Project = { id: string; name: string; key: string };
type Employee = { id: string; name: string; avatarUrl: string | null };
type ColumnInfo = { id: string; name: string; board: { projectId: string } };
type ActivityLog = {
  id: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  user: { id: string; name: string; avatarUrl: string | null };
  task: { id: string; title: string; code: string | null };
};
type WorkUpdateInfo = { id: string; userId: string; timeSpent: number; createdAt: Date; task: { assigneeId: string | null } | null };

type SprintData = {
  id: string;
  name: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  project: { id: string; name: string; key: string };
  tasks: { id: string; column: { name: string } }[];
};

type TaskData = {
  id: string;
  title: string;
  code: string | null;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  column: { id: string; name: string; board: { projectId: string; project: { id: string; name: string; key: string } } };
  labels: { label: { id: string; name: string; color: string } }[];
  sprint: { id: string; name: string; status: string; startDate: Date | null; endDate: Date | null } | null;
};

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-gray-400",
};

const statusBadgeVariants: Record<string, "success" | "info" | "warning" | "default" | "danger"> = {
  Done: "success",
  "In Progress": "info",
  Review: "warning",
  Testing: "info",
  "To Do": "default",
  Blocked: "danger",
};

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

function StatCard({ icon, label, value, color, trend }: { icon: React.ReactNode; label: string; value: number | string; color: string; trend?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    indigo: "bg-indigo-500/10 text-indigo-500",
    green: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-red-500/10 text-red-500",
    purple: "bg-purple-500/10 text-purple-500",
    cyan: "bg-cyan-500/10 text-cyan-500",
    pink: "bg-pink-500/10 text-pink-500",
  };
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/20">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-transparent opacity-[0.03]" />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {trend && <p className="text-[11px] text-muted-foreground">{trend}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-border/50 ${colors[color] || "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ProjectProgressCard({ project, tasks }: { project: Project; tasks: TaskData[] }) {
  const projectTasks = tasks.filter((t) => t.column.board.projectId === project.id);
  const total = projectTasks.length;
  const completed = projectTasks.filter((t) => t.column.name === "Done").length;
  const inProgress = projectTasks.filter((t) => t.column.name === "In Progress").length;
  const pending = projectTasks.filter((t) => t.column.name === "To Do").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const assigneeIds = [...new Set(projectTasks.filter((t) => t.assignee).map((t) => t.assignee!.id))];
  const sprintNames = [...new Set(projectTasks.filter((t) => t.sprint).map((t) => t.sprint!.name))];

  return (
    <Link href={`/project/${project.id}`} className="block group">
      <div className="rounded-xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{project.name}</p>
              <p className="text-xs text-muted-foreground">{project.key} · {total} tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold text-foreground tabular-nums">{pct}%</span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="mb-3">
          <div className="flex h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3 text-emerald-500" />{completed}</span>
          <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3 text-blue-500" />{inProgress}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" />{pending}</span>
        </div>
        <div className="flex items-center justify-between">
          {sprintNames.length > 0 && (
            <Badge variant="default" size="sm" className="text-[10px]">{sprintNames[0]}</Badge>
          )}
          {assigneeIds.length > 0 && (
            <div className="flex -space-x-2 ml-auto">
              {assigneeIds.slice(0, 4).map((id) => (
                <div key={id} className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                  {id.charAt(0).toUpperCase()}
                </div>
              ))}
              {assigneeIds.length > 4 && (
                <div className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                  +{assigneeIds.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function TaskCard({ task }: { task: TaskData }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer group">
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityColors[task.priority] || "bg-muted-foreground"}`} title={task.priority} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant="gray" size="sm" className="text-[10px] font-mono shrink-0">
            {task.column.board.project.key || "PRJ"}
          </Badge>
          <span className="text-xs font-mono text-muted-foreground shrink-0">{task.code ? `#${task.code}` : ""}</span>
          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.sprint && (
            <span className="shrink-0 flex items-center gap-1">
              <Calendar className="h-3 w-3" />{task.sprint.name}
            </span>
          )}
          {task.dueDate && (
            <span className={`shrink-0 ${new Date(task.dueDate) < new Date() && task.column.name !== "Done" ? "text-red-500 font-medium" : ""}`}>
              Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.labels.slice(0, 1).map((tl) => (
          <span key={tl.label.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tl.label.color + "20", color: tl.label.color }}>
            {tl.label.name}
          </span>
        ))}
        <Badge variant={statusBadgeVariants[task.column.name] || "default"} size="sm">
          {task.column.name}
        </Badge>
        {task.assignee && <Avatar name={task.assignee.name} url={task.assignee.avatarUrl} size="sm" />}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
        active
          ? "border-primary/40 bg-primary/5 text-primary"
          : "border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
      }`}
    >
      {label}
      {active && <X className="h-3 w-3" onClick={(e) => { e.stopPropagation(); onClick(); }} />}
    </button>
  );
}

export function WorkspaceDashboardClient({
  projects,
  tasks,
  sprints,
  employees,
  columns,
  activityLogs,
  workUpdates,
}: {
  projects: Project[];
  tasks: TaskData[];
  sprints: SprintData[];
  employees: Employee[];
  columns: ColumnInfo[];
  activityLogs: ActivityLog[];
  workUpdates: WorkUpdateInfo[];
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProject, setSelectedProject] = useState("all");
  const [activeSection, setActiveSection] = useState("overview");
  const [sprintFilter, setSprintFilter] = useState<string>("all");
  const [boardFilters, setBoardFilters] = useState({ status: "", priority: "", search: "", assignee: "", project: "", sprint: "" });
  const [showFilters, setShowFilters] = useState(false);

  const now = new Date();

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (selectedProject !== "all") result = result.filter((t) => t.column.board.projectId === selectedProject);
    if (boardFilters.project) result = result.filter((t) => t.column.board.projectId === boardFilters.project);
    if (boardFilters.status) result = result.filter((t) => t.column.name === boardFilters.status);
    if (boardFilters.priority) result = result.filter((t) => t.priority === boardFilters.priority);
    if (boardFilters.assignee) result = result.filter((t) => t.assignee?.id === boardFilters.assignee);
    if (boardFilters.sprint) result = result.filter((t) => t.sprint?.id === boardFilters.sprint);
    if (boardFilters.search) {
      const q = boardFilters.search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || (t.code && t.code.toLowerCase().includes(q)) || t.column.board.project.name.toLowerCase().includes(q));
    }
    return result;
  }, [tasks, selectedProject, boardFilters]);

  const filteredSprints = useMemo(() => {
    let result = [...sprints];
    if (selectedProject !== "all") result = result.filter((s) => s.project.id === selectedProject);
    if (sprintFilter === "active") result = result.filter((s) => s.status === "ACTIVE");
    else if (sprintFilter === "upcoming") result = result.filter((s) => s.status === "UPCOMING");
    else if (sprintFilter === "completed") result = result.filter((s) => s.status === "COMPLETED");
    return result;
  }, [sprints, selectedProject, sprintFilter]);

  const stats = useMemo(() => {
    const ts = selectedProject === "all" ? tasks : tasks.filter((t) => t.column.board.projectId === selectedProject);
    const ps = selectedProject === "all" ? projects : projects.filter((p) => p.id === selectedProject);
    const completed = ts.filter((t) => t.column.name === "Done").length;
    const inProgress = ts.filter((t) => t.column.name === "In Progress").length;
    const pending = ts.filter((t) => t.column.name === "To Do").length;
    const overdue = ts.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.column.name !== "Done").length;
    const activeSprints = filteredSprints.filter((s) => s.status === "ACTIVE").length;
    const uniqueEmployees = new Set(ts.filter((t) => t.assignee).map((t) => t.assignee!.id)).size;
    return { totalProjects: ps.length, totalTasks: ts.length, completed, inProgress, pending, overdue, activeSprints, uniqueEmployees };
  }, [tasks, projects, selectedProject, filteredSprints, now]);

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of filteredTasks) {
      counts[t.column.name] = (counts[t.column.name] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTasks]);

  const projectChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    const ts = selectedProject === "all" ? tasks : tasks.filter((t) => t.column.board.projectId === selectedProject);
    for (const t of ts) {
      const name = t.column.board.project.name;
      counts[name] = (counts[name] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [tasks, selectedProject]);

  const workloadChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (t.assignee && t.column.name !== "Done") {
        counts[t.assignee.name] = (counts[t.assignee.name] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const sprintProgressData = useMemo(() => {
    return filteredSprints.map((s) => {
      const total = s.tasks.length;
      const done = s.tasks.filter((t) => t.column.name === "Done").length;
      return { name: s.name, completed: done, remaining: total - done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    }).sort((a, b) => b.pct - a.pct);
  }, [filteredSprints]);

  const overdueList = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate && new Date(t.dueDate) < now && t.column.name !== "Done")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 10);
  }, [tasks, now]);

  const sidebarNav = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "board", label: "All Tasks", icon: CheckSquare },
    { id: "sprints", label: "Sprints", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "employees", label: "Employees", icon: Users },
  ];

  const allSprints = useMemo(() => {
    const result = [...sprints];
    if (selectedProject !== "all") return result.filter((s) => s.project.id === selectedProject);
    return result;
  }, [sprints, selectedProject]);

  const handleProjectChange = (id: string) => {
    setSelectedProject(id);
    setActiveSection("overview");
  };

  if (selectedProject !== "all" && activeSection !== "overview" && activeSection !== "projects" && activeSection !== "board" && activeSection !== "sprints" && activeSection !== "analytics" && activeSection !== "activity") {
    const project = projects.find((p) => p.id === selectedProject);
    if (project) {
      return (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setSelectedProject("all")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> All Projects
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-semibold text-foreground">{project.name}</span>
          </div>
          <ProjectTabs projectId={selectedProject} />
        </div>
      );
    }
  }

  return (
    <div className="flex gap-0">
      <aside className={`shrink-0 transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-56"}`}>
        <div className="sticky top-6 space-y-1">
          <div className="flex items-center justify-between px-3 py-2 mb-2">
            {!sidebarCollapsed && <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Workspace</span>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          {sidebarNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                activeSection === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 py-4 bg-background/80 backdrop-blur-sm border-b border-border mb-6 -mx-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {selectedProject !== "all" ? projects.find((p) => p.id === selectedProject)?.name : "Workspace Dashboard"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedProject !== "all" ? "Project overview and management" : "Manage all projects from one place"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedProject}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[180px]"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.key ? `${p.key} - ` : ""}{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {activeSection === "overview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard icon={<FolderKanban className="h-4 w-4" />} label="Total Projects" value={stats.totalProjects} color="blue" />
              <StatCard icon={<CheckSquare className="h-4 w-4" />} label="Total Tasks" value={stats.totalTasks} color="indigo" />
              <StatCard icon={<CheckSquare className="h-4 w-4" />} label="Completed" value={stats.completed} color="green" trend={stats.totalTasks > 0 ? `${Math.round((stats.completed / stats.totalTasks) * 100)}% completion` : undefined} />
              <StatCard icon={<BarChart3 className="h-4 w-4" />} label="In Progress" value={stats.inProgress} color="cyan" />
              <StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={stats.pending} color="amber" />
              <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Overdue" value={stats.overdue} color="red" />
              <StatCard icon={<GitBranch className="h-4 w-4" />} label="Active Sprints" value={stats.activeSprints} color="purple" />
              <StatCard icon={<Users className="h-4 w-4" />} label="Team Members" value={stats.uniqueEmployees} color="pink" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground">Projects</h2>
                  <Link href="/admin/all-projects" className="text-xs text-primary hover:underline flex items-center gap-1">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                {projects.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No projects yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create a project to get started</p>
                  </div>
                ) : selectedProject !== "all" ? (
                  <ProjectProgressCard project={projects.find((p) => p.id === selectedProject)!} tasks={tasks} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projects.map((project) => (
                      <ProjectProgressCard key={project.id} project={project} tasks={tasks} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground mb-4">Tasks by Status</h2>
                <div className="rounded-xl border border-border bg-card p-5">
                  {statusChartData.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <RePieChart>
                        <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                          {statusChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="mt-3 space-y-1.5">
                    {statusChartData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {d.name}
                        </span>
                        <span className="font-medium text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-4">Tasks by Project</h2>
                <div className="rounded-xl border border-border bg-card p-5">
                  {projectChartData.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={projectChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground mb-4">Sprint Progress</h2>
                {sprintProgressData.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No active sprints</p>
                    <p className="text-xs text-muted-foreground mt-1">Sprint data will appear here</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="space-y-4">
                      {sprintProgressData.map((s) => (
                        <div key={s.name}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-foreground truncate">{s.name}</span>
                            <span className="text-muted-foreground">{s.completed}/{s.completed + s.remaining} ({s.pct}%)</span>
                          </div>
                          <div className="flex h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${s.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-4">Overdue Tasks</h2>
                {overdueList.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <CheckSquare className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No overdue tasks</p>
                    <p className="text-xs text-muted-foreground mt-1">All tasks are on track</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
                    {overdueList.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.column.board.project.name} · Due {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                          </p>
                        </div>
                        <Badge variant="danger" size="sm">Overdue</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h2>
                {activityLogs.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No activity yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Activity appears here as work happens</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card divide-y divide-border/50 max-h-[320px] overflow-y-auto">
                    {activityLogs.slice(0, 15).map((log) => (
                      <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar name={log.user.name} url={log.user.avatarUrl} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground">
                            <span className="font-medium">{log.user.name}</span>
                            <span className="text-muted-foreground"> {log.action.replace("_", " ")} </span>
                            <span className="font-medium truncate">{log.task?.title || ""}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">{timeAgo(log.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === "projects" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-sm font-semibold text-foreground">All Projects</h2>
            {projects.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-16 text-center">
                <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No projects found</p>
                <p className="text-xs text-muted-foreground mt-1">Projects will appear here once created</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedProject === "all" ? projects : projects.filter((p) => p.id === selectedProject)).map((project) => (
                  <ProjectProgressCard key={project.id} project={project} tasks={tasks} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "board" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="sticky top-[72px] z-20 -mx-6 px-6 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={boardFilters.search}
                    onChange={(e) => setBoardFilters((f) => ({ ...f, search: e.target.value }))}
                    placeholder="Search tasks..."
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${showFilters ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                </button>
              </div>
              {showFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
                  <select value={boardFilters.project} onChange={(e) => setBoardFilters((f) => ({ ...f, project: e.target.value }))} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Projects</option>
                    {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <select value={boardFilters.sprint} onChange={(e) => setBoardFilters((f) => ({ ...f, sprint: e.target.value }))} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Sprints</option>
                    {sprints.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                  <select value={boardFilters.status} onChange={(e) => setBoardFilters((f) => ({ ...f, status: e.target.value }))} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Status</option>
                    {["To Do", "In Progress", "Review", "Testing", "Done", "Blocked"].map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                  <select value={boardFilters.priority} onChange={(e) => setBoardFilters((f) => ({ ...f, priority: e.target.value }))} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Priority</option>
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                  <select value={boardFilters.assignee} onChange={(e) => setBoardFilters((f) => ({ ...f, assignee: e.target.value }))} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Assignees</option>
                    {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
                  </select>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</p>
                {Object.values(boardFilters).some(Boolean) && (
                  <button onClick={() => setBoardFilters({ status: "", priority: "", search: "", assignee: "", project: "", sprint: "" })} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <X className="h-3 w-3" /> Clear filters
                  </button>
                )}
              </div>
              {filteredTasks.length === 0 ? (
                <div className="p-16 text-center">
                  <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No tasks found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "sprints" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "All Sprints" },
                { id: "active", label: "Current Sprint" },
                { id: "upcoming", label: "Upcoming" },
                { id: "completed", label: "Completed" },
              ].map((f) => (
                <FilterChip key={f.id} label={f.label} active={sprintFilter === f.id} onClick={() => setSprintFilter(sprintFilter === f.id ? "all" : f.id)} />
              ))}
            </div>

            {filteredSprints.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No sprints found</p>
                <p className="text-xs text-muted-foreground mt-1">Sprints will appear here once created</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSprints.map((sprint) => {
                  const total = sprint.tasks.length;
                  const completed = sprint.tasks.filter((t) => t.column.name === "Done").length;
                  const remaining = total - completed;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                  const startMs = sprint.startDate ? new Date(sprint.startDate).getTime() : 0;
                  const endMs = sprint.endDate ? new Date(sprint.endDate).getTime() : 0;
                  const totalDays = endMs > startMs ? Math.ceil((endMs - startMs) / 86400000) : 1;
                  const elapsedDays = startMs > 0 ? Math.ceil((Date.now() - startMs) / 86400000) : 0;
                  const burndownPct = Math.min(Math.round((elapsedDays / totalDays) * 100), 100);
                  const idealBurndown = total > 0 ? Math.round(remaining - (remaining * (burndownPct / 100))) : 0;

                  return (
                    <div key={sprint.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{sprint.name}</p>
                            <Badge variant={sprint.status === "ACTIVE" ? "success" : sprint.status === "UPCOMING" ? "info" : "default"} size="sm">
                              {sprint.status === "ACTIVE" ? "Active" : sprint.status === "UPCOMING" ? "Upcoming" : "Completed"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{sprint.project.name}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3 text-emerald-500" />{completed} done</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" />{remaining} remaining</span>
                          <span className="font-medium text-foreground">{pct}%</span>
                        </div>
                      </div>

                      {sprint.status === "ACTIVE" && sprint.startDate && sprint.endDate && (
                        <div className="mb-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-muted-foreground">Burndown</span>
                            <span className="font-medium text-foreground">{remaining} remaining</span>
                          </div>
                          <div className="flex h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${burndownPct}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                            <span>{sprint.startDate ? new Date(sprint.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                            <span>{sprint.endDate ? new Date(sprint.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          {sprint.startDate && <span>Start: {new Date(sprint.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                          {sprint.endDate && <span>End: {new Date(sprint.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                        </div>
                        <Link href={`/project/${sprint.project.id}/sprint/${sprint.id}`} className="text-primary hover:underline flex items-center gap-0.5">
                          View <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {sprintProgressData.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Sprint Comparison</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sprintProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="remaining" name="Remaining" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeSection === "analytics" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><PieChart className="h-4 w-4 text-muted-foreground" /> Tasks by Status</h3>
                {statusChartData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="value" label>
                        {statusChartData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" /> Tasks by Project</h3>
                {projectChartData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Workload by Employee</h3>
                {workloadChartData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={workloadChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Sprint Progress</h3>
                {sprintProgressData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No sprint data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sprintProgressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="remaining" name="Remaining" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === "activity" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            {activityLogs.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-16 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground mt-1">Project activity will appear here</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <Avatar name={log.user.name} url={log.user.avatarUrl} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{log.user.name}</span>
                        <span className="text-muted-foreground"> {(log.action || "").replace(/_/g, " ")} </span>
                        <span className="font-medium">{log.task?.title || ""}</span>
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{timeAgo(log.createdAt)}</span>
                        {log.newValue && <Badge variant="default" size="sm">{log.newValue}</Badge>}
                      </div>
                    </div>
                    {log.task?.code && <span className="text-xs font-mono text-muted-foreground shrink-0">#{log.task.code}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "employees" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
              <p className="text-xs text-muted-foreground">{employees.length} members</p>
            </div>
            {employees.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No employees</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.map((emp) => {
                  const empTasks = tasks.filter((t) => t.assignee?.id === emp.id);
                  const total = empTasks.length;
                  const done = empTasks.filter((t) => t.column.name === "Done").length;
                  const inProg = empTasks.filter((t) => t.column.name === "In Progress").length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const empHours = workUpdates.filter((wu) => wu.userId === emp.id).reduce((s, w) => s + w.timeSpent, 0);
                  return (
                    <Link key={emp.id} href={`/team/${emp.id}`} className="block group">
                      <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar name={emp.name} url={emp.avatarUrl} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{total} tasks · {(empHours / 60).toFixed(1)}h logged</p>
                          </div>
                        </div>
                        <div className="flex h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
                          <span>{done}/{total} done</span>
                          <span>{inProg} in progress</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectTabs({ projectId }: { projectId: string }) {
  const tabs = [
    { id: "overview", label: "Overview", href: `/project/${projectId}` },
    { id: "board", label: "Board", href: `/project/${projectId}/board` },
    { id: "backlog", label: "Backlog", href: `/project/${projectId}/backlog` },
    { id: "timeline", label: "Timeline", href: `/project/${projectId}/timeline` },
    { id: "members", label: "Members", href: `/project/${projectId}/members` },
    { id: "settings", label: "Settings", href: `/project/${projectId}/settings` },
  ];
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex border-b border-border bg-muted/30 px-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className="shrink-0 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-b-2 border-transparent hover:border-primary/30"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="p-8 text-center text-sm text-muted-foreground">
        Select a tab above to view project details
      </div>
    </div>
  );
}
