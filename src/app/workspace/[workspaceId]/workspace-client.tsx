"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteMember, removeMember, resendInvitation, cancelInvitation } from "@/actions/workspace";
import { deleteProject } from "@/actions/project";
import { CreateProjectModal } from "@/components/create-project-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Project = { id: string; name: string; description: string | null; createdAt: string };
type Member = { id: string; name: string; email: string; avatarUrl: string | null; role: string };
type Invite = { id: string; email: string; status: string; createdAt: string; expiresAt: string };

export function WorkspaceClient({
  workspaceId,
  projects,
  members,
  invites,
  canManage,
  isOwner,
}: {
  workspaceId: string;
  projects: Project[];
  members: Member[];
  invites: Invite[];
  canManage: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    const formData = new FormData();
    formData.set("email", inviteEmail);
    formData.set("workspaceId", workspaceId);
    const result = await inviteMember(formData);
    if (result?.error) {
      setInviteError(Object.values(result.error).flat()[0] as string);
    } else {
      const r = result as Record<string, unknown>;
      if (r?.warning) {
        setInviteError(r.warning as string);
      } else {
        setInviteEmail("");
        setShowInvite(false);
      }
      setInviteSuccess(true);
      router.refresh();
    }
  }

  async function handleRemoveMember(userId: string) {
    const formData = new FormData();
    formData.set("workspaceId", workspaceId);
    formData.set("userId", userId);
    await removeMember(formData);
    router.refresh();
  }

  async function handleResend(inviteId: string) {
    const formData = new FormData();
    formData.set("inviteId", inviteId);
    await resendInvitation(formData);
    router.refresh();
  }

  async function handleCancel(inviteId: string) {
    const formData = new FormData();
    formData.set("inviteId", inviteId);
    await cancelInvitation(formData);
    router.refresh();
  }

  async function handleDeleteProject(projectId: string) {
    const formData = new FormData();
    formData.set("projectId", projectId);
    await deleteProject(formData);
    setDeleteProjectId(null);
    router.refresh();
  }

  const expiredInvites = invites.filter((i) => new Date(i.expiresAt) < new Date());
  const activeInvites = invites.filter((i) => new Date(i.expiresAt) >= new Date());

  return (
    <>
      <div className="flex gap-3 mb-6">
        {canManage && (
          <>
            <button
              onClick={() => setShowCreateProject(true)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              New Project
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Invite Member
            </button>
          </>
        )}
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowInvite(false); setInviteError(null); }} />
          <div className="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Member</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                />
              </div>
              {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
              {inviteSuccess && <p className="text-sm text-emerald-600">Invitation sent!</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowInvite(false); setInviteError(null); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800">
                  Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Projects</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-400">No projects yet</p>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
                  <a href={`/project/${p.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>
                    )}
                  </a>
                  {canManage && (
                    <button
                      onClick={() => setDeleteProjectId(p.id)}
                      className="ml-4 shrink-0 text-sm font-medium text-gray-400 transition-colors hover:text-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Members</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                    m.role === "OWNER" ? "bg-amber-50 text-amber-700" :
                    m.role === "ADMIN" ? "bg-blue-50 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {m.role}
                  </span>
                  {canManage && m.role !== "OWNER" && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-xs font-medium text-gray-400 transition-colors hover:text-red-500"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {invites.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Pending Invites</h3>
              <div className="space-y-2">
                {activeInvites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{i.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Pending
                        </span>
                        <span className="text-xs text-gray-400">
                          Expires {new Date(i.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleResend(i.id)}
                          className="text-xs font-medium text-gray-500 transition-colors hover:text-blue-600"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleCancel(i.id)}
                          className="text-xs font-medium text-gray-400 transition-colors hover:text-red-500"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {expiredInvites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 opacity-60">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{i.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Expired
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleResend(i.id)}
                          className="text-xs font-medium text-gray-500 transition-colors hover:text-blue-600"
                        >
                          Resend
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal
        workspaceId={workspaceId}
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />

      <ConfirmDialog
        open={!!deleteProjectId}
        onClose={() => setDeleteProjectId(null)}
        onConfirm={() => deleteProjectId && handleDeleteProject(deleteProjectId)}
        title="Delete Project"
        message="Delete this project? This cannot be undone. All boards, columns, and tasks will be permanently removed."
        confirmLabel="Delete"
        danger
      />
    </>
  );
}
