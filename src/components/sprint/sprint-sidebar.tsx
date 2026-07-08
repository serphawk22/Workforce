"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { createSprint, startSprint, completeSprint, deleteSprint } from "@/actions/sprint";

type SprintData = {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  _count: { tasks: number };
};

export function SprintSidebar({
  projectId,
  sprints,
}: {
  projectId: string;
  sprints: SprintData[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isBacklog = pathname === `/project/${projectId}/backlog`;
  const isOnSprint = pathname.startsWith(`/project/${projectId}/sprint/`);
  const activeSprint = sprints.find((s) => s.status === "ACTIVE");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("projectId", projectId);
    const result = await createSprint(formData);
    if (result?.error) {
      setError(Object.values(result.error).flat()[0] as string);
      setLoading(false);
    } else if (result?.id) {
      setShowForm(false);
      router.refresh();
    }
  }

  async function handleStart(sprintId: string) {
    const formData = new FormData();
    formData.set("sprintId", sprintId);
    await startSprint(formData);
    router.refresh();
  }

  async function handleComplete(sprintId: string) {
    if (!confirm("Complete this sprint?")) return;
    const formData = new FormData();
    formData.set("sprintId", sprintId);
    await completeSprint(formData);
    router.refresh();
  }

  async function handleDelete(sprintId: string) {
    if (!confirm("Delete this sprint? Tasks will be unassigned.")) return;
    const formData = new FormData();
    formData.set("sprintId", sprintId);
    await deleteSprint(formData);
    router.refresh();
  }

  const statusColors: Record<string, string> = {
    PLANNED: "bg-gray-100 text-gray-700",
    ACTIVE: "bg-green-50 text-green-700",
    COMPLETED: "bg-blue-50 text-blue-700",
  };

  const plannedSprints = sprints.filter((s) => s.status === "PLANNED");
  const completedSprints = sprints.filter((s) => s.status === "COMPLETED");
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white p-5 min-h-[600px]">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Sprints</h2>

      <a
        href={`/project/${projectId}/backlog`}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
          isBacklog ? "bg-gray-100 font-medium text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <span>Backlog</span>
        <span className="text-xs text-gray-400">{sprints.reduce((acc, s) => acc + s._count.tasks, 0)}</span>
      </a>

      {activeSprint && (
        <div className="mt-3">
          <a
            href={`/project/${projectId}/sprint/${activeSprint.id}`}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              isOnSprint && pathname.endsWith(activeSprint.id)
                ? "bg-gray-100 font-medium text-gray-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate font-medium text-green-700">{activeSprint.name}</span>
              <span className="text-xs text-green-600">Active</span>
            </div>
            <span className="ml-2 text-xs text-gray-400">{activeSprint._count.tasks}</span>
          </a>
          <button
            onClick={() => handleComplete(activeSprint.id)}
            className="mt-2 w-full rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800"
          >
            Complete Sprint
          </button>
        </div>
      )}

      {plannedSprints.length > 0 && (
        <div className="mt-4">
          <h3 className="px-3 text-xs font-medium text-gray-500 mb-1.5">Planned</h3>
          <div className="space-y-0.5">
            {plannedSprints.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-gray-50">
                <a
                  href={`/project/${projectId}/sprint/${s.id}`}
                  className={`min-w-0 flex-1 truncate ${
                    isOnSprint && pathname.endsWith(s.id) ? "font-medium text-gray-900" : "text-gray-600"
                  }`}
                >
                  {s.name}
                </a>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-gray-400">{s._count.tasks}</span>
                  <button onClick={() => handleStart(s.id)} className="font-medium text-gray-900 transition-colors hover:text-gray-700">
                    Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 w-full rounded-lg border-2 border-dashed border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
        >
          + New Sprint
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 space-y-2.5">
          <input
            name="name"
            placeholder="Sprint name"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
          />
          <textarea
            name="goal"
            placeholder="Goal (optional)"
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50">
              {loading ? "Creating..." : "Create"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      )}

      {completedSprints.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <span>Completed ({completedSprints.length})</span>
            <span className="text-gray-400">{showCompleted ? "\u25B2" : "\u25BC"}</span>
          </button>
          {showCompleted && (
            <div className="mt-1 space-y-0.5">
              {completedSprints.map((s) => (
                <a
                  key={s.id}
                  href={`/project/${projectId}/sprint/${s.id}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
                    isOnSprint && pathname.endsWith(s.id)
                      ? "bg-gray-100 font-medium text-gray-900"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  <span className="ml-2 text-gray-400">{s._count.tasks}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
