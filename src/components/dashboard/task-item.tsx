import { CalendarDays, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/dates";

type TaskItemTask = {
  id: string;
  title: string;
  code?: string | null;
  issueKey?: string | null;
  priority: string;
  dueDate: string | Date | null;
  column: { name: string; board: { project: { name: string } } };
  assignee?: { id: string; name: string } | null;
  githubLink?: string | null;
  productionUrl?: string | null;
};

export function TaskItem({ task }: { task: TaskItemTask }) {
  const priorityColors: Record<string, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-amber-500",
    MEDIUM: "bg-blue-500",
    LOW: "bg-gray-400",
  };

  return (
    <div className="group flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityColors[task.priority] || "bg-gray-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
          {task.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400 truncate">{task.column.board.project.name}</span>
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <CalendarDays className="h-3 w-3" />
              {formatDate(new Date(task.dueDate))}
            </span>
          )}
          {task.githubLink && (
            <a href={task.githubLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={
          task.column?.name === "Done" ? "success" :
          task.column?.name === "In Progress" ? "info" :
          task.column?.name === "Review" ? "warning" : "default"
        } size="sm">
          {task.column?.name || "To Do"}
        </Badge>
        {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
      </div>
    </div>
  );
}
