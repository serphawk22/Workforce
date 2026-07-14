"use client";

import { useRouter } from "next/navigation";

export function WorkspaceSwitcher({
  workspaces,
  currentId,
}: {
  workspaces: { id: string; name: string }[];
  currentId?: string;
}) {
  const router = useRouter();
  return (
    <select
      value={currentId || ""}
      onChange={(e) => { if (e.target.value) router.push(`/workspace/${e.target.value}`); }}
      className="max-w-[180px] truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-300 focus:outline-none"
    >
      {!currentId && <option value="">All workspaces</option>}
      {workspaces.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </select>
  );
}
