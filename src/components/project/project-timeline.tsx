"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TimelineTask = {
  id: string;
  title: string;
  priority: string;
  assigneeName: string | null;
  columnName: string;
  startDate: string | null;
  endDate: string | null;
};

export function ProjectTimeline({
  tasks,
  sprints,
  projectId,
}: {
  tasks: TimelineTask[];
  sprints: { id: string; name: string; startDate: string | null; endDate: string | null }[];
  projectId: string;
}) {
  const router = useRouter();
  const [groupBy, setGroupBy] = useState<"status" | "none">("status");

  const dateRange = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const t of tasks) {
      if (t.startDate) min = Math.min(min, new Date(t.startDate).getTime());
      if (t.endDate) max = Math.max(max, new Date(t.endDate).getTime());
    }
    for (const s of sprints) {
      if (s.startDate) min = Math.min(min, new Date(s.startDate).getTime());
      if (s.endDate) max = Math.max(max, new Date(s.endDate).getTime());
    }
    if (!isFinite(min)) min = Date.now();
    if (!isFinite(max)) max = Date.now() + 86400000 * 14;
    const start = new Date(min);
    start.setDate(start.getDate() - 1);
    const end = new Date(max);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, [tasks, sprints]);

  const days = useMemo(() => {
    const diff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / 86400000);
    const arr: Date[] = [];
    for (let i = 0; i < diff; i++) {
      const d = new Date(dateRange.start);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [dateRange]);

  const today = new Date();

  function getBarStyle(start: string | null, end: string | null) {
    const s = start ? new Date(start).getTime() : dateRange.start.getTime();
    const e = end ? new Date(end).getTime() : s + 86400000;
    const totalPx = days.length * 40;
    const rangeMs = dateRange.end.getTime() - dateRange.start.getTime();
    if (rangeMs <= 0) return { left: "0px", width: "40px" };
    const left = ((s - dateRange.start.getTime()) / rangeMs) * totalPx;
    const width = Math.max(((e - s) / rangeMs) * totalPx, 20);
    return { left: `${left}px`, width: `${width}px` };
  }

  function formatDate(d: Date) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const priorityBarColor: Record<string, string> = {
    LOW: "bg-gray-400",
    MEDIUM: "bg-blue-400",
    HIGH: "bg-orange-400",
    CRITICAL: "bg-red-400",
  };

  const groupedTasks = useMemo(() => {
    if (groupBy === "none") return { "All Tasks": tasks };
    const groups: Record<string, TimelineTask[]> = {};
    for (const t of tasks) {
      const key = t.columnName || "Uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    const order = ["To Do", "In Progress", "Review", "Testing", "Done", "Released", "Closed"];
    return Object.fromEntries(
      Object.entries(groups).sort(([a], [b]) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
    );
  }, [tasks, groupBy]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-500">Group by:</label>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as "status" | "none")}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="status">Status</option>
          <option value="none">None</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div style={{ minWidth: `${days.length * 40 + 250}px` }}>
          <div className="flex border-b border-gray-200">
            <div className="w-[250px] shrink-0 border-r border-gray-200 px-4 py-3 text-xs font-medium text-gray-500 uppercase">
              Task
            </div>
            <div className="flex">
              {days.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`w-10 shrink-0 border-r border-gray-100 px-1 py-3 text-center text-xs ${
                      isToday ? "bg-blue-50 font-semibold text-blue-700" : isWeekend ? "bg-gray-50 text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
            <div key={groupName}>
              {groupBy === "status" && (
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {groupName}
                </div>
              )}
              {groupTasks.map((t) => (
                <div key={t.id} className="flex border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                  <div className="w-[250px] shrink-0 border-r border-gray-100 px-4 py-3">
                    <button
                      onClick={() => router.push(`/project/${projectId}/board`)}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left truncate w-full"
                      title={t.title}
                    >
                      {t.title}
                    </button>
                    {t.assigneeName && (
                      <p className="mt-0.5 text-xs text-gray-400">{t.assigneeName}</p>
                    )}
                  </div>
                  <div className="relative flex-1 min-h-[48px]">
                    <div
                      className={`absolute top-2 h-7 rounded-md ${priorityBarColor[t.priority] || "bg-gray-400"} opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center px-2 overflow-hidden`}
                      style={getBarStyle(t.startDate, t.endDate)}
                      title={`${t.title} (${t.startDate ? formatDate(new Date(t.startDate)) : "?"} - ${t.endDate ? formatDate(new Date(t.endDate)) : "?"})`}
                    >
                      <span className="text-xs text-white truncate font-medium">
                        {t.title}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-gray-400" /> Low
        </span>
        <span className="inline-flex items-center gap-1 ml-3">
          <span className="h-3 w-3 rounded bg-blue-400" /> Medium
        </span>
        <span className="inline-flex items-center gap-1 ml-3">
          <span className="h-3 w-3 rounded bg-orange-400" /> High
        </span>
        <span className="inline-flex items-center gap-1 ml-3">
          <span className="h-3 w-3 rounded bg-red-400" /> Critical
        </span>
      </div>
    </div>
  );
}
