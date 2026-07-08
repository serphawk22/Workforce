"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateTask, deleteTask } from "@/actions/task";
import { createLabel, addTaskLabel, removeTaskLabel } from "@/actions/label";
import { getTaskDetails } from "@/actions/task-queries";
import { CommentSection } from "./comment-section";

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

type Member = { id: string; name: string; email: string };
type Label = { id: string; name: string; color: string };
type SprintItem = { id: string; name: string; status: string };

export function TaskDetailModal({
  task: initialTask,
  projectId,
  members,
  labels,
  sprints,
  onClose,
  onTaskUpdate,
}: {
  task: TaskData;
  projectId: string;
  members: Member[];
  labels: Label[];
  sprints: SprintItem[];
  onClose: () => void;
  onTaskUpdate: (task: TaskData) => void;
}) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id || "");
  const [dueDate, setDueDate] = useState(task.dueDate?.split("T")[0] || "");
  const [taskLabels, setTaskLabels] = useState(task.labels);
  const [loading, setLoading] = useState(false);
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [sprintId, setSprintId] = useState(task.sprintId || "");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3B82F6");

  useEffect(() => {
    getTaskDetails(task.id).then((data) => {
      if (data) {
        setDescription(data.description || "");
        setTitle(data.title);
        setPriority(data.priority);
        setAssigneeId(data.assigneeId || "");
        setDueDate(data.dueDate ? data.dueDate.toISOString().split("T")[0] : "");
        setSprintId(data.sprintId || "");
        setTaskLabels(data.labels.map((l) => l.label));
      }
    });
  }, [task.id]);

  async function handleSave() {
    setLoading(true);
    const formData = new FormData();
    formData.set("id", task.id);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("priority", priority);
    formData.set("assigneeId", assigneeId);
    formData.set("dueDate", dueDate ? new Date(dueDate).toISOString() : "");
    formData.set("sprintId", sprintId || "");

    const result = await updateTask(formData);
    if (result?.success) {
      onTaskUpdate({
        ...task,
        title,
        priority,
        assignee: members.find((m) => m.id === assigneeId) || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels: taskLabels,
        sprintId: sprintId || null,
      });
      setEditing(false);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    const formData = new FormData();
    formData.set("taskId", task.id);
    await deleteTask(formData);
    onClose();
    router.refresh();
  }

  async function handleAddLabel(labelId: string) {
    if (taskLabels.find((l) => l.id === labelId)) return;
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set("labelId", labelId);
    await addTaskLabel(formData);
    const label = labels.find((l) => l.id === labelId);
    if (label) {
      setTaskLabels((prev) => [...prev, label]);
      onTaskUpdate({ ...task, labels: [...taskLabels, label] });
    }
  }

  async function handleRemoveLabel(labelId: string) {
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set("labelId", labelId);
    await removeTaskLabel(formData);
    setTaskLabels((prev) => prev.filter((l) => l.id !== labelId));
    onTaskUpdate({
      ...task,
      labels: taskLabels.filter((l) => l.id !== labelId),
    });
  }

  async function handleCreateLabel() {
    if (!newLabelName) return;
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("name", newLabelName);
    formData.set("color", newLabelColor);
    const result = await createLabel(formData);
    if (result?.id) {
      handleAddLabel(result.id as string);
      setNewLabelName("");
      setShowNewLabel(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                task.priority === "CRITICAL" ? "bg-red-500" :
                task.priority === "HIGH" ? "bg-orange-500" :
                task.priority === "MEDIUM" ? "bg-blue-500" :
                "bg-gray-300"
              }`} />
              <h2 className="text-lg font-semibold text-gray-900">Task</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {!editing ? (
            <div className="space-y-5" onClick={() => setEditing(true)}>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
                {description && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                  priority === "LOW" ? "bg-gray-100 text-gray-700" :
                  priority === "MEDIUM" ? "bg-blue-50 text-blue-700" :
                  priority === "HIGH" ? "bg-orange-50 text-orange-700" :
                  "bg-red-50 text-red-700"
                }`}>
                  {priority}
                </span>
                {task.assignee && (
                  <span className="text-sm text-gray-500">Assigned to {task.assignee.name}</span>
                )}
                {task.dueDate && (
                  <span className="text-sm text-gray-500">Due {new Date(task.dueDate).toLocaleDateString("en-US")}</span>
                )}
                {sprintId && (() => {
                  const s = sprints.find((sp) => sp.id === sprintId);
                  return s ? <span className="text-sm text-gray-500">Sprint: {s.name}</span> : null;
                })()}
              </div>

              {taskLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {taskLabels.map((l) => (
                    <span key={l.id} className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: l.color + "15", color: l.color }}>
                      {l.name}
                    </span>
                  ))}
                </div>
              )}

              <p className="cursor-pointer text-xs text-gray-400 transition-colors hover:text-gray-600">Click to edit...</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee</label>
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900">
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sprint</label>
                <select value={sprintId} onChange={(e) => setSprintId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900">
                  <option value="">No sprint</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Labels</label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {taskLabels.map((l) => (
                    <span key={l.id} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: l.color + "15", color: l.color }}>
                      {l.name}
                      <button onClick={() => handleRemoveLabel(l.id)} className="ml-0.5 opacity-60 hover:opacity-100">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {labels.filter((l) => !taskLabels.find((tl) => tl.id === l.id)).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleAddLabel(l.id)}
                      className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-gray-50"
                      style={{ borderColor: l.color + "40", color: l.color }}
                    >
                      +{l.name}
                    </button>
                  ))}
                  <button onClick={() => setShowNewLabel(!showNewLabel)} className="inline-flex items-center rounded-md border border-gray-200 px-2 py-0.5 text-xs text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
                    + New
                  </button>
                </div>
                {showNewLabel && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="Label name" className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900" />
                    <input type="color" value={newLabelColor} onChange={(e) => setNewLabelColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-gray-200" />
                    <button onClick={handleCreateLabel} className="rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800">Add</button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button onClick={handleSave} disabled={loading} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50">
                  {loading ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleDelete} className="ml-auto text-sm font-medium text-red-500 transition-colors hover:text-red-700">
                  Delete
                </button>
              </div>
            </div>
          )}

          <hr className="my-6 border-gray-100" />
          <CommentSection taskId={task.id} />
        </div>
      </div>
    </div>
  );
}
