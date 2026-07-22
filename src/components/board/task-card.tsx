"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquare, CalendarDays, ArrowUp, ArrowDown, ArrowRight, ChevronsUp } from "lucide-react";
import { User } from "lucide-react";
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
  childTasks?: TaskData[];
  childTaskCount?: number;
  completedChildTaskCount?: number;
};

export function TaskCard({ task, onClick, isChild }: { task: TaskData; onClick: () => void; isChild?: boolean }) {
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
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const PriorityIcon = ({ priority }: { priority: string }) => {
    switch (priority) {
      case "CRITICAL":
        return <ChevronsUp className="h-4 w-4 text-danger" />;
      case "HIGH":
        return <ArrowUp className="h-4 w-4 text-warning" />;
      case "MEDIUM":
        return <ArrowRight className="h-4 w-4 text-blue-500" />;
      case "LOW":
        return <ArrowDown className="h-4 w-4 text-muted-foreground" />;
      default:
        return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const hasSubtaskProgress = task.subtasks.length > 0;
  const hasChildTaskProgress = task.childTaskCount && task.childTaskCount > 0;
  const totalChildItems = task.subtasks.length + (task.childTaskCount || 0);
  const completedChildItems = task.completedSubtaskCount + (task.completedChildTaskCount || 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`group relative rounded-lg border bg-card shadow-sm transition-all duration-200 cursor-pointer 
        ${isChild ? "p-2.5 border-l-2 border-l-primary/30" : "p-3"}
        ${isDragging ? 'border-primary ring-1 ring-primary/20 shadow-xl' : 'border-border hover:border-primary/30 hover:shadow-md'}`}
    >
      <div className="flex items-start gap-2 mb-2">
        {!isChild && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 absolute left-1 top-3"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className={`flex-1 min-w-0 ${isChild ? "" : "pl-4"}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <PriorityIcon priority={task.priority} />
            <p className={`font-medium text-muted-foreground uppercase tracking-wider ${isChild ? "text-[10px]" : "text-[11px]"}`}>
              {task.code || task.issueKey || "TASK"}
            </p>
            {isChild && (
              <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Subtask</span>
            )}
          </div>
          <p className={`font-medium text-foreground leading-snug line-clamp-2 ${isChild ? "text-xs" : "text-sm"}`}>
            {task.title}
          </p>
        </div>
      </div>

      {task.labels.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 ${isChild ? "mb-2" : "mb-3"} ${isChild ? "" : "pl-4"}`}>
          {task.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: label.color + "20", color: label.color }}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{task.labels.length - 2}</span>
          )}
        </div>
      )}

      <div className={`flex items-center justify-between ${isChild ? "" : "pl-4"} mt-1 border-t border-border/50 pt-2`}>
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {formatDate(new Date(task.dueDate))}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          )}
          {hasSubtaskProgress && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              {task.completedSubtaskCount}/{task.subtasks.length}
            </span>
          )}
          {hasChildTaskProgress && !isChild && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M7 11h10M10 15h4"/></svg>
              {task.completedChildTaskCount}/{task.childTaskCount}
            </span>
          )}
          {totalChildItems > 0 && !isChild && (
            <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(completedChildItems / totalChildItems) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center">
          {task.assignee ? (
            <Avatar name={task.assignee.name} size="sm" />
          ) : (
            <div className="h-6 w-6 rounded-full border border-dashed border-border flex items-center justify-center">
              <User className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
