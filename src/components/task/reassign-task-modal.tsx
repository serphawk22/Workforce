"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reassignTask } from "@/actions/reassign";

type Member = { id: string; name: string; email: string };

export function ReassignTaskModal({
  taskId,
  taskTitle,
  currentAssigneeId,
  members,
  onClose,
  onReassigned,
}: {
  taskId: string;
  taskTitle: string;
  currentAssigneeId: string | null;
  members: Member[];
  onClose: () => void;
  onReassigned?: () => void;
}) {
  const router = useRouter();
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentAssignee = members.find((m) => m.id === currentAssigneeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newAssigneeId) {
      setError("Please select a new assignee");
      return;
    }
    if (newAssigneeId === currentAssigneeId) {
      setError("Task is already assigned to this user");
      return;
    }
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("newAssigneeId", newAssigneeId);
    formData.set("reason", reason);

    const result = await reassignTask(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onReassigned?.();
    onClose();
  }

  const filteredMembers = members.filter((m) => m.id !== currentAssigneeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Reassign Task</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{taskTitle}</span>
        </p>

        {currentAssignee && (
          <div className="mb-4 rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Current Assignee</p>
            <p className="text-sm font-medium text-gray-900">{currentAssignee.name}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Assignee *</label>
            <select
              value={newAssigneeId}
              onChange={(e) => setNewAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
              autoFocus
            >
              <option value="">Select an employee...</option>
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for Reassignment</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why is this task being reassigned?"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button type="submit" disabled={loading} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Reassigning..." : "Reassign"}
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
