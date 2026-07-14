"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitWorkUpdate } from "@/actions/work-update";
import { createSubtask, getSubtacks } from "@/actions/subtask";

type Project = { id: string; name: string; key: string; tasks: { id: string; title: string; issueKey: string | null }[] };
type Subtask = { id: string; title: string; status: string; createdBy: string; createdAt: string; updatedAt: string };

export function WorkUpdateForm({ projects: initialProjects, onClose }: { projects: Project[]; onClose: () => void }) {
  const router = useRouter();
  const [projects] = useState(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState("");
  const [status, setStatus] = useState("IN_PROGRESS");
  const [progressNotes, setProgressNotes] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [productionUrl, setProductionUrl] = useState("");
  const [timeSpent, setTimeSpent] = useState("0");
  const [loading, setLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [error, setError] = useState("");
  const [isCreatingNewTask, setIsCreatingNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const tasks = selectedProject?.tasks || [];

  const loadSubtasks = useCallback(async (taskId: string) => {
    if (!taskId) { setSubtasks([]); return; }
    const result = await getSubtacks(taskId);
    setSubtasks(result);
  }, []);

  useEffect(() => {
    loadSubtasks(selectedTaskId);
  }, [selectedTaskId, loadSubtasks]);

  async function handleCreateSubtask() {
    if (!newSubtaskTitle.trim() || !selectedTaskId) return;
    const result = await createSubtask(selectedTaskId, newSubtaskTitle.trim());
    if (result.subtask) {
      setSubtasks((prev) => [...prev, { ...result.subtask, createdBy: "", createdAt: "", updatedAt: "" }]);
      setNewSubtaskTitle("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    if (isCreatingNewTask) {
      if (!newTaskTitle.trim()) { setError("Please enter a task title"); setLoading(false); return; }
      if (!selectedProjectId) { setError("Please select a project"); setLoading(false); return; }
    } else {
      if (!selectedTaskId) { setError("Please select a task"); setLoading(false); return; }
    }

    const formData = new FormData();
    formData.set("taskId", selectedTaskId);
    formData.set("subtaskId", selectedSubtaskId);
    formData.set("status", status);
    formData.set("progressNotes", progressNotes);
    formData.set("workSummary", workSummary);
    formData.set("githubLink", githubLink);
    formData.set("productionUrl", productionUrl);
    formData.set("timeSpent", timeSpent);

    if (isCreatingNewTask) {
      formData.set("newTaskTitle", newTaskTitle);
      formData.set("newTaskProjectId", selectedProjectId);
      if (newTaskDescription) formData.set("newTaskDescription", newTaskDescription);
    }

    const result = await submitWorkUpdate(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      onClose();
      router.refresh();
    }
    setLoading(false);
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Update Work</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
            <select value={selectedProjectId} onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedTaskId(""); setSubtasks([]); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" required>
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.key ? `${p.key} - ` : ""}{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Task</label>
            <div className="mb-2 flex gap-2">
              <button type="button" onClick={() => { setIsCreatingNewTask(false); setSelectedTaskId(""); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!isCreatingNewTask ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                Select existing
              </button>
              <button type="button" onClick={() => { setIsCreatingNewTask(true); setSelectedTaskId(""); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${isCreatingNewTask ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                Create new
              </button>
            </div>
            {isCreatingNewTask ? (
              <div className="space-y-2">
                <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" disabled={!selectedProjectId} />
                <textarea value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} rows={2} placeholder="Description (optional)..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" disabled={!selectedProjectId} />
              </div>
            ) : (
              <select value={selectedTaskId} onChange={(e) => { setSelectedTaskId(e.target.value); setSelectedSubtaskId(""); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" disabled={!selectedProjectId}>
                <option value="">Select task...</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.issueKey || ""} {t.title}</option>
                ))}
              </select>
            )}
          </div>

          {selectedTaskId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtask (optional)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <select value={selectedSubtaskId} onChange={(e) => setSelectedSubtaskId(e.target.value)} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="">No specific subtask</option>
                  {subtasks.map((s) => (
                    <option key={s.id} value={s.id}>{s.title} ({s.status})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="New subtask title..." className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                <button type="button" onClick={handleCreateSubtask} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200">+ Add</button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <div className="grid grid-cols-5 gap-2">
              {["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE"].map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${status === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                  {s === "TODO" ? "To Do" : s === "IN_PROGRESS" ? "In Progress" : s === "REVIEW" ? "Review" : s === "TESTING" ? "Testing" : "Done"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Progress Notes</label>
            <textarea value={progressNotes} onChange={(e) => setProgressNotes(e.target.value)} rows={3} placeholder="What progress did you make?" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Today's Work Summary</label>
            <textarea value={workSummary} onChange={(e) => setWorkSummary(e.target.value)} rows={2} placeholder="Brief summary of today's work..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">GitHub Link (optional)</label>
              <input type="url" value={githubLink} onChange={(e) => setGithubLink(e.target.value)} placeholder="https://github.com/..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Production URL (optional)</label>
              <input type="url" value={productionUrl} onChange={(e) => setProductionUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Time Spent (minutes)</label>
            <input type="number" min="0" value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={loading} className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Saving..." : "Save Update"}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
