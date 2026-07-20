"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { addProjectMember, removeProjectMember } from "@/actions/project-members";

type MemberItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
};

export function ProjectMembersClient({
  projectId,
  members: initialMembers,
  canManage,
  currentUserId,
}: {
  projectId: string;
  workspaceId: string;
  members: MemberItem[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const result = await addProjectMember(projectId, email.trim());
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setEmail("");
    setLoading(false);
    router.refresh();
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this project?`)) return;
    setRemoving(userId);
    setError("");

    const result = await removeProjectMember(projectId, userId);
    if (result.error) {
      setError(result.error);
      setRemoving(null);
      return;
    }

    setRemoving(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email to add member..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <Avatar name={m.name} url={m.avatarUrl} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{m.name}</p>
              <p className="text-xs text-gray-500">{m.email}</p>
            </div>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{m.role}</span>
            {canManage && m.userId !== currentUserId && m.role !== "OWNER" && (
              <button
                onClick={() => handleRemove(m.userId, m.name)}
                disabled={removing === m.userId}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {removing === m.userId ? "Removing..." : "Remove"}
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No members</p>
        )}
      </div>
    </div>
  );
}
