"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquare, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/dates";

type SubtaskInfo = {
  id: string;
  title: string;
  code: string | null;
  status: string;
};

type TaskData = {
  id: string;
  title: string;
  code?: string | null;
  issueKey?: string | null;
  priority: string;
  assignee: { id: string; name: string } | null;
  dueDate: string | null;
  labels: { id: string; name: string; color: string }[];
  commentCount: number;
  sprintId: string | null;
  createdAt: string;
  subtasks: SubtaskInfo[];
  completedSubtaskCount: number;
};

export function TaskCard({ task, onClick }: { task: TaskData; onClick: () => void }) {
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

  const priorityColors: Record<string, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-amber-500",
    MEDIUM: "bg-blue-500",
    LOW: "bg-gray-400",
  };

  const priorityLabels: Record<string, string> = {
    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start gap-2 mb-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
            {task.title}
          </p>
          {task.code && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{task.code}</p>
          )}
        </div>
      </div>

      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 px-1">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: label.color + "20", color: label.color }}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-xs text-gray-400">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${priorityColors[task.priority] || "bg-gray-400"}`} title={priorityLabels[task.priority] || task.priority} />
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <CalendarDays className="h-3 w-3" />
              {formatDate(new Date(task.dueDate))}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.subtasks.length > 0 && (
            <span className="text-xs text-gray-400">
              {task.completedSubtaskCount}/{task.subtasks.length}
            </span>
          )}
          {task.assignee && (
            <Avatar name={task.assignee.name} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}
