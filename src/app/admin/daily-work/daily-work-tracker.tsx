"use client";

import { useState, useEffect, useMemo } from "react";
import { getDailyWorkEntries } from "@/actions/daily-work";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink, GitBranch, Globe, Check } from "lucide-react";

type Employee = { id: string; name: string; email: string; department: string | null };
type Project = { id: string; name: string; key: string };

type Entry = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeAvatar: string | null;
  employeeDepartment: string | null;
  projectName: string | null;
  projectKey: string | null;
  taskTitle: string | null;
  taskCode: string | null;
  todayWork: string;
  todayWorkCompleted: string;
  yesterdayPlan: string | null;
  yesterdayCompleted: string | null;
  tomorrowTask: string;
  status: string;
  blockers: string | null;
  referenceLinks: string | null;
  attachments: string | null;
  submittedAt: string;
};

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  BLOCKED: "bg-red-50 text-red-700 border-red-200",
  NEED_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
};

const completionColors: Record<string, string> = {
  YES: "bg-emerald-50 text-emerald-700",
  PARTIALLY: "bg-amber-50 text-amber-700",
  NO: "bg-red-50 text-red-700",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DailyWorkTracker({ employees, projects }: { employees: Employee[]; projects: Project[] }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    const result = await getDailyWorkEntries();
    setEntries(result);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let result = [...entries];
    if (employeeFilter) result = result.filter((e) => e.employeeName === employeeFilter);
    if (projectFilter) result = result.filter((e) => e.projectName === projectFilter);
    if (statusFilter) result = result.filter((e) => e.status === statusFilter);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((e) => new Date(e.submittedAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      result = result.filter((e) => new Date(e.submittedAt).getTime() <= to);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(q) ||
          e.todayWork.toLowerCase().includes(q) ||
          e.tomorrowTask.toLowerCase().includes(q) ||
          (e.taskTitle && e.taskTitle.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, employeeFilter, projectFilter, statusFilter, dateFrom, dateTo, search]);

  const paginated = filtered.slice(0, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getYesterdayComparison(entry: Entry) {
    if (!entry.yesterdayPlan) return null;
    try {
      const planned = JSON.parse(entry.yesterdayPlan) as string[];
      const rawCompleted = entry.yesterdayCompleted ? JSON.parse(entry.yesterdayCompleted) : [];
      const statusMap: Record<string, string> = {};
      if (Array.isArray(rawCompleted)) {
        for (const item of rawCompleted) {
          if (typeof item === "string") {
            statusMap[item] = "COMPLETED";
          } else if (item.task) {
            statusMap[item.task] = item.status || "COMPLETED";
          }
        }
      }
      return { planned, statusMap };
    } catch {
      return null;
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search submissions..."
          className="flex-1 min-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
        />
        <select
          value={employeeFilter}
          onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="" className="text-gray-900">All Employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.name} className="text-gray-900">{e.name}</option>
          ))}
        </select>
        <select
          value={projectFilter}
          onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="" className="text-gray-900">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.name} className="text-gray-900">{p.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="" className="text-gray-900">All Status</option>
          <option value="COMPLETED" className="text-gray-900">Completed</option>
          <option value="IN_PROGRESS" className="text-gray-900">In Progress</option>
          <option value="BLOCKED" className="text-gray-900">Blocked</option>
          <option value="NEED_REVIEW" className="text-gray-900">Need Review</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
          title="To date"
        />
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          Loading submissions...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No submissions found yet. Employees need to submit their daily work first.
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((entry) => {
            const isExpanded = expanded.has(entry.id);
            const yesterday = getYesterdayComparison(entry);
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(entry.id)}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 shrink-0">
                    {entry.employeeName.charAt(0).toUpperCase()}
                  </div>
                    <div className="min-w-0 flex-1 grid grid-cols-5 gap-4 text-sm text-gray-900">
                    <div>
                      <p className="font-medium truncate">{entry.employeeName}</p>
                      <p className="text-xs text-gray-500">{formatDate(entry.submittedAt)}</p>
                    </div>
                    <div className="truncate">
                      <p className="truncate">{entry.projectName || "-"}</p>
                      <p className="text-xs text-gray-500">Project</p>
                    </div>
                    <div className="truncate">
                      <p className="truncate">{entry.taskTitle || "-"}</p>
                      <p className="text-xs text-gray-500">Task</p>
                    </div>
                    <div className="truncate">
                      <p className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${completionColors[entry.todayWorkCompleted] || "bg-gray-100 text-gray-600"}`}>
                        {entry.todayWorkCompleted === "YES" ? "Completed" : entry.todayWorkCompleted === "PARTIALLY" ? "Partial" : entry.todayWorkCompleted === "NO" ? "Not Done" : entry.todayWorkCompleted}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[entry.status] || "bg-gray-100 text-gray-600"}`}>
                        {entry.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded ? (
                  <ExpandedEntry entry={entry} yesterday={yesterday} formatDateTime={formatDateTime} onViewSheet={setViewEntry} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > perPage && page * perPage < filtered.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 bg-white px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Show More ({filtered.length - page * perPage} remaining)
          </button>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        Showing {paginated.length} of {filtered.length} submissions
      </p>

      {viewEntry && <DailySheetModal entry={viewEntry} onClose={() => setViewEntry(null)} />}
    </div>
  );
}

function ExpandedEntry({ entry, yesterday, formatDateTime, onViewSheet }: {
  entry: Entry;
  yesterday: { planned: string[]; statusMap: Record<string, string> } | null;
  formatDateTime: (iso: string) => string;
  onViewSheet: (entry: Entry) => void;
}) {
  return (
    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase mb-1">Today's Work</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{entry.todayWork}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase mb-1">Tomorrow's Task</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{entry.tomorrowTask}</p>
        </div>
      </div>

      {yesterday ? (
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase mb-2">Yesterday's Plan vs Today</p>
          <div className="space-y-1">
            {yesterday.planned.map((task, i) => {
              const status = yesterday.statusMap[task] || "NOT_COMPLETED";
              const statusColor = status === "COMPLETED" ? "text-emerald-600" : status === "PARTIALLY" ? "text-amber-600" : "text-red-500";
              const statusIcon = status === "COMPLETED" ? "\u2713" : status === "PARTIALLY" ? "\u25D0" : "\u25CB";
              const statusLabel = status === "COMPLETED" ? "Completed" : status === "PARTIALLY" ? "Partial" : "Not done";
              return (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-900">
                  <span className={statusColor}>{statusIcon}</span>
                  <span className={status === "COMPLETED" ? "text-gray-500 line-through" : ""}>
                    {task}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                    status === "PARTIALLY" ? "bg-amber-50 text-amber-700" :
                    "bg-red-50 text-red-700"
                  }`}>{statusLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {entry.blockers ? (
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase mb-1">Blockers</p>
          <p className="text-sm text-gray-900">{entry.blockers}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>Submitted: {formatDateTime(entry.submittedAt)}</span>
          {entry.employeeDepartment ? <span>Dept: {entry.employeeDepartment}</span> : null}
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">{entry.employeeEmail}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onViewSheet(entry); }}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <ExternalLink className="h-3 w-3" />
          View Sheet
        </button>
      </div>
    </div>
  );
}

function DailySheetModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  let parsedLinks: { type: string; url: string }[] = [];
  let parsedAttachments: { name: string; url: string; type: string }[] = [];
  let yesterdayPlanned: string[] = [];
  let yesterdayStatusMap: Record<string, string> = {};

  try { if (entry.referenceLinks) parsedLinks = JSON.parse(entry.referenceLinks); } catch {}
  try { if (entry.attachments) parsedAttachments = JSON.parse(entry.attachments); } catch {}
  try { if (entry.yesterdayPlan) yesterdayPlanned = JSON.parse(entry.yesterdayPlan); } catch {}
  try {
    if (entry.yesterdayCompleted) {
      const raw = JSON.parse(entry.yesterdayCompleted);
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (typeof item === "string") {
            yesterdayStatusMap[item] = "COMPLETED";
          } else if (item.task) {
            yesterdayStatusMap[item.task] = item.status || "COMPLETED";
          }
        }
      }
    }
  } catch {}

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10">
      <div className="fixed inset-0 bg-gray-900/30" onClick={onClose} />
      <div className="relative w-full max-w-[850px] max-h-full overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-200">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Daily Work Sheet</h2>
            <p className="text-xs text-gray-600">{entry.employeeName} · {new Date(entry.submittedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-600 uppercase mb-2">Employee</p>
            <p className="text-sm font-medium text-gray-900">{entry.employeeName}</p>
            <p className="text-xs text-gray-500">{entry.employeeEmail}</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-600 uppercase mb-2">Project</p>
            <p className="text-sm text-gray-900">{entry.projectName || "-"}</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-600 uppercase mb-2">Task</p>
            <p className="text-sm text-gray-900">{entry.taskTitle ? `${entry.taskCode ? `#${entry.taskCode} ` : ""}${entry.taskTitle}` : "-"}</p>
          </div>

          {yesterdayPlanned.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-600 uppercase mb-2">Yesterday's Planned Task</p>
              <div className="space-y-1.5">
                {yesterdayPlanned.map((task, i) => {
                  const status = yesterdayStatusMap[task] || "NOT_COMPLETED";
                  const statusColor = status === "COMPLETED" ? "bg-emerald-50 border-emerald-300" : status === "PARTIALLY" ? "bg-amber-50 border-amber-300" : "border-gray-300";
                  const statusLabel = status === "COMPLETED" ? "Completed" : status === "PARTIALLY" ? "Partially" : "Not completed";
                  const labelColor = status === "COMPLETED" ? "text-emerald-700" : status === "PARTIALLY" ? "text-amber-700" : "text-red-700";
                  const bgColor = status === "COMPLETED" ? "bg-emerald-50" : status === "PARTIALLY" ? "bg-amber-50" : "bg-red-50";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${bgColor} ${labelColor}`}>
                        {statusLabel}
                      </span>
                      <span className={`text-sm text-gray-900 ${status === "COMPLETED" ? "line-through text-gray-500" : ""}`}>{task}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-600 uppercase mb-2">Today's Work</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{entry.todayWork}</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-600 uppercase mb-3">Was Today's Planned Work Completed?</p>
            <div className="flex gap-3">
              {["YES", "PARTIALLY", "NO"].map((v) => (
                <div key={v} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-gray-900 ${entry.todayWorkCompleted === v ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}>
                  <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${entry.todayWorkCompleted === v ? "border-gray-900 bg-gray-900" : "border-gray-300"}`}>
                    {entry.todayWorkCompleted === v && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm">{v === "YES" ? "Yes" : v === "PARTIALLY" ? "Partially" : "No"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-600 uppercase mb-2">Tomorrow's Task</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{entry.tomorrowTask}</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-600 uppercase mb-2">Status</p>
            <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium ${statusColors[entry.status] || "bg-gray-100 text-gray-700"}`}>
              {entry.status.replace(/_/g, " ")}
            </span>
          </div>

          {entry.blockers && (
            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-600 uppercase mb-2">Blockers</p>
              <p className="text-sm text-gray-900">{entry.blockers}</p>
            </div>
          )}

          {parsedLinks.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Reference Links</p>
              <div className="space-y-2">
                {parsedLinks.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <GitBranch className="h-3.5 w-3.5" />
                    {link.type}: {link.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {parsedAttachments.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Attachments</p>
              <div className="space-y-2">
                {parsedAttachments.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <Globe className="h-3.5 w-3.5" />
                    {att.name || att.type} - {att.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 text-xs text-gray-600 flex items-center gap-4">
            <span>Submitted: {new Date(entry.submittedAt).toLocaleString()}</span>
            <span>Email: {entry.employeeEmail}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
