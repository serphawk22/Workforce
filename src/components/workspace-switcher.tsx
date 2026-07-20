"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, Building2 } from "lucide-react";

export function WorkspaceSwitcher({
  workspaces,
  currentId,
}: {
  workspaces: { id: string; name: string }[];
  currentId?: string;
}) {
  const router = useRouter();
  return (
    <div className="relative">
      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <select
        value={currentId || ""}
        onChange={(e) => { if (e.target.value) router.push(`/workspace/${e.target.value}`); }}
        className="w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-8 py-2 text-sm text-gray-700 transition-colors hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer"
      >
        {!currentId && <option value="">All workspaces</option>}
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
