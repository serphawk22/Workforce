"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { updateTask, deleteTask } from "@/actions/task";
import { createLabel, addTaskLabel, removeTaskLabel } from "@/actions/label";
import { getTaskDetails } from "@/actions/task-queries";
import { getReassignmentHistory } from "@/actions/reassign";
import { CommentSection } from "./comment-section";
import { ReassignTaskModal } from "./reassign-task-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatDateShort } from "@/lib/dates";
import { createSubtask, updateSubtaskStatus, getSubtacks } from "@/actions/subtask";
import { getWorkUpdates, updateWorkSummary } from "@/actions/work-update";
import { uploadAttachment, getAttachments, deleteAttachment } from "@/actions/attachment";
import {
  X,
  Calendar,
  User,
  Tag,
  Link2,
  Globe,
  Clock,
  GitBranch,
  Plus,
  Trash2,
  Upload,
  FileText,
  MessageSquare,
  ListChecks,
  Activity,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

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
    onTaskUpdate({ ...task, labels: taskLabels.filter((l) => l.id !== labelId) });
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
    const result = await updateSubtaskStatus(subtaskId, status);
    if (result?.error) return;
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

  const priorityColors: Record<string, string> = {
    CRITICAL: "bg-red-500", HIGH: "bg-amber-500", MEDIUM: "bg-blue-500", LOW: "bg-gray-400",
  };
  const priorityLabels: Record<string, string> = {
    CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low",
  };

  const tabs = [
    { id: "details" as const, label: "Details", icon: FileText },
    { id: "subtasks" as const, label: `Subtasks (${subtasks.length})`, icon: ListChecks },
    { id: "activity" as const, label: "Activity", icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-2xl shadow-gray-900/20 overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${priorityColors[task.priority] || "bg-gray-400"}`} />
            <div>
              <span className="text-sm font-medium text-gray-900">
                {task.code ? `#${task.code}` : task.issueKey || "Task"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && !editing && (
              <Button variant="secondary" size="sm" onClick={() => setShowReassignModal(true)}>
                Reassign
              </Button>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex gap-1 border-b border-gray-100 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "details" ? (
            <>
              {!editing ? (
                <div className="space-y-6" onClick={() => setEditing(true)}>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h2>
                    {description && (
                      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className={`h-2.5 w-2.5 rounded-full ${priorityColors[task.priority] || "bg-gray-400"}`} />
                      {priorityLabels[task.priority] || task.priority}
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="h-4 w-4 text-gray-400" />
                        {task.assignee.name}
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    )}
                    {sprintId && (() => {
                      const s = sprints.find((sp) => sp.id === sprintId);
                      return s ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <GitBranch className="h-4 w-4 text-gray-400" />
                          {s.name}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {taskLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {taskLabels.map((l) => (
                        <span key={l.id} className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: l.color + "15", color: l.color }}>
                          {l.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {(d.category || d.githubLink || d.productionUrl) && (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                      {d.category && (
                        <div className="flex items-center gap-2 text-sm">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500">Category:</span>
                          <span className="text-gray-900 font-medium">{d.category}</span>
                        </div>
                      )}
                      {d.githubLink && (
                        <div className="flex items-center gap-2 text-sm">
                          <GitBranch className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500">GitHub:</span>
                          <a href={d.githubLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                            {d.githubLink} <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {d.productionUrl && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500">Production:</span>
                          <a href={d.productionUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                            {d.productionUrl} <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {(d.createdAt || d.dateOfDevAcceptOrStart || d.dateOfDevComplete ||
                    d.dateOfQaOrUatStart || d.dateOfQaOrUatComplete || d.dateOfReleaseToProd) && (
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Timeline</p>
                      <div className="relative pl-6">
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
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Reassignment History</p>
                      <div className="space-y-3">
                        {reassignmentHistory.map((h: any) => (
                          <div key={h.id} className="flex items-start gap-3 text-sm">
                            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                              <User className="h-3 w-3" />
                            </div>
                            <div>
                              <p className="text-gray-900">
                                <span className="font-medium">{h.changedBy?.name}</span> reassigned from{' '}
                                <span className="font-medium">{h.previousAssignee?.name || "Unassigned"}</span> to{' '}
                                <span className="font-medium">{h.newAssignee?.name}</span>
                              </p>
                              {h.reason && <p className="mt-0.5 text-gray-500 italic">&ldquo;{h.reason}&rdquo;</p>}
                              <p className="mt-0.5 text-xs text-gray-400">{formatDate(h.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <p className="text-xs text-gray-400">Click anywhere to edit...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 resize-y" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                      <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee</label>
                      <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10">
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sprint</label>
                    <select value={sprintId} onChange={(e) => setSprintId(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10">
                      <option value="">No sprint</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">GitHub Link</label>
                    <input type="url" value={githubLink} onChange={(e) => setGithubLink(e.target.value)} placeholder="https://github.com/..." className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Production URL</label>
                    <input type="url" value={productionUrl} onChange={(e) => setProductionUrl(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Attachments</label>
                    {attachments.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {attachments.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm">
                            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-gray-700 truncate flex-1">{a.fileName}</span>
                            <span className="text-xs text-gray-400">{(a.fileSize / 1024).toFixed(0)} KB</span>
                            <button onClick={() => handleDeleteAttachment(a.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>{uploading ? "Uploading..." : "Upload file"}</span>
                      <input type="file" className="hidden" onChange={handleUploadAttachment} disabled={uploading} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Labels</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {taskLabels.map((l) => (
                        <span key={l.id} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: l.color + "15", color: l.color }}>
                          {l.name}
                          <button onClick={() => handleRemoveLabel(l.id)} className="opacity-60 hover:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {labels.filter((l) => !taskLabels.find((tl) => tl.id === l.id)).map((l) => (
                        <button
                          key={l.id}
                          onClick={() => handleAddLabel(l.id)}
                          className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-gray-50"
                          style={{ borderColor: l.color + "40", color: l.color }}
                        >
                          + {l.name}
                        </button>
                      ))}
                      <button onClick={() => setShowNewLabel(!showNewLabel)} className="inline-flex items-center rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
                        <Plus className="h-3 w-3 mr-1" /> New
                      </button>
                    </div>
                    {showNewLabel && (
                      <div className="flex items-center gap-2 mt-3">
                        <input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="Label name" className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10" />
                        <input type="color" value={newLabelColor} onChange={(e) => setNewLabelColor(e.target.value)} className="h-9 w-9 cursor-pointer rounded-xl border border-gray-200" />
                        <Button variant="primary" size="sm" onClick={handleCreateLabel}>Add</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <Button variant="primary" size="md" onClick={handleSave} loading={loading}>Save</Button>
                    <Button variant="secondary" size="md" onClick={() => setEditing(false)}>Cancel</Button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="ml-auto flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700 transition-colors">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : activeTab === "subtasks" ? (
            <div className="space-y-5">
              {subtasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{subtasks.filter((s: any) => s.status === "DONE").length}/{subtasks.length} completed</span>
                    <span className="text-xs font-medium text-gray-700">
                      {Math.round((subtasks.filter((s: any) => s.status === "DONE").length / subtasks.length) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(subtasks.filter((s: any) => s.status === "DONE").length / subtasks.length) * 100}%` }} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {subtasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No subtasks yet.</p>
                )}
                {subtasks.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                    <select value={s.status} onChange={(e) => handleUpdateSubtaskStatus(s.id, e.target.value)}
                      className="rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs bg-white transition-colors hover:border-gray-300">
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
                <input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="New subtask..." className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition-all hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10" />
                <Button variant="primary" size="md" onClick={handleCreateSubtask}>Add</Button>
              </div>

              {workUpdates.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Work Updates</p>
                  <div className="space-y-3">
                    {workUpdates.map((wu: any) => (
                      <div key={wu.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium text-gray-900">{wu.user?.name}</span>
                          <span className="text-xs text-gray-400">
                            {wu.createdAt ? formatDateShort(wu.createdAt) : ""}
                          </span>
                          <Badge variant={
                            wu.status === "DONE" ? "success" :
                            wu.status === "IN_PROGRESS" ? "info" : "default"
                          } size="sm">
                            {wu.status.replace("_", " ")}
                          </Badge>
                          {wu.timeSpent > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {(wu.timeSpent / 60).toFixed(1)}h
                            </span>
                          )}
                        </div>
                        {wu.progressNotes && <p className="text-gray-600">{wu.progressNotes}</p>}
                        {editingSummaryId === wu.id ? (
                          <div className="mt-2 flex gap-2">
                            <input value={editingSummaryText} onChange={(e) => setEditingSummaryText(e.target.value)}
                              className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs" />
                            <Button variant="primary" size="sm" onClick={async () => { await updateWorkSummary(wu.id, editingSummaryText); setEditingSummaryId(null); }}>Save</Button>
                            <Button variant="secondary" size="sm" onClick={() => setEditingSummaryId(null)}>Cancel</Button>
                          </div>
                        ) : wu.workSummary ? (
                          <div className="mt-1 flex items-start gap-1 group">
                            <p className="text-gray-500 italic text-xs">{wu.workSummary}</p>
                            {wu.user?.id === session?.user?.id && (
                              <button onClick={() => { setEditingSummaryId(wu.id); setEditingSummaryText(wu.workSummary || ""); }}
                                className="hidden group-hover:inline text-xs text-primary hover:text-primary/80">Edit</button>
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
                <p className="text-sm text-gray-400 text-center py-6">No activity yet.</p>
              )}
              {activityLog.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <Avatar name={log.user?.name || "?"} size="sm" />
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
        </div>

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
  );
}

function formatActivityAction(log: any): string {
  switch (log.action) {
    case "created": return "created this task";
    case "assigned": return `assigned ${log.newValue || "someone"}`;
    case "reassigned": return `reassigned from ${log.oldValue || "Unassigned"} to ${log.newValue || "someone"}`;
    case "status_changed": return `changed status to ${log.newValue || "unknown"}`;
    case "priority_changed": return `changed priority to ${log.newValue || "unknown"}`;
    case "updated": return log.fieldName ? `updated ${log.fieldName}${log.newValue ? ` to "${log.newValue}"` : ""}` : "updated this task";
    default: return `${log.action}${log.newValue ? `: ${log.newValue}` : ""}`;
  }
}

function TimelineStep({ label, date, isFirst, isLast }: { label: string; date: string | null; isFirst?: boolean; isLast?: boolean }) {
  const isCompleted = !!date;
  return (
    <div className="relative pb-5 last:pb-0">
      {!isLast && (
        <div className={`absolute left-[5px] top-3 bottom-0 w-px ${isCompleted ? "bg-green-400" : "bg-gray-200"}`} />
      )}
      <div className={`absolute left-0 top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />
      <div className="pl-5">
        <span className={`text-xs font-medium ${isCompleted ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
        {date ? (
          <p className="mt-0.5 text-xs font-semibold text-green-700">{formatDate(date)}</p>
        ) : (
          <p className="mt-0.5 text-xs text-gray-400">Pending</p>
        )}
      </div>
    </div>
  );
}
