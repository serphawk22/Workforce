"use client";

import { useState } from "react";
import type { EmployeeData } from "./page";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Mail,
  Clock,
  BarChart3,
  ListTodo,
  FolderKanban,
  Activity,
  MessageSquare,
  UserCircle,
  FileText,
  Send,
  GitBranch,
  Globe,
  ChevronDown,
  TrendingUp,
  CheckCircle,
  Circle,
  MinusCircle,
  AlertCircle,
} from "lucide-react";

const statusColors: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Review: "bg-amber-50 text-amber-700",
  Testing: "bg-purple-50 text-purple-700",
  Done: "bg-emerald-50 text-emerald-700",
  Blocked: "bg-red-50 text-red-700",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-50 text-blue-600",
  HIGH: "bg-amber-50 text-amber-600",
  CRITICAL: "bg-red-50 text-red-600",
};

const actionLabels: Record<string, { label: string; color: string }> = {
  created: { label: "Created", color: "bg-blue-50 text-blue-700" },
  assigned: { label: "Assigned", color: "bg-purple-50 text-purple-700" },
  reassigned: { label: "Reassigned", color: "bg-amber-50 text-amber-700" },
  status_changed: { label: "Status Changed", color: "bg-cyan-50 text-cyan-700" },
  work_update: { label: "Work Update", color: "bg-emerald-50 text-emerald-700" },
  subtask_created: { label: "Subtask Created", color: "bg-indigo-50 text-indigo-700" },
  subtask_status_changed: { label: "Subtask Updated", color: "bg-teal-50 text-teal-700" },
  comment_added: { label: "Comment Added", color: "bg-pink-50 text-pink-700" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-gray-500" />
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function ProductivityBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  let color = "bg-red-500";
  if (value >= 70) color = "bg-emerald-500";
  else if (value >= 40) color = "bg-amber-500";
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="flex items-center gap-2">
      <div className={`${h} w-full rounded-full bg-gray-200`}>
        <div className={`${h} rounded-full ${color} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 shrink-0">{value}%</span>
    </div>
  );
}

export function EmployeeDetailDrawer({ employee, onClose }: { employee: EmployeeData; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAllTasks, setShowAllTasks] = useState(false);

  const overdueCount = employee.tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Done"
  ).length;

  const priorityBreakdown = {
    LOW: employee.tasks.filter((t) => t.priority === "LOW").length,
    MEDIUM: employee.tasks.filter((t) => t.priority === "MEDIUM").length,
    HIGH: employee.tasks.filter((t) => t.priority === "HIGH").length,
    CRITICAL: employee.tasks.filter((t) => t.priority === "CRITICAL").length,
  };

  const statusBreakdown = {
    "To Do": employee.tasks.filter((t) => t.status === "To Do").length,
    "In Progress": employee.tasks.filter((t) => t.status === "In Progress").length,
    Review: employee.tasks.filter((t) => t.status === "Review").length,
    Testing: employee.tasks.filter((t) => t.status === "Testing").length,
    Done: employee.tasks.filter((t) => t.status === "Done").length,
    Blocked: employee.tasks.filter((t) => t.status === "Blocked").length,
  };

  const visibleTasks = showAllTasks ? employee.tasks : employee.tasks.slice(0, 10);
  const displayTasks = employee.tasks.length > 10 && !showAllTasks;

  const taskCompletionRate = employee.totalTasks > 0 ? Math.round((employee.completedTasks / employee.totalTasks) * 100) : 0;
  const onTimeCompletion = employee.totalTasks > 0
    ? Math.round(((employee.totalTasks - employee.overdueTasks) / employee.totalTasks) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-gray-900/20" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white border-l border-gray-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Avatar name={employee.name} url={employee.avatarUrl} size="md" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">{employee.name}</h2>
              <p className="text-xs text-gray-500">{employee.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-5">
          {[
            { id: "overview", label: "Overview" },
            { id: "tasks", label: "Tasks" },
            { id: "projects", label: "Projects" },
            { id: "daily-sheets", label: "Daily Sheets" },
            { id: "updates", label: "Updates" },
            { id: "activity", label: "Activity" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto" style={{ height: "calc(100vh - 140px)" }}>
          <div className="p-5 space-y-6">
            {activeTab === "overview" && (
              <>
                <div className="rounded-xl border border-gray-200 p-4">
                  <SectionHeader icon={UserCircle} title="Profile" />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Role</span>
                      <p className="font-medium text-gray-900">{employee.role}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Manager</span>
                      <p className="font-medium text-gray-900">{employee.manager || "-"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Joining Date</span>
                      <p className="font-medium text-gray-900">{formatDate(employee.joiningDate)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Employment Type</span>
                      <p className="font-medium text-gray-900">{employee.employmentType || "-"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Work Location</span>
                      <p className="font-medium text-gray-900">{employee.workLocation || "-"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <a href={`mailto:${employee.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <Mail className="h-3 w-3" />
                      Send Email
                    </a>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <SectionHeader icon={BarChart3} title="Task Summary" />
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Assigned", value: employee.totalTasks, color: "text-gray-900" },
                      { label: "Completed", value: employee.completedTasks, color: "text-emerald-600" },
                      { label: "In Progress", value: employee.inProgressTasks, color: "text-blue-600" },
                      { label: "Overdue", value: employee.overdueTasks, color: employee.overdueTasks > 0 ? "text-red-600" : "text-gray-500" },
                    ].map((item) => (
                      <div key={item.label} className="text-center rounded-lg bg-gray-50 p-3">
                        <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-gray-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {Object.entries(statusBreakdown).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[status] || "bg-gray-100 text-gray-600"}`}>{status}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Priority Breakdown</p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(priorityBreakdown).map(([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityColors[priority] || "bg-gray-100 text-gray-600"}`}>{priority}</span>
                          <span className="text-xs font-semibold text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <SectionHeader icon={TrendingUp} title="Productivity" />
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Task Completion</span>
                        <span className="text-xs font-medium text-gray-700">{taskCompletionRate}%</span>
                      </div>
                      <ProductivityBar value={taskCompletionRate} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">On-time Completion</span>
                        <span className="text-xs font-medium text-gray-700">{onTimeCompletion}%</span>
                      </div>
                      <ProductivityBar value={onTimeCompletion} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">{employee.totalTasks > 0 ? (employee.completedTasks / (employee.totalTasks || 1)).toFixed(1) : "0"}</p>
                        <p className="text-xs text-gray-500">Avg Daily Tasks</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">{employee.hoursLogged.toFixed(1)}h</p>
                        <p className="text-xs text-gray-500">Avg Hours Logged</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <SectionHeader icon={FileText} title="Daily Sheets" />
                  <p className="text-sm text-gray-900 font-medium">{employee.dailySheets.length} sheets submitted</p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <SectionHeader icon={Activity} title="Admin Actions" />
                  <div className="flex flex-wrap gap-2">
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <ListTodo className="h-3.5 w-3.5" />
                      Assign Task
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <FolderKanban className="h-3.5 w-3.5" />
                      Assign Project
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Leave Feedback
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <FileText className="h-3.5 w-3.5" />
                      Add Note
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <Send className="h-3.5 w-3.5" />
                      Send Reminder
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <Mail className="h-3.5 w-3.5" />
                      Message
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "tasks" && (
              <div className="rounded-xl border border-gray-200 p-4">
                <SectionHeader icon={ListTodo} title="Assigned Tasks" />
                {employee.tasks.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No tasks assigned</p>
                ) : (
                  <div className="space-y-1">
                    {visibleTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColors[task.status] || "bg-gray-100 text-gray-600"}`}>
                          {task.status}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-500">{task.code ? `#${task.code}` : ""}</span>
                            <span className="text-sm text-gray-900 truncate">{task.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{task.projectName}</span>
                            {task.sprintName && <span>· {task.sprintName}</span>}
                            {task.dueDate && (
                              <span className={new Date(task.dueDate) < new Date() && task.status !== "Done" ? "text-red-500" : ""}>
                                · Due {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityColors[task.priority] || "bg-gray-100 text-gray-600"}`}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                    {displayTasks && (
                      <button
                        onClick={() => setShowAllTasks(true)}
                        className="flex items-center justify-center gap-1 w-full rounded-lg py-2 text-xs text-gray-500 hover:bg-gray-50"
                      >
                        <ChevronDown className="h-3 w-3" />
                        Show all {employee.tasks.length} tasks
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "projects" && (
              <div className="rounded-xl border border-gray-200 p-4">
                <SectionHeader icon={FolderKanban} title="Assigned Projects" />
                {employee.projects.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No projects assigned</p>
                ) : (
                  <div className="space-y-3">
                    {employee.projects.map((project) => (
                      <div key={project.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{project.name}</p>
                            <p className="text-xs text-gray-500">{project.key} · {project.taskCount} tasks</p>
                          </div>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{project.role}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Last activity: {timeAgo(project.lastActivity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "daily-sheets" && (
              <div className="rounded-xl border border-gray-200 p-4">
                <SectionHeader icon={FileText} title="Daily Sheet Submissions" />
                {employee.dailySheets.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No daily sheets submitted</p>
                ) : (
                  <div className="space-y-3">
                    {employee.dailySheets.map((ds) => {
                      const yesterdayPlan = (() => { try { return JSON.parse(ds.yesterdayPlan || "[]"); } catch { return []; } })();
                      const yesterdayStatuses = (() => {
                        try {
                          const raw = JSON.parse(ds.yesterdayCompleted || "[]");
                          if (Array.isArray(raw)) {
                            const map: Record<string, string> = {};
                            for (const item of raw) {
                              if (typeof item === "string") map[item] = "COMPLETED";
                              else if (item.task) map[item.task] = item.status || "COMPLETED";
                            }
                            return map;
                          }
                        } catch {}
                        return {};
                      })();
                      return (
                        <div key={ds.id} className="rounded-lg border border-gray-100 p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-400">
                                  {new Date(ds.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                  {ds.taskCode ? `#${ds.taskCode}` : "Sheet"}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 mt-0.5">{ds.taskTitle || ds.projectName || "Daily Work"}</p>
                            </div>
                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ds.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : ds.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" : ds.status === "BLOCKED" ? "bg-red-50 text-red-700" : ds.status === "NEED_REVIEW" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                                {ds.status ? ds.status.replace(/_/g, " ") : "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm text-gray-700">
                            <p><span className="font-medium">Today:</span> {ds.todayWork}</p>
                            {ds.blockers && <p><span className="font-medium">Blockers:</span> {ds.blockers}</p>}
                            <p><span className="font-medium">Tomorrow:</span> {ds.tomorrowTask}</p>
                            <p><span className="font-medium">Completed:</span> {ds.todayWorkCompleted === "YES" ? "Yes" : ds.todayWorkCompleted === "PARTIALLY" ? "Partially" : ds.todayWorkCompleted === "NO" ? "No" : ds.todayWorkCompleted || "-"}</p>
                            {(() => {
                              try {
                                const links = JSON.parse(ds.referenceLinks || "[]") as { type: string; url: string }[];
                                if (!Array.isArray(links) || links.length === 0) return null;
                                return (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {links.map((link, i) => (
                                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                        {link.type === "github" || link.url.includes("github") ? <GitBranch className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                        {link.type || "Link"}
                                      </a>
                                    ))}
                                  </div>
                                );
                              } catch { return null; }
                            })()}
                            {yesterdayPlan.length > 0 && (
                              <div>
                                <span className="font-medium">Yesterday:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {yesterdayPlan.map((task: string, i: number) => {
                                    const status = yesterdayStatuses[task] || "NOT_COMPLETED";
                                    const statusColor = status === "COMPLETED" ? "text-emerald-600" : status === "PARTIALLY" ? "text-amber-600" : "text-red-500";
                                    const statusIcon = status === "COMPLETED" ? <CheckCircle className="h-3 w-3" /> : status === "PARTIALLY" ? <MinusCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />;
                                    return (
                                      <span key={i} className={`inline-flex items-center gap-1 text-xs ${statusColor}`}>
                                        {statusIcon}
                                        {task}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "updates" && (
              <div className="rounded-xl border border-gray-200 p-4">
                <SectionHeader icon={Clock} title="Recent Work Updates" />
                {employee.workUpdates.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No work updates submitted</p>
                ) : (
                  <div className="space-y-3">
                    {employee.workUpdates.slice(0, 20).map((wu) => (
                      <div key={wu.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{wu.taskTitle}</p>
                            <p className="text-xs text-gray-500">{wu.projectName} · {formatDateTime(wu.date)}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColors[wu.status] || "bg-gray-100 text-gray-600"}`}>
                              {wu.status}
                            </span>
                            <span className="text-xs text-gray-500">{wu.timeSpent > 0 ? `${(wu.timeSpent / 60).toFixed(1)}h` : ""}</span>
                          </div>
                        </div>
                        {wu.subtaskTitle && (
                          <p className="text-xs text-gray-500 mb-1">Subtask: {wu.subtaskTitle}</p>
                        )}
                        {wu.workSummary && (
                          <p className="text-sm text-gray-600 mb-1">{wu.workSummary}</p>
                        )}
                        {wu.progressNotes && (
                          <p className="text-xs text-gray-500 italic">{wu.progressNotes}</p>
                        )}
                        {(wu.githubLink || wu.productionUrl) && (
                          <div className="flex items-center gap-3 mt-1">
                            {wu.githubLink && (
                              <a href={wu.githubLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <GitBranch className="h-3 w-3" />
                                GitHub
                              </a>
                            )}
                            {wu.productionUrl && (
                              <a href={wu.productionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <Globe className="h-3 w-3" />
                                Production
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="rounded-xl border border-gray-200 p-4">
                <SectionHeader icon={Activity} title="Activity Timeline" />
                {employee.activityLog.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No activity recorded</p>
                ) : (
                  <div className="space-y-2">
                    {employee.activityLog.map((log) => {
                      const actionStyle = actionLabels[log.action] || { label: log.action, color: "bg-gray-100 text-gray-600" };
                      return (
                        <div key={log.id} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 shrink-0 mt-0.5">
                            <Activity className="h-3 w-3 text-gray-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${actionStyle.color}`}>
                                {actionStyle.label}
                              </span>
                              <span className="text-xs text-gray-500">{timeAgo(log.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-0.5 truncate">{log.taskTitle}</p>
                            {(log.oldValue || log.newValue) && (
                              <p className="text-xs text-gray-500">
                                {log.oldValue && <span className="line-through">{log.oldValue}</span>}
                                {log.oldValue && log.newValue && <span> → </span>}
                                {log.newValue && <span>{log.newValue}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
