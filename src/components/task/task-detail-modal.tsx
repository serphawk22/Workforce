"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { updateTask, deleteTask } from "@/actions/task";
import { createLabel, addTaskLabel, removeTaskLabel } from "@/actions/label";
import { getTaskDetails } from "@/actions/task-queries";
import { getReassignmentHistory } from "@/actions/reassign";
import { CommentSection } from "./comment-section";
import { ReassignTaskModal } from "./reassign-task-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate, formatDateShort } from "@/lib/dates";
import { createSubtask, updateSubtaskStatus, getSubtacks } from "@/actions/subtask";
import { getWorkUpdates, updateWorkSummary } from "@/actions/work-update";
import { uploadAttachment, getAttachments, deleteAttachment } from "@/actions/attachment";

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
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [sprintId, setSprintId] = useState(task.sprintId || "");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3B82F6");
  const [reassignmentHistory, setReassignmentHistory] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "subtasks" | "activity">("details");
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [workUpdates, setWorkUpdates] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [editingSummaryText, setEditingSummaryText] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [productionUrl, setProductionUrl] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const [detailData, setDetailData] = useState<Record<string, unknown>>({});
  const d = detailData as Record<string, string | null>;

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
        setDetailData(data as unknown as Record<string, unknown>);
      }
    });
    getReassignmentHistory(task.id).then(setReassignmentHistory);
    fetch(`/api/activity-log/${task.id}`).then(r => r.ok && r.json()).then(d => {
      if (d?.logs) setActivityLog(d.logs);
    });
    getSubtacks(task.id).then(setSubtasks);
    getWorkUpdates(task.id).then(setWorkUpdates);
    getAttachments(task.id).then(setAttachments);
  }, [task.id]);

  useEffect(() => {
    setGithubLink((d.githubLink as string) || "");
    setProductionUrl((d.productionUrl as string) || "");
  }, [d.githubLink, d.productionUrl]);

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
    formData.set("githubLink", githubLink || "");
    formData.set("productionUrl", productionUrl || "");

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
    const formData = new FormData();
    formData.set("taskId", task.id);
    await deleteTask(formData);
    setShowDeleteConfirm(false);
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

  async function handleCreateSubtask() {
    if (!newSubtaskTitle.trim()) return;
    const result = await createSubtask(task.id, newSubtaskTitle.trim());
    if (result.subtask) {
      setSubtasks((prev) => [...prev, { ...result.subtask, createdBy: session?.user?.name || "" }]);
      setNewSubtaskTitle("");
    }
  }

  async function handleUpdateSubtaskStatus(subtaskId: string, status: string) {
    await updateSubtaskStatus(subtaskId, status);
    setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, status } : s)));
  }

  async function handleUploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadAttachment(task.id, fd);
    if (result.attachment) {
      setAttachments((prev) => [result.attachment, ...prev]);
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDeleteAttachment(attachmentId: string) {
    await deleteAttachment(attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-gray-900/40" onClick={onClose} />
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
              <h2 className="text-lg font-semibold text-gray-900">
                {task.code ? `#${task.code}` : task.issueKey || "Task"}
              </h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="border-b border-gray-100 mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("details")}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "details"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab("subtasks")}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "subtasks"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Subtasks ({subtasks.length})
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "activity"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Activity
              </button>
            </div>
          </div>

          {activeTab === "details" ? (
            <>
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

              {(d.category || d.githubLink || d.productionUrl) && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                  {d.category && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-500">Category:</span>
                      <span className="text-gray-900">{d.category}</span>
                    </div>
                  )}
                  {d.githubLink && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-500">GitHub:</span>
                      <a href={d.githubLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{d.githubLink}</a>
                    </div>
                  )}
                  {d.productionUrl && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-500">Production:</span>
                      <a href={d.productionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{d.productionUrl}</a>
                    </div>
                  )}
                </div>
              )}

              {(d.createdAt || d.dateOfDevAcceptOrStart || d.dateOfDevComplete ||
                d.dateOfQaOrUatStart || d.dateOfQaOrUatComplete ||
                d.dateOfReleaseToProd) && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline</p>
                  <div className="relative pl-6 space-y-0">
                    <TimelineStep label="Requested" date={d.createdAt as string} isFirst />
                    <TimelineStep label="Development Started" date={d.dateOfDevAcceptOrStart as string} />
                    <TimelineStep label="Development Completed" date={d.dateOfDevComplete as string} />
                    <TimelineStep label="QA / UAT Started" date={d.dateOfQaOrUatStart as string} />
                    <TimelineStep label="QA / UAT Completed" date={d.dateOfQaOrUatComplete as string} />
                    <TimelineStep label="Released to Production" date={d.dateOfReleaseToProd as string} isLast />
                  </div>
                </div>
              )}

              {reassignmentHistory.length > 0 && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reassignment History</p>
                  <div className="space-y-3">
                    {reassignmentHistory.map((h: any) => (
                      <div key={h.id} className="flex items-start gap-2 text-xs">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500">
                          <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M3 16v5h5" /><path d="M21 16v5h-5" /><path d="m3 3 7 7" /><path d="m21 3-7 7" /><path d="M10 14l4 4" /><path d="m14 10 4 4" />
                        </svg>
                        <div>
                          <p className="text-gray-900">
                            <span className="font-medium">{h.changedBy?.name}</span> reassigned from{' '}
                            <span className="font-medium">{h.previousAssignee?.name || "Unassigned"}</span> to{' '}
                            <span className="font-medium">{h.newAssignee?.name}</span>
                          </p>
                          {h.reason && <p className="mt-0.5 text-gray-500 italic">&ldquo;{h.reason}&rdquo;</p>}
                          <p className="mt-0.5 text-gray-400">{formatDate(h.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <p className="cursor-pointer text-xs text-gray-400 transition-colors hover:text-gray-600">Click to edit...</p>
                {isAdmin && !editing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowReassignModal(true); }}
                    className="ml-auto rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 transition-colors hover:bg-amber-100"
                  >
                    Reassign
                  </button>
                )}
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">GitHub Link</label>
                <input type="url" value={githubLink} onChange={(e) => setGithubLink(e.target.value)} placeholder="https://github.com/..." className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Production URL</label>
                <input type="url" value={productionUrl} onChange={(e) => setProductionUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Attachments</label>
                <div className="space-y-2">
                  {attachments.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-gray-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="text-gray-700 truncate flex-1">{a.fileName}</span>
                      <span className="text-gray-400">{(a.fileSize / 1024).toFixed(0)}KB</span>
                      <button onClick={() => handleDeleteAttachment(a.id)} className="text-red-400 hover:text-red-600">&times;</button>
                    </div>
                  ))}
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>{uploading ? "Uploading..." : "Upload file"}</span>
                    <input type="file" className="hidden" onChange={handleUploadAttachment} disabled={uploading} />
                  </label>
                </div>
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
                <button onClick={() => setShowDeleteConfirm(true)} className="ml-auto text-sm font-medium text-red-500 transition-colors hover:text-red-700">
                  Delete
                </button>
              </div>
            </div>
          )}
          </>
          ) : activeTab === "subtasks" ? (
            <div className="space-y-4">
              {subtasks.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{subtasks.filter((s: any) => s.status === "DONE").length}/{subtasks.length} completed</span>
                      <span className="text-xs font-medium text-gray-700">{Math.round((subtasks.filter((s: any) => s.status === "DONE").length / subtasks.length) * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200">
                      <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${(subtasks.filter((s: any) => s.status === "DONE").length / subtasks.length) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {subtasks.length === 0 && <p className="text-sm text-gray-400">No subtasks yet.</p>}
                {subtasks.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <select value={s.status} onChange={(e) => handleUpdateSubtaskStatus(s.id, e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">Review</option>
                      <option value="TESTING">Testing</option>
                      <option value="DONE">Done</option>
                    </select>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${s.status === "DONE" ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {s.code && <span className="font-mono text-gray-400 mr-1">#{s.code}</span>}
                        {s.title}
                      </p>
                      <p className="text-xs text-gray-400">{s.createdBy}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="New subtask..." className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <button onClick={handleCreateSubtask} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Add</button>
              </div>

              {workUpdates.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Updates</p>
                  <div className="space-y-3">
                    {workUpdates.map((wu: any) => (
                      <div key={wu.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-medium text-gray-900">{wu.user?.name}</span>
                          <span className="text-xs text-gray-400">{formatDateShort(wu.createdAt)}</span>
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${
                            wu.status === "DONE" ? "bg-emerald-50 text-emerald-700" :
                            wu.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{wu.status.replace("_", " ")}</span>
                          {wu.timeSpent > 0 && <span className="text-xs text-gray-400">{(wu.timeSpent / 60).toFixed(1)}h</span>}
                        </div>
                        {wu.progressNotes && <p className="text-gray-600">{wu.progressNotes}</p>}
                        {editingSummaryId === wu.id ? (
                          <div className="mt-1 flex gap-1">
                            <input value={editingSummaryText} onChange={(e) => setEditingSummaryText(e.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" />
                            <button onClick={async () => { await updateWorkSummary(wu.id, editingSummaryText); setEditingSummaryId(null); }} className="rounded bg-gray-900 px-2 py-1 text-xs text-white">Save</button>
                            <button onClick={() => setEditingSummaryId(null)} className="rounded border border-gray-300 px-2 py-1 text-xs">Cancel</button>
                          </div>
                        ) : wu.workSummary ? (
                          <div className="mt-1 flex items-start gap-1 group">
                            <p className="text-gray-500 italic">{wu.workSummary}</p>
                            {wu.user?.id === session?.user?.id && (
                              <button onClick={() => { setEditingSummaryId(wu.id); setEditingSummaryText(wu.workSummary || ""); }} className="hidden group-hover:inline text-xs text-blue-500 hover:text-blue-700">Edit</button>
                            )}
                          </div>
                        ) : null}
                        {wu.subtask && <p className="mt-1 text-xs text-gray-400">Subtask: {wu.subtask.title}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activityLog.length === 0 && (
                <p className="text-sm text-gray-400">No activity yet.</p>
              )}
              {activityLog.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                    {log.user?.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">
                      <span className="font-medium">{log.user?.name}</span>{" "}
                      {formatActivityAction(log)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{formatDateShort(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <hr className="my-6 border-gray-100" />
          <CommentSection taskId={task.id} />

          {showReassignModal && (
            <ReassignTaskModal
              taskId={task.id}
              taskTitle={task.title}
              currentAssigneeId={task.assignee?.id || null}
              members={members}
              onClose={() => setShowReassignModal(false)}
              onReassigned={() => {
                getReassignmentHistory(task.id).then(setReassignmentHistory);
                router.refresh();
              }}
            />
          )}

          <ConfirmDialog
            open={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Delete Task"
            message="Delete this task? This cannot be undone."
            confirmLabel="Delete"
            danger
          />
        </div>
      </div>
    </div>
  );
}

function formatActivityAction(log: any): string {
  switch (log.action) {
    case "created":
      return "created this task";
    case "assigned":
      return `assigned ${log.newValue || "someone"}`;
    case "reassigned":
      return `reassigned from ${log.oldValue || "Unassigned"} to ${log.newValue || "someone"}`;
    case "status_changed":
      return `changed status to ${log.newValue || "unknown"}`;
    case "priority_changed":
      return `changed priority to ${log.newValue || "unknown"}`;
    case "updated":
      return log.fieldName
        ? `updated ${log.fieldName}${log.newValue ? ` to "${log.newValue}"` : ""}`
        : "updated this task";
    default:
      return `${log.action}${log.newValue ? `: ${log.newValue}` : ""}`;
  }
}

function TimelineStep({ label, date, isFirst, isLast }: { label: string; date: string | null; isFirst?: boolean; isLast?: boolean }) {
  const isCompleted = !!date;
  return (
    <div className="relative pb-6 last:pb-0">
      {!isLast && (
        <div className={`absolute left-0 top-3 bottom-0 w-px ${isCompleted ? "bg-emerald-400" : "bg-gray-200"}`} />
      )}
      <div className={`absolute left-[-5px] top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full ${
        isCompleted ? "bg-emerald-500" : "bg-gray-200"
      }`}>
        {isCompleted && (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-2 w-2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div className="pl-4">
        <span className={`text-xs font-medium ${isCompleted ? "text-gray-900" : "text-gray-400"}`}>
          {label}
        </span>
        {date ? (
          <p className="mt-0.5 text-xs font-semibold text-emerald-700">{formatDate(date)}</p>
        ) : (
          <p className="mt-0.5 text-xs text-gray-400">Pending</p>
        )}
      </div>
    </div>
  );
}
