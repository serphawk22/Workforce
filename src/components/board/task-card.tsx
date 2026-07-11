"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDateShort, isOverdue } from "@/lib/dates";

type TaskData = {
  id: string;
  title: string;
  priority: string;
  assignee: { id: string; name: string } | null;
  dueDate: string | null;
  labels: { id: string; name: string; color: string }[];
  commentCount: number;
  sprintId: string | null;
  createdAt: string;
  dateOfDevAcceptOrStart: string | null;
  dateOfDevComplete: string | null;
  dateOfQaOrUatStart: string | null;
  dateOfQaOrUatComplete: string | null;
  dateOfReleaseToProd: string | null;
};

export function TaskCard({
  task,
  onClick,
}: {
  task: TaskData;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityDots: Record<string, string> = {
    LOW: "bg-gray-300",
    MEDIUM: "bg-blue-500",
    HIGH: "bg-orange-500",
    CRITICAL: "bg-red-500",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-150 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDots[task.priority] || "bg-gray-300"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{task.title}</p>

          {task.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {task.labels.slice(0, 3).map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: l.color + "15", color: l.color }}
                >
                  {l.name}
                </span>
              ))}
              {task.labels.length > 3 && (
                <span className="text-xs text-gray-400">+{task.labels.length - 3}</span>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
            <DateBadge date={task.createdAt} />
            {task.dateOfDevAcceptOrStart && <DevStartIcon />}
            {task.dateOfDevComplete && <DevCompleteIcon />}
            {task.dateOfQaOrUatStart && <QaStartIcon />}
            {task.dateOfReleaseToProd && <ReleaseIcon />}
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 ${isOverdue(task.dueDate) ? "font-medium text-red-500" : ""}`}>
                <DueDateIcon /> {formatDateShort(task.dueDate)}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>{task.assignee ? task.assignee.name : "Unassigned"}</span>
            <div className="flex items-center gap-3">
              {task.commentCount > 0 && (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {task.commentCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DateBadge({ date }: { date: string | null }) {
  if (!date) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <CalendarIcon /> {formatDateShort(date)}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function DevStartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-blue-400">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function DevCompleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-emerald-400">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function QaStartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-amber-400">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><circle cx="12" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}

function ReleaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-purple-400">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function DueDateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
