import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

function ProjectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PersonsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default async function MyProjectsPage() {
  const session = await requireSetup();

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const tasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: {
        select: {
          name: true,
          board: {
            select: {
              id: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  const projectMap = new Map<string, { id: string; name: string; total: number; completed: number; inProgress: number; boardId: string }>();
  for (const t of tasks) {
    const projectId = t.column.board.project.id;
    const existing = projectMap.get(projectId);
    const isDone = ["Done", "Released", "Closed"].includes(t.column.name);
    const isInProgress = ["In Progress", "Review"].includes(t.column.name);
    if (existing) {
      existing.total++;
      if (isDone) existing.completed++;
      if (isInProgress) existing.inProgress++;
    } else {
      projectMap.set(projectId, {
        id: projectId,
        name: t.column.board.project.name,
        total: 1,
        completed: isDone ? 1 : 0,
        inProgress: isInProgress ? 1 : 0,
        boardId: t.column.board.id,
      });
    }
  }

  const projects = Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-slate-50 min-h-screen">
      <Nav workspaces={workspaces} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Projects</h1>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-gray-400">No projects with assigned tasks yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => {
              const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/project/${p.id}`}
                  className="flex items-center gap-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ProjectIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-gray-900 truncate">{p.name}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>{p.total} task{p.total !== 1 ? "s" : ""}</span>
                      <span className="text-emerald-600 font-medium">{p.completed} completed</span>
                      {p.inProgress > 0 && <span className="text-blue-600">{p.inProgress} in progress</span>}
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 0 ? "bg-emerald-500" : "bg-gray-200"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-semibold text-gray-700">{pct}%</span>
                    <p className="text-xs text-gray-400">complete</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
