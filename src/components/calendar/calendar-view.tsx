"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type CalendarTask = {
  id: string;
  title: string;
  priority: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  columnName: string;
  assigneeName: string | null;
};

export function CalendarView({ tasks }: { tasks: CalendarTask[] }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    for (const t of tasks) {
      const d = t.dueDate.split("T")[0];
      if (!map[d]) map[d] = [];
      map[d].push(t);
    }
    return map;
  }, [tasks]);

  const weeks = useMemo(() => {
    const cells: (number | null)[][] = [];
    let week: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        cells.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      cells.push(week);
    }
    return cells;
  }, [firstDayOfWeek, daysInMonth]);

  function getDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const priorityDot = (p: string) => {
    const colors: Record<string, string> = {
      LOW: "bg-gray-400",
      MEDIUM: "bg-blue-500",
      HIGH: "bg-orange-500",
      CRITICAL: "bg-red-500",
    };
    return colors[p] || "bg-gray-400";
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
          <button onClick={nextMonth} className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        <button onClick={goToday} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Today
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        <div className="divide-y divide-gray-100">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 min-h-[100px]">
              {week.map((day, di) => {
                if (day === null) return <div key={di} className="bg-gray-50/50" />;
                const dateStr = getDateStr(day);
                const dayTasks = tasksByDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={di}
                    className={`relative min-h-[100px] border-r border-gray-100 p-1.5 last:border-r-0 ${
                      isToday ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday ? "bg-blue-600 text-white" : "text-gray-500"
                    }`}>
                      {day}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayTasks.slice(0, 3).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => router.push(`/project/${t.projectId}`)}
                          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs transition-colors hover:bg-gray-100"
                          title={`${t.title} (${t.projectName})`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot(t.priority)}`} />
                          <span className="truncate text-gray-700">{t.title}</span>
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <p className="px-1 text-xs text-blue-600 font-medium">
                          +{dayTasks.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
