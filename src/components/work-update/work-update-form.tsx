"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitWorkUpdate, getNextCode } from "@/actions/work-update";
import { createSubtask, getSubtacks } from "@/actions/subtask";
import { Button } from "@/components/ui/button";
import { X, Clock, GitBranch, Globe, ListChecks, Activity } from "lucide-react";

type Project = { id: string; name: string; key: string; tasks: { id: string; title: string; code: string | null; issueKey: string | null }[] };
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
  const [customCode, setCustomCode] = useState("");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const tasks = selectedProject?.tasks || [];

  useEffect(() => {
    let active = true;
    if (!selectedTaskId) {
      setSubtasks([]);
      return;
    }
    getSubtacks(selectedTaskId).then((result) => {
      if (active) setSubtasks(result);
    });
    return () => { active = false; };
  }, [selectedTaskId]);

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
      if (customCode.trim()) formData.set("customCode", customCode.trim());
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background border border-border rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-foreground font-bold text-lg tracking-tight">
            <Activity className="h-5 w-5 text-primary" />
            Update Work
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Project</label>
              <select value={selectedProjectId} onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedTaskId(""); setSubtasks([]); }} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm" required>
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.key ? `${p.key} - ` : ""}{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Task</label>
              <div className="mb-3 flex p-1 bg-muted/50 rounded-xl border border-border/50">
                <button type="button" onClick={() => { setIsCreatingNewTask(false); setSelectedTaskId(""); }} className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${!isCreatingNewTask ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                  Existing Task
                </button>
                <button type="button" onClick={async () => { setIsCreatingNewTask(true); setSelectedTaskId(""); const next = await getNextCode(); setCustomCode(next); }} className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${isCreatingNewTask ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                  Create New Task
                </button>
              </div>
              {isCreatingNewTask ? (
                <div className="space-y-3 p-4 bg-muted/20 border border-border rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-3">
                    <div className="w-24">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Code</label>
                      <input value={customCode} onChange={(e) => setCustomCode(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono text-muted-foreground shadow-sm" disabled={!selectedProjectId} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Task Title</label>
                      <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" disabled={!selectedProjectId} />
                    </div>
                  </div>
                  <textarea value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} rows={2} placeholder="Description (optional)..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" disabled={!selectedProjectId} />
                </div>
              ) : (
                <select value={selectedTaskId} onChange={(e) => { setSelectedTaskId(e.target.value); setSelectedSubtaskId(""); }} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" disabled={!selectedProjectId}>
                  <option value="">Select task...</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.code ? `#${t.code}` : t.issueKey || ""} {t.title}</option>
                  ))}
                </select>
              )}
            </div>

            {selectedTaskId && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><ListChecks className="h-4 w-4 text-muted-foreground" /> Subtask <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
                <div className="flex flex-wrap gap-2 mb-3">
                  <select value={selectedSubtaskId} onChange={(e) => setSelectedSubtaskId(e.target.value)} className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20">
                    <option value="">No specific subtask</option>
                    {subtasks.map((s) => (
                      <option key={s.id} value={s.id}>{s.title} ({s.status.replace("_", " ")})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="New subtask title..." className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  <Button type="button" variant="secondary" size="sm" onClick={handleCreateSubtask}>Add Subtask</Button>
                </div>
              </div>
            )}
          </div>
          
          <hr className="border-border" />

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Current Status</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE"].map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} className={`rounded-xl border px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${status === s ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}>
                  {s === "TODO" ? "To Do" : s === "IN_PROGRESS" ? "In Progress" : s === "REVIEW" ? "Review" : s === "TESTING" ? "Testing" : "Done"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Progress Notes</label>
              <textarea value={progressNotes} onChange={(e) => setProgressNotes(e.target.value)} rows={3} placeholder="What progress did you make?" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Today&apos;s Work Summary <span className="text-muted-foreground font-normal text-xs">(Standup update)</span></label>
              <textarea value={workSummary} onChange={(e) => setWorkSummary(e.target.value)} rows={2} placeholder="Brief summary of today's work for the standup log..." className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><GitBranch className="h-4 w-4 text-muted-foreground" /> GitHub PR Link</label>
              <input type="url" value={githubLink} onChange={(e) => setGithubLink(e.target.value)} placeholder="https://github.com/..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><Globe className="h-4 w-4 text-muted-foreground" /> Production URL</label>
              <input type="url" value={productionUrl} onChange={(e) => setProductionUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" /> Time Spent (hours)</label>
            <input type="number" min="0" step="0.1" value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)} className="w-32 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono" />
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger flex items-center gap-2 font-medium">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger text-white text-xs font-bold">!</span>
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-border mt-4">
            <Button type="submit" variant="primary" size="md" disabled={loading} className="w-full sm:w-auto min-w-[140px]">
              {loading ? "Saving..." : "Save Work Update"}
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

