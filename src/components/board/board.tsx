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
import { CreateTaskModal } from "../task/create-task-modal";
import { PromptDialog } from "@/components/ui/prompt-dialog";

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
  const [createTaskColumnId, setCreateTaskColumnId] = useState<string | null>(null);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const subtaskParentMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const col of columns) {
      for (const task of col.tasks) {
        for (const sub of task.subtasks) {
          map[sub.id] = task.id;
        }
      }
    }
    return map;
  }, [columns]);

  const activeItem = useMemo(() => {
    if (!activeTaskId) return null;
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === activeTaskId);
      if (task) return { type: "task" as const, title: task.title, subtaskCount: task.subtasks.length };
    }
    const parentId = subtaskParentMap[activeTaskId];
    if (parentId) {
      for (const col of columns) {
        for (const task of col.tasks) {
          if (task.id === parentId) {
            const sub = task.subtasks.find((s) => s.id === activeTaskId);
            if (sub) return { type: "subtask" as const, title: sub.title, subtaskCount: 0 };
          }
        }
      }
    }
    return null;
  }, [activeTaskId, columns, subtaskParentMap]);

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

    const activeId = active.id as string;
    const overId = over.id as string;

    const isSubtask = subtaskParentMap[activeId] !== undefined;

    if (isSubtask) {
      const parentTaskId = subtaskParentMap[activeId];
      const isOverSubtask = subtaskParentMap[overId] !== undefined;
      const isSameParent = isOverSubtask && subtaskParentMap[overId] === parentTaskId;
      if (!isSameParent) return;

      const snapshot = columnsRef.current.map((c) => ({ ...c, tasks: [...c.tasks.map((t) => ({ ...t, subtasks: [...t.subtasks] }))] }));

      const newColumns = columns.map((col) => ({
        ...col,
        tasks: col.tasks.map((task) => {
          if (task.id !== parentTaskId) return task;
          const subs = [...task.subtasks];
          const fromIdx = subs.findIndex((s) => s.id === activeId);
          const toIdx = subs.findIndex((s) => s.id === overId);
          if (fromIdx === -1 || toIdx === -1) return task;
          const [moved] = subs.splice(fromIdx, 1);
          subs.splice(toIdx, 0, moved);
          return { ...task, subtasks: subs };
        }),
      }));

      setColumns(newColumns);
      return;
    }

    const snapshot = columnsRef.current.map((c) => ({ ...c, tasks: [...c.tasks] }));

    const activeCol = findColumnByTaskId(activeId);
    const overCol =
      findColumnByTaskId(overId) ||
      columns.find((c) => c.id === overId);

    if (!activeCol || !overCol) return;

    const sourceCol = columns.find((c) => c.id === activeCol.id);
    const destCol = columns.find((c) => c.id === overCol.id);
    if (!sourceCol || !destCol) return;

    const sourceTasks = [...sourceCol.tasks];
    const activeIndex = sourceTasks.findIndex((t) => t.id === activeId);
    if (activeIndex === -1) return;

    const [movedTask] = sourceTasks.splice(activeIndex, 1);

    let destTasks: TaskData[];
    let newOrder: number;

    if (activeCol.id === overCol.id) {
      const overIndex = sourceTasks.findIndex((t) => t.id === overId);
      sourceTasks.splice(overIndex >= 0 ? overIndex : sourceTasks.length, 0, movedTask);
      destTasks = sourceTasks;
      newOrder = overIndex >= 0 ? overIndex : sourceTasks.length - 1;
    } else {
      destTasks = [...destCol.tasks];
      const overIndex = destTasks.findIndex((t) => t.id === overId);
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
    formData.set("taskId", activeId);
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
              onAddTask={setCreateTaskColumnId}
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
        {activeItem ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xl w-72">
            <p className="text-sm font-medium text-gray-900">{activeItem.title}</p>
            {activeItem.type === "task" && activeItem.subtaskCount > 0 && (
              <p className="mt-1 text-xs text-gray-400">{activeItem.subtaskCount} subtask{activeItem.subtaskCount !== 1 ? "s" : ""}</p>
            )}
            {activeItem.type === "subtask" && (
              <p className="mt-1 text-xs text-gray-400">Subtask</p>
            )}
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

      {createTaskColumnId && (
        <CreateTaskModal
          columnId={createTaskColumnId}
          projectId={projectId}
          members={members}
          labels={labels}
          onClose={() => setCreateTaskColumnId(null)}
          onTaskCreated={() => {
            window.location.reload();
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
