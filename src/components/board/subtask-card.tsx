"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SubtaskInfo = {
  id: string;
  title: string;
  code: string | null;
  status: string;
};

const statusColors: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-600",
  REVIEW: "bg-amber-100 text-amber-600",
  TESTING: "bg-purple-100 text-purple-600",
  DONE: "bg-emerald-100 text-emerald-600",
};

const statusLabels: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  TESTING: "Testing",
  DONE: "Done",
};

export function SubtaskCard({
  subtask,
  onClick,
}: {
  subtask: SubtaskInfo;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-all duration-150 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-center gap-2 min-w-0">
        {subtask.code && (
          <span className="shrink-0 text-xs font-mono text-gray-400">#{subtask.code}</span>
        )}
        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColors[subtask.status] || "bg-gray-100 text-gray-600"}`}>
          {statusLabels[subtask.status] || subtask.status}
        </span>
        <p className="min-w-0 truncate text-sm font-medium text-gray-900">{subtask.title}</p>
      </div>
    </div>
  );
}
