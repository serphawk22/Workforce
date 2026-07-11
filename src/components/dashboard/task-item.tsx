"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDateShort, isOverdue } from "@/lib/dates";

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: "bg-gray-400",
    MEDIUM: "bg-blue-500",
    HIGH: "bg-orange-500",
    CRITICAL: "bg-red-500",
  };
  return (
    <span className={`mt-1.5 block h-2 w-2 shrink-0 rounded-full ${colors[priority] || "bg-gray-400"}`} />
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function TaskLinks({ githubLink, productionUrl }: { githubLink: string | null; productionUrl: string | null }) {
  if (!githubLink && !productionUrl) return null;
  return (
    <div className="mt-1 flex gap-2">
      {githubLink && (
        <a href={githubLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50">
          <LinkIcon /> GitHub
        </a>
      )}
      {productionUrl && (
        <a href={productionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50">
          <LinkIcon /> Production
        </a>
      )}
    </div>
  );
}

type TaskItemProps = {
  id: string;
  title: string;
  priority: string;
  dueDate: Date | null;
  githubLink: string | null;
  productionUrl: string | null;
  createdAt: Date;
  dateOfDevAcceptOrStart: Date | null;
  dateOfDevComplete: Date | null;
  dateOfQaOrUatStart: Date | null;
  dateOfQaOrUatComplete: Date | null;
  dateOfReleaseToProd: Date | null;
  column: { name: string; board: { projectId: string; project: { name: string } } };
};

export function TaskItem({ task }: { task: TaskItemProps }) {
  const router = useRouter();

  function handleCardClick() {
    router.push(`/project/${task.column.board.projectId}`);
  }

  return (
    <div
      onClick={handleCardClick}
      className="group flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
    >
      <PriorityDot priority={task.priority} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="gray">{task.column.board.project.name}</Badge>
          <span className="text-xs text-gray-400">{task.column.name}</span>
          {task.dueDate && (
            <span className={`text-xs ${isOverdue(task.dueDate) ? "font-medium text-red-600" : "text-gray-400"}`}>
              Due {formatDateShort(task.dueDate)}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
          <DateItem date={task.createdAt} />
          {task.dateOfDevAcceptOrStart && (
            <span className="inline-flex items-center gap-1">
              <DevIcon /> {formatDateShort(task.dateOfDevAcceptOrStart)}
            </span>
          )}
          {task.dateOfReleaseToProd && (
            <span className="inline-flex items-center gap-1">
              <ReleaseIcon /> {formatDateShort(task.dateOfReleaseToProd)}
            </span>
          )}
        </div>
        <TaskLinks githubLink={task.githubLink} productionUrl={task.productionUrl} />
      </div>
    </div>
  );
}

function DateItem({ date }: { date: Date | null }) {
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

function DevIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-blue-400">
      <polygon points="5 3 19 12 5 21 5 3" />
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
