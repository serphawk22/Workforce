"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TaskData = {
  id: string;
  title: string;
  priority: string;
  assignee: { id: string; name: string } | null;
  dueDate: string | null;
  labels: { id: string; name: string; color: string }[];
  commentCount: number;
  sprintId: string | null;
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

          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>{task.assignee ? task.assignee.name : "Unassigned"}</span>
            <div className="flex items-center gap-3">
              {task.dueDate && (
                <span className={new Date(task.dueDate) < new Date() ? "font-medium text-red-500" : ""}>
                  {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
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
