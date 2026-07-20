"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkUpdateForm } from "./work-update-form";
import { ClipboardList } from "lucide-react";

export function UpdateWorkButton({
  projects,
}: {
  projects: { id: string; name: string; key: string; tasks: { id: string; title: string; code: string | null; issueKey: string | null }[] }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <ClipboardList className="h-4 w-4" />
        Update Work
      </Button>
      {open && <WorkUpdateForm projects={projects} onClose={() => setOpen(false)} />}
    </>
  );
}
