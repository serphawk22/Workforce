"use client";

import { useState, useMemo } from "react";
import type { TaskRow, SubtaskRow, ChildTaskRow } from "./page";

type Employee = { id: string; name: string };

const taskStatusColors: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Review: "bg-amber-50 text-amber-700",
  Testing: "bg-purple-50 text-purple-700",
  Done: "bg-emerald-50 text-emerald-700",
};

const subtaskStatusColors: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  REVIEW: "bg-amber-50 text-amber-600",
  TESTING: "bg-purple-50 text-purple-600",
  DONE: "bg-emerald-50 text-emerald-600",
};

function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
}

export function WorkUpdatesTable({ tasks: initialTasks, employees }: { tasks: TaskRow[]; employees: Employee[] }) {
  const [tasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(tasks.filter((t) => t.subtasks.length > 0 || t.childTasks.length > 0 || t.isStandalone).map((t) => t.id)));

  const projects = useMemo(() => {
    const names = new Set(tasks.map((t) => t.projectName));
    return Array.from(names).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesTask = t.title.toLowerCase().includes(q) || (t.code && t.code.includes(q));
        const matchesSubtask = t.subtasks.some((s) => s.title.toLowerCase().includes(q) || (s.code && s.code.includes(q)));
        const matchesChildTask = t.childTasks.some((ct) => ct.title.toLowerCase().includes(q) || (ct.code && ct.code.includes(q)));
        const matchesAssignee = (t.assigneeName && t.assigneeName.toLowerCase().includes(q));
        if (!matchesTask && !matchesSubtask && !matchesChildTask && !matchesAssignee) return false;
      }
      if (employeeFilter && t.assigneeName !== employeeFilter) return false;
      if (projectFilter && t.projectName !== projectFilter) return false;
      return true;
    });
  }, [tasks, search, employeeFilter, projectFilter]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExportCSV() {
    const headers = ["Project", "Task Code", "Task Name", "Subtask Code", "Subtask Name", "Assignee", "Task Status", "Subtask Status", "Work Summary", "Progress Notes", "Time Spent (hours)", "GitHub Link", "Production URL", "Submitted At", "Updated At"];
    const rows: string[][] = [];
    for (const t of filtered) {
      if (t.isStandalone) {
        rows.push([t.projectName, "", t.title, "", "", t.assigneeName || "", t.status || "Daily Sheet", "", t.todayWork || "", "", "", "", "", t.submittedAt || "", ""]);
      } else {
        const base = [t.projectName, t.code ? `#${t.code}` : "", t.title, "", "", t.assigneeName || "", t.columnName, "", "", "", "", "", "", "", ""];
        if (t.subtasks.length === 0) {
          rows.push(base);
        } else {
          for (const s of t.subtasks) {
            rows.push([
              t.projectName,
              t.code ? `#${t.code}` : "",
              t.title,
              s.code ? `#${s.code}` : "",
              s.title,
              t.assigneeName || "",
              t.columnName,
              s.status.replace("_", " "),
              s.workUpdate?.workSummary || "",
              s.workUpdate?.progressNotes || "",
              s.workUpdate ? (s.workUpdate.timeSpent / 60).toFixed(1) : "",
              s.workUpdate?.githubLink || "",
              s.workUpdate?.productionUrl || "",
              s.workUpdate ? formatDateTime(s.workUpdate.createdAt) : "",
              s.workUpdate ? formatDateTime(s.workUpdate.updatedAt) : "",
            ]);
          }
        }
      }
    }
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
          placeholder="Search by task, subtask, assignee..."
          className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All employees</option>
          {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
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
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project / Employee</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Item</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Summary</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GitHub</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Production</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
            </tr>
          </thead>
          {filtered.length === 0 ? (
            <tbody className="bg-white">
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">No work updates found</td>
              </tr>
            </tbody>
          ) : (
            filtered.map((t) => {
              const isExpanded = expanded.has(t.id);
              const hasChildren = t.subtasks.length > 0 || t.childTasks.length > 0;
              const doneColumnNames = ["Done", "Released", "Closed"];
              const completedSubtasks = t.subtasks.filter((s) => s.status === "DONE").length;
              const completedChildTasks = t.childTasks.filter((ct) => doneColumnNames.includes(ct.columnName)).length;
              const totalChildren = t.subtasks.length + t.childTasks.length;
              const totalCompleted = completedSubtasks + completedChildTasks;
              const progress = totalChildren > 0 ? Math.round((totalCompleted / totalChildren) * 100) : 0;
              return (
                <tbody key={t.id} className="bg-white">
                  {t.isStandalone ? (
                    <>
                      <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-3">
                          <button onClick={() => toggleExpanded(t.id)} className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                            <span className="text-xs">{isExpanded ? "\u25BC" : "\u25B6"}</span>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{t.projectName}</td>
                        <td className="px-3 py-3">
                          <span className="text-sm font-medium text-gray-900 line-clamp-2">{t.title}</span>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600">{t.assigneeName}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${t.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : t.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" : t.status === "BLOCKED" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                            {t.status ? t.status.replace(/_/g, " ") : "Daily Sheet"}
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-[200px]">
                          <p className="text-sm text-gray-600 truncate" title={t.todayWork || ""}>{t.todayWork || "-"}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-400" colSpan={3}>-</td>
                        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{t.submittedAt ? formatDateTime(t.submittedAt) : "-"}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-gray-50 bg-gray-50/40">
                          <td colSpan={10} className="px-5 py-4">
                            <div className="space-y-2 text-sm">
                              {t.tomorrowTask && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase">Tomorrow</span>
                                  <p className="text-gray-700 mt-0.5">{t.tomorrowTask}</p>
                                </div>
                              )}
                              {t.blockers && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500 uppercase">Blockers</span>
                                  <p className="text-red-600 mt-0.5">{t.blockers}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <>
                      <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-3">
                          {hasChildren && (
                            <button onClick={() => toggleExpanded(t.id)} className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                              <span className="text-xs">{isExpanded ? "\u25BC" : "\u25B6"}</span>
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{t.projectName}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-medium text-gray-900">{t.code ? `#${t.code}` : ""}</span>
                            <span className="text-sm font-medium text-gray-900">{t.title}</span>
                            {t.isAwaiting && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Awaiting</span>
                            )}
                          </div>
                          {totalChildren > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-1.5 w-20 rounded-full bg-gray-200">
                                <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400">{totalCompleted}/{totalChildren} &middot; {progress}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600">{t.assigneeName || "-"}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${taskStatusColors[t.columnName] || "bg-gray-100 text-gray-700"}`}>
                            {t.columnName}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-400" colSpan={5}>-</td>
                      </tr>
                      {isExpanded && t.subtasks.map((s) => (
                        <SubtaskRow key={s.id} subtask={s} projectName={t.projectName} />
                      ))}
                      {isExpanded && t.childTasks.map((ct) => (
                        <ChildTaskRow key={ct.id} childTask={ct} projectName={t.projectName} />
                      ))}
                    </>
                  )}
                </tbody>
              );
            })
          )}
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">{filtered.length} of {tasks.length} tasks shown</p>
    </div>
  );
}

const taskStatusColorsForChild: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-50 text-blue-600",
  Review: "bg-amber-50 text-amber-600",
  Testing: "bg-purple-50 text-purple-600",
  Done: "bg-emerald-50 text-emerald-600",
  Released: "bg-emerald-50 text-emerald-600",
  Closed: "bg-emerald-50 text-emerald-600",
};

function ChildTaskRow({ childTask: ct, projectName }: { childTask: ChildTaskRow; projectName: string }) {
  const wu = ct.workUpdate;
  return (
    <tr className="border-b border-gray-50 bg-gray-50/40 hover:bg-gray-100/40 transition-colors">
      <td className="px-3 py-2.5" />
      <td className="px-3 py-2.5 text-xs text-gray-400">{projectName}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-4 border-l-2 border-b-2 border-gray-300 h-3 -ml-1 mr-0.5" />
          <span className="text-xs font-mono text-gray-500">{ct.code ? `#${ct.code}` : ""}</span>
          <span className="text-sm text-gray-700">{ct.title}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-600">{ct.assigneeName || wu?.user?.name || "-"}</td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${taskStatusColorsForChild[ct.columnName] || "bg-gray-100 text-gray-600"}`}>
          {ct.columnName}
        </span>
      </td>
      <td className="px-3 py-2.5 max-w-[180px]">
        {wu ? (
          <p className="text-sm text-gray-600 truncate" title={wu.workSummary || ""}>{wu.workSummary || "-"}</p>
        ) : (
          <span className="text-xs text-amber-600 italic">Awaiting first update</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">
        {wu && wu.timeSpent > 0 ? `${(wu.timeSpent / 60).toFixed(1)}h` : "-"}
      </td>
      <td className="px-3 py-2.5">
        {wu?.githubLink ? (
          <a href={wu.githubLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block max-w-[100px]">{wu.githubLink.replace(/^https?:\/\//, "")}</a>
        ) : <span className="text-xs text-gray-400">-</span>}
      </td>
      <td className="px-3 py-2.5">
        {wu?.productionUrl ? (
          <a href={wu.productionUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block max-w-[100px]">{wu.productionUrl.replace(/^https?:\/\//, "")}</a>
        ) : <span className="text-xs text-gray-400">-</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
        {wu ? formatDateTime(wu.createdAt) : "-"}
      </td>
    </tr>
  );
}

function SubtaskRow({ subtask: s, projectName }: { subtask: SubtaskRow; projectName: string }) {
  const wu = s.workUpdate;
  return (
    <tr className="border-b border-gray-50 bg-gray-50/40 hover:bg-gray-100/40 transition-colors">
      <td className="px-3 py-2.5" />
      <td className="px-3 py-2.5 text-xs text-gray-400">{projectName}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-4 border-l-2 border-b-2 border-gray-300 h-3 -ml-1 mr-0.5" />
          <span className="text-xs font-mono text-gray-500">{s.code ? `#${s.code}` : ""}</span>
          <span className="text-sm text-gray-700">{s.title}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-600">{wu?.user?.name || "-"}</td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${subtaskStatusColors[s.status] || "bg-gray-100 text-gray-600"}`}>
          {s.status.replace("_", " ")}
        </span>
      </td>
      <td className="px-3 py-2.5 max-w-[180px]">
        {wu ? (
          <p className="text-sm text-gray-600 truncate" title={wu.workSummary || ""}>{wu.workSummary || "-"}</p>
        ) : (
          <span className="text-xs text-amber-600 italic">Awaiting first update</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">
        {wu && wu.timeSpent > 0 ? `${(wu.timeSpent / 60).toFixed(1)}h` : "-"}
      </td>
      <td className="px-3 py-2.5">
        {wu?.githubLink ? (
          <a href={wu.githubLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block max-w-[100px]">{wu.githubLink.replace(/^https?:\/\//, "")}</a>
        ) : <span className="text-xs text-gray-400">-</span>}
      </td>
      <td className="px-3 py-2.5">
        {wu?.productionUrl ? (
          <a href={wu.productionUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block max-w-[100px]">{wu.productionUrl.replace(/^https?:\/\//, "")}</a>
        ) : <span className="text-xs text-gray-400">-</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
        {wu ? formatDateTime(wu.createdAt) : "-"}
      </td>
    </tr>
  );
}
