"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Member = { id: string; name: string };
type Label = { id: string; name: string; color: string };

export function FilterBar({
  members,
  labels,
}: {
  members: Member[];
  labels: Label[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const currentAssignee = searchParams.get("assignee");
  const currentPriority = searchParams.get("priority");
  const currentLabel = searchParams.get("label");

  function clearFilters() {
    router.push(window.location.pathname);
  }

  const hasFilters = currentAssignee || currentPriority || currentLabel;

  const selectClass = "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-all hover:border-gray-400 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={currentAssignee || ""}
        onChange={(e) => updateFilter("assignee", e.target.value || null)}
        className={selectClass}
      >
        <option value="">All assignees</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <select
        value={currentPriority || ""}
        onChange={(e) => updateFilter("priority", e.target.value || null)}
        className={selectClass}
      >
        <option value="">All priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>

      <select
        value={currentLabel || ""}
        onChange={(e) => updateFilter("label", e.target.value || null)}
        className={selectClass}
      >
        <option value="">All labels</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
