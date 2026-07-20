"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitDailyWork, getProjectTasks, getYesterdaysPlan } from "@/actions/daily-work";
import { Check } from "lucide-react";

type Employee = { id: string; name: string; email: string; department: string | null };
type Project = { id: string; name: string; key: string };

export function DailyWorkForm({ employees, projects }: { employees: Employee[]; projects: Project[] }) {
  const router = useRouter();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [projectId, setProjectId] = useState("");
  const [tasks, setTasks] = useState<{ id: string; title: string; code: string | null }[]>([]);
  const [taskId, setTaskId] = useState("");
  const [isNewTask, setIsNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [todayWork, setTodayWork] = useState("");
  const [tomorrowTask, setTomorrowTask] = useState("");
  const [blockers, setBlockers] = useState("");
  const [yesterdayPlan, setYesterdayPlan] = useState<string | null>(null);
  const [yesterdayPlanId, setYesterdayPlanId] = useState<string | null>(null);
  const [yesterdayStatuses, setYesterdayStatuses] = useState<{task: string; status: string}[]>([]);
  const [links, setLinks] = useState<{ type: string; url: string }[]>([]);
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loadTasks = useCallback(async (pid: string) => {
    if (!pid) { setTasks([]); return; }
    const result = await getProjectTasks(pid);
    setTasks(result);
  }, []);

  useEffect(() => {
    loadTasks(projectId);
  }, [projectId, loadTasks]);

  const loadYesterdayPlan = useCallback(async (empId: string) => {
    const plan = await getYesterdaysPlan(empId);
    if (plan) {
      setYesterdayPlan(plan.tomorrowTask);
      setYesterdayPlanId(plan.id);
    }
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadYesterdayPlan(selectedEmployee.id);
    }
  }, [selectedEmployee, loadYesterdayPlan]);

  function selectEmployee(emp: Employee) {
    setSelectedEmployee(emp);
    setYesterdayPlan(null);
    setYesterdayStatuses([]);
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setProjectId(e.target.value);
    setTaskId("");
    setIsNewTask(false);
  }

  function addLink() {
    setLinks([...links, { type: "GitHub PR", url: "" }]);
  }

  function updateLink(index: number, field: keyof typeof links[0], value: string) {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
  }

  function removeLink(index: number) {
    setLinks(links.filter((_, i) => i !== index));
  }

  function addAttachment() {
    setAttachments([...attachments, { name: "", url: "", type: "image" }]);
  }

  function updateAttachment(index: number, field: keyof typeof attachments[0], value: string) {
    const updated = [...attachments];
    updated[index] = { ...updated[index], [field]: value };
    setAttachments(updated);
  }

  function removeAttachment(index: number) {
    setAttachments(attachments.filter((_, i) => i !== index));
  }

  function setYesterdayTaskStatus(task: string, status: string) {
    setYesterdayStatuses((prev) => {
      const existing = prev.find((s) => s.task === task);
      if (existing) {
        return prev.map((s) => s.task === task ? { ...s, status } : s);
      }
      return [...prev, { task, status }];
    });
  }

  function getYesterdayTaskStatus(task: string): string {
    return yesterdayStatuses.find((s) => s.task === task)?.status || "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!selectedEmployee) {
      setError("Please select your name");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.set("employeeId", selectedEmployee.id);
    formData.set("projectId", projectId);
    formData.set("taskId", isNewTask ? "__new__" : taskId);
    if (isNewTask) formData.set("newTaskTitle", newTaskTitle);
    formData.set("todayWork", todayWork);
    formData.set("tomorrowTask", tomorrowTask);
    formData.set("blockers", blockers);

    if (yesterdayPlan) {
      formData.set("yesterdayPlan", JSON.stringify(yesterdayPlan.split("\n").filter(Boolean).map((t) => t.trim())));
      formData.set("yesterdayCompleted", JSON.stringify(yesterdayStatuses));
    }

    if (links.length > 0) {
      formData.set("referenceLinks", JSON.stringify(links.filter((l) => l.url.trim())));
    }
    if (attachments.length > 0) {
      formData.set("attachments", JSON.stringify(attachments.filter((a) => a.name || a.url)));
    }

    const result = await submitDailyWork(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Daily Work Submitted!</h2>
        <p className="text-sm text-gray-500 mb-6">Your daily work has been recorded successfully.</p>
        <button
          onClick={() => {
            setSuccess(false);
            setSelectedEmployee(null);
            setProjectId("");
            setTaskId("");
            setIsNewTask(false);
            setNewTaskTitle("");
            setTodayWork("");
            setTomorrowTask("");
            setBlockers("");
            setYesterdayPlan(null);
            setYesterdayStatuses([]);
            setLinks([]);
            setAttachments([]);
          }}
          className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <label className="mb-3 block text-sm font-medium text-gray-700">Select Your Name</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {employees.map((emp) => {
            const isSelected = selectedEmployee?.id === emp.id;
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => selectEmployee(emp)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-gray-900 bg-gray-50 text-gray-900"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                  isSelected ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300"
                }`}>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </div>
                <span className="truncate">{emp.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Project</label>
        <select
          value={projectId}
          onChange={handleProjectChange}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
        >
          <option value="">Select project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.key ? `${p.key} - ` : ""}{p.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Task</label>
        {isNewTask ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Enter new task title..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => { setIsNewTask(false); setNewTaskTitle(""); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Select existing task instead
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
              disabled={!projectId}
            >
              <option value="">Select task...</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.code ? `#${t.code} ` : ""}{t.title}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => { setIsNewTask(true); setTaskId(""); }}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              + Create New Task
            </button>
          </div>
        )}
      </div>

      {yesterdayPlan && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Yesterday's Planned Task</label>
          <p className="text-xs text-gray-400 mb-3">Mark each task as completed, partially completed, or not completed</p>
          <div className="space-y-3">
            {yesterdayPlan.split("\n").filter(Boolean).map((task, i) => {
              const t = task.trim();
              const currentStatus = getYesterdayTaskStatus(t);
              return (
                <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">{t}</p>
                  <div className="flex gap-2">
                    {[
                      { value: "COMPLETED", label: "Completed" },
                      { value: "PARTIALLY", label: "Partially" },
                      { value: "NOT_COMPLETED", label: "Not Completed" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                          currentStatus === option.value
                            ? "border-gray-900 bg-gray-100 text-gray-900"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`yesterday-${i}`}
                          value={option.value}
                          checked={currentStatus === option.value}
                          onChange={() => setYesterdayTaskStatus(t, option.value)}
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Today's Work</label>
        <textarea
          value={todayWork}
          onChange={(e) => setTodayWork(e.target.value)}
          rows={4}
          placeholder="What did you work on today?&#10;e.g.&#10;Fixed login issue&#10;Completed dashboard&#10;Created API"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Tomorrow's Task</label>
        <textarea
          value={tomorrowTask}
          onChange={(e) => setTomorrowTask(e.target.value)}
          rows={4}
          placeholder="What will you work on tomorrow?&#10;e.g.&#10;Implement notifications&#10;Fix responsive UI&#10;Review PR"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Blockers <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          rows={3}
          placeholder="Any blockers or issues you're facing?"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Reference Links <span className="text-gray-400 font-normal">(optional)</span></label>
          <button
            type="button"
            onClick={addLink}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            + Add Link
          </button>
        </div>
        {links.length === 0 ? (
          <p className="text-sm text-gray-400">No links added yet</p>
        ) : (
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={link.type}
                  onChange={(e) => updateLink(i, "type", e.target.value)}
                  className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-gray-400 focus:outline-none"
                >
                  <option value="GitHub PR">GitHub PR</option>
                  <option value="Figma">Figma</option>
                  <option value="Deployment">Deployment</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Attachments <span className="text-gray-400 font-normal">(optional)</span></label>
          <button
            type="button"
            onClick={addAttachment}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            + Add Attachment
          </button>
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-gray-400">No attachments added yet</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={att.type}
                  onChange={(e) => updateAttachment(i, "type", e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-gray-400 focus:outline-none"
                >
                  <option value="image">Image</option>
                  <option value="pdf">PDF</option>
                  <option value="zip">ZIP</option>
                  <option value="document">Document</option>
                </select>
                <input
                  type="text"
                  value={att.name}
                  onChange={(e) => updateAttachment(i, "name", e.target.value)}
                  placeholder="File name..."
                  className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                />
                <input
                  type="url"
                  value={att.url}
                  onChange={(e) => updateAttachment(i, "url", e.target.value)}
                  placeholder="URL..."
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>

      <p className="text-center text-xs text-gray-400 pb-8">
        Your daily work will be saved and visible to your admin
      </p>
    </form>
  );
}
