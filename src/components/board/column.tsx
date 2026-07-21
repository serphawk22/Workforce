"use client";

import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./task-card";
import { SubtaskCard } from "./subtask-card";
import { renameColumn, deleteColumn } from "@/actions/column";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { Plus, MoreHorizontal, GripVertical } from "lucide-react";

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
  dateOfDevAcceptOrStart: string | null;
  dateOfDevComplete: string | null;
  dateOfQaOrUatStart: string | null;
  dateOfQaOrUatComplete: string | null;
  dateOfReleaseToProd: string | null;
  subtasks: SubtaskInfo[];
  completedSubtaskCount: number;
};

type ColumnData = {
  id: string;
  name: string;
  tasks: TaskData[];
};

export function Column({
  column,
  onTaskClick,
  onAddTask,
}: {
  column: ColumnData;
  onTaskClick: (task: TaskData) => void;
  onAddTask?: (columnId: string) => void;
}) {
  const router = useRouter();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleRename(name: string) {
    const formData = new FormData();
    formData.set("columnId", column.id);
    formData.set("name", name);
    await renameColumn(formData);
    router.refresh();
  }

  async function handleDelete() {
    const formData = new FormData();
    formData.set("columnId", column.id);
    const result = await deleteColumn(formData);
    if (!result?.error) {
      router.refresh();
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl bg-muted/30 p-3 min-h-[400px] transition-all ${
        isOver ? "ring-2 ring-primary/20 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">{column.name}</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
            {column.tasks.length}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-border bg-card shadow-lg p-1 z-10 animate-fade-in">
              <button
                onClick={() => { setShowRename(true); setShowMenu(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => { setShowDelete(true); setShowMenu(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>

      <button
        onClick={() => onAddTask?.(column.id)}
        className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50 transition-all"
      >
        <Plus className="h-4 w-4" />
        Add Task
      </button>

      <PromptDialog
        open={showRename}
        onClose={() => setShowRename(false)}
        onConfirm={(name) => { setShowRename(false); handleRename(name); }}
        title="Rename column"
        placeholder="Column name"
        confirmLabel="Rename"
        initialValue={column.name}
      />

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => { setShowDelete(false); handleDelete(); }}
        title="Delete column"
        message={`Are you sure you want to delete "${column.name}"? This will also delete all tasks in this column.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
