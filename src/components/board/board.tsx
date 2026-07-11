"use client";

import { useState, useMemo, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Column as ColumnComponent } from "./column";
import { addColumn } from "@/actions/column";
import { moveTask } from "@/actions/task";
import { TaskDetailModal } from "../task/task-detail-modal";
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
};

type SprintItem = {
  id: string;
  name: string;
  status: string;
};

type ColumnData = {
  id: string;
  name: string;
  tasks: TaskData[];
};

type Member = { id: string; name: string; email: string };
type Label = { id: string; name: string; color: string };

export function Board({
  projectId,
  boardId,
  initialColumns,
  members,
  labels,
  sprints,
}: {
  projectId: string;
  boardId: string;
  initialColumns: ColumnData[];
  members: Member[];
  labels: Label[];
  sprints?: SprintItem[];
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [showColumnPrompt, setShowColumnPrompt] = useState(false);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === activeTaskId);
      if (task) return task;
    }
    return null;
  }, [activeTaskId, columns]);

  function findColumnByTaskId(taskId: string) {
    return columns.find((col) => col.tasks.some((t) => t.id === taskId));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over || active.id === over.id) return;

    const snapshot = columnsRef.current.map((c) => ({ ...c, tasks: [...c.tasks] }));

    const activeCol = findColumnByTaskId(active.id as string);
    const overCol =
      findColumnByTaskId(over.id as string) ||
      columns.find((c) => c.id === over.id);

    if (!activeCol || !overCol) return;

    const sourceCol = columns.find((c) => c.id === activeCol.id);
    const destCol = columns.find((c) => c.id === overCol.id);
    if (!sourceCol || !destCol) return;

    const sourceTasks = [...sourceCol.tasks];
    const activeIndex = sourceTasks.findIndex((t) => t.id === active.id);
    if (activeIndex === -1) return;

    const [movedTask] = sourceTasks.splice(activeIndex, 1);

    let destTasks: TaskData[];
    let newOrder: number;

    if (activeCol.id === overCol.id) {
      const overIndex = sourceTasks.findIndex((t) => t.id === over.id);
      sourceTasks.splice(overIndex >= 0 ? overIndex : sourceTasks.length, 0, movedTask);
      destTasks = sourceTasks;
      newOrder = overIndex >= 0 ? overIndex : sourceTasks.length - 1;
    } else {
      destTasks = [...destCol.tasks];
      const overIndex = destTasks.findIndex((t) => t.id === over.id);
      if (overIndex >= 0) {
        destTasks.splice(overIndex, 0, movedTask);
      } else {
        destTasks.push(movedTask);
      }
      newOrder = overIndex >= 0 ? overIndex : destTasks.length - 1;
    }

    const newColumns = columns.map((c) => {
      if (c.id === sourceCol.id) return { ...c, tasks: c.id === destCol.id ? destTasks : sourceTasks };
      if (c.id === destCol.id) return { ...c, tasks: destTasks };
      return c;
    });

    setColumns(newColumns);

    const formData = new FormData();
    formData.set("taskId", active.id as string);
    formData.set("newColumnId", destCol.id);
    formData.set("newOrder", String(newOrder));

    const result = await moveTask(formData);
    if (!result?.success) {
      setColumns(snapshot);
    }
  }

  function handleTaskClick(task: TaskData) {
    setSelectedTask(task);
  }

  async function handleAddColumn(name: string) {
    const formData = new FormData();
    formData.set("boardId", boardId);
    formData.set("name", name);
    const result = await addColumn(formData);
    if (result?.id) {
      setColumns((prev) => [
        ...prev,
        { id: result.id as string, name, tasks: [] },
      ]);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={undefined}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {columns.map((col) => (
          <div key={col.id} className="flex-shrink-0 w-72">
            <ColumnComponent
              column={col}
              onTaskClick={handleTaskClick}
            />
          </div>
        ))}
        <div className="flex-shrink-0 w-72">
          <button
            onClick={() => setShowColumnPrompt(true)}
            className="w-full rounded-xl border-2 border-dashed border-gray-200 p-4 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
          >
            + Add Column
          </button>
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xl w-72">
            <p className="text-sm font-medium text-gray-900">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          members={members}
          labels={labels}
          sprints={sprints || []}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={(updatedTask) => {
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                tasks: col.tasks.map((t) =>
                  t.id === updatedTask.id ? { ...t, ...updatedTask } : t
                ),
              }))
            );
          }}
        />
      )}

      <PromptDialog
        open={showColumnPrompt}
        onClose={() => setShowColumnPrompt(false)}
        onConfirm={(name) => {
          setShowColumnPrompt(false);
          handleAddColumn(name);
        }}
        title="Add Column"
        placeholder="Column name"
        confirmLabel="Add"
      />
    </DndContext>
  );
}
