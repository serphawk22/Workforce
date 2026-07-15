"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProjectModal } from "@/components/create-project-modal";
import { CreateTaskModal } from "@/components/task/create-task-modal";

type Member = { id: string; name: string; email: string };
type Project = { id: string; name: string; key: string };
type Workspace = { id: string; name: string };
type Label = { id: string; name: string; color: string };

export function AdminWorkflowActions({
  workspace,
  members,
  projects,
  labels,
}: {
  workspace?: Workspace | null;
  members: Member[];
  projects: Project[];
  labels: Label[];
}) {
  const router = useRouter();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {workspace && (
            <button
              onClick={() => setShowCreateProject(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Project
            </button>
          )}
          <button
            onClick={() => setShowCreateTask(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Task
          </button>
          <a
            href="/admin/work-updates"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
            Work Updates
          </a>
          <a
            href="/reports"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Reports
          </a>
          <a
            href="/admin/analytics"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Analytics
          </a>
        </div>
      </div>

      {workspace && showCreateProject && (
        <CreateProjectModal
          workspaceId={workspace.id}
          open={showCreateProject}
          onClose={() => setShowCreateProject(false)}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          members={members}
          projects={projects.map((p) => ({ id: p.id, name: p.name, key: p.key }))}
          labels={labels}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => router.refresh()}
        />
      )}
    </>
  );
}
