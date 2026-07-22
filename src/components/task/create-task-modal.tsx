"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/actions/task";

type Member = { id: string; name: string; email: string };
type Label = { id: string; name: string; color: string };
type ProjectItem = { id: string; name: string; key: string };
type EpicItem = { id: string; title: string; issueKey: string | null };
type ParentTaskItem = { id: string; title: string; code: string | null; issueKey: string | null };

export function CreateTaskModal({
  columnId,
  projectId: initialProjectId,
  members,
  labels,
  projects,
  epics,
  parentTasks,
  onClose,
  onTaskCreated,
}: {
  columnId?: string;
  projectId?: string;
  members?: Member[];
  labels?: Label[];
  projects?: ProjectItem[];
  epics?: EpicItem[];
  parentTasks?: ParentTaskItem[];
  onClose: () => void;
  onTaskCreated?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("TASK");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [epicId, setEpicId] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isGlobalCreate = !columnId;

  const isSubtask = issueType === "SUBTASK";

  const issueTypeOptions = [
    { value: "EPIC", label: "Epic", icon: "⬡" },
    { value: "TASK", label: "Task", icon: "☐" },
    { value: "STORY", label: "Story", icon: "📖" },
    { value: "BUG", label: "Bug", icon: "🐛" },
    { value: "FEATURE_REQUEST", label: "Feature Request", icon: "★" },
    { value: "IMPROVEMENT", label: "Improvement", icon: "▲" },
    { value: "SUBTASK", label: "Subtask", icon: "⁝" },
  ] as const;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (isGlobalCreate && !selectedProjectId) {
      setError("Please select a project");
      return;
    }
    if (isSubtask && !parentTaskId) {
      setError("Please select a parent task");
      return;
    }
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("columnId", columnId || "");
    formData.set("title", title);
    formData.set("description", description);
    formData.set("type", issueType);
    formData.set("priority", priority);
    formData.set("assigneeId", assigneeId);
    if (epicId) formData.set("epicId", epicId);
    if (isSubtask && parentTaskId) formData.set("parentTaskId", parentTaskId);
    if (isGlobalCreate) formData.set("projectId", selectedProjectId);
    if (dueDate) formData.set("dueDate", new Date(dueDate).toISOString());
    selectedLabelIds.forEach((id) => formData.append("labelIds", id));

    const result = await createTask(formData);
    if (result?.error) {
      const errMsg = typeof result.error === "object" ? Object.values(result.error).flat().join(", ") : "Failed to create task";
      setError(errMsg);
      setLoading(false);
      return;
    }

    router.refresh();
    onTaskCreated?.();
    onClose();
  }

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  }

  const availableMembers = members || [];
  const availableLabels = labels || [];
  const availableParentTasks = parentTasks || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Issue</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isGlobalCreate && projects && projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Project *</label>
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900">
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.key ? `${p.key} - ` : ""}{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Issue Type</label>
            <div className="flex flex-wrap gap-2">
              {issueTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIssueType(opt.value)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                    issueType === opt.value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {isSubtask && availableParentTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Parent Task *</label>
              <select value={parentTaskId} onChange={(e) => setParentTaskId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900">
                <option value="">Select parent task...</option>
                {availableParentTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.code ? `#${t.code} ` : ""}{t.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Summary *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add details..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
            />
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
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900" />
          </div>

          {availableLabels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Labels</label>
              <div className="flex flex-wrap gap-1.5">
                {availableLabels.map((l) => {
                  const selected = selectedLabelIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLabel(l.id)}
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${selected ? "text-white" : "border hover:bg-gray-50"}`}
                      style={{
                        backgroundColor: selected ? l.color : "transparent",
                        borderColor: selected ? "transparent" : l.color + "40",
                        color: selected ? "#fff" : l.color,
                      }}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {issueType === "TASK" && epics && epics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Epic</label>
              <select value={epicId} onChange={(e) => setEpicId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900">
                <option value="">No epic</option>
                {epics.map((e: EpicItem) => (
                  <option key={e.id} value={e.id}>{e.issueKey || e.title}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button type="submit" disabled={loading} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Creating..." : "Create Issue"}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
