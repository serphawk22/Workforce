"use client";

import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./task-card";
import { renameColumn, deleteColumn } from "@/actions/column";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PromptDialog } from "@/components/ui/prompt-dialog";

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

type ColumnData = {
  id: string;
  name: string;
  tasks: TaskData[];
};

export function Column({
  column,
  onTaskClick,
}: {
  column: ColumnData;
  onTaskClick: (task: TaskData) => void;
}) {
  const router = useRouter();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    if (result?.error) {
      setDeleteError(Object.values(result.error).flat()[0] as string);
    } else {
      router.refresh();
    }
  }

  const priorityColors: Record<string, string> = {
    LOW: "bg-gray-100",
    MEDIUM: "bg-blue-50",
    HIGH: "bg-orange-50",
    CRITICAL: "bg-red-50",
  };

  return (
    <div
      className={`rounded-xl bg-gray-50 p-4 ${isOver ? "ring-2 ring-gray-900/20" : ""}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-gray-900">{column.name}</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-gray-200 px-1.5 text-xs font-medium text-gray-500">
            {column.tasks.length}
          </span>
        </div>
        <div className="flex gap-0.5">
          <button
            onClick={() => setShowRename(true)}
            className="rounded-md px-1.5 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            title="Rename"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="rounded-md px-1.5 py-1 text-xs text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className="space-y-3 min-h-[80px]">
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
        {column.tasks.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 h-4 w-4">
              <path d="M12 5v14" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Drop tasks here
          </div>
        )}
      </div>

      <PromptDialog
        open={showRename}
        onClose={() => setShowRename(false)}
        onConfirm={(name) => {
          setShowRename(false);
          handleRename(name);
        }}
        title="Rename Column"
        defaultValue={column.name}
        placeholder="New column name"
        confirmLabel="Rename"
      />

      <ConfirmDialog
        open={showDelete}
        onClose={() => { setShowDelete(false); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="Delete Column"
        message={
          deleteError
            ? deleteError
            : `Delete column "${column.name}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
