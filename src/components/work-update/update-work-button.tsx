"use client";

import { useState } from "react";
import { WorkUpdateForm } from "./work-update-form";

type Project = { id: string; name: string; key: string; tasks: { id: string; title: string; code: string | null; issueKey: string | null }[] };

export function UpdateWorkButton({ projects }: { projects: Project[] }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Update Work
      </button>
      {showForm && <WorkUpdateForm projects={projects} onClose={() => setShowForm(false)} />}
    </>
  );
}
