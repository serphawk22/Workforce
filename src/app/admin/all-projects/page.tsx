import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { Badge } from "@/components/ui/badge";

function ProjectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default async function AdminAllProjectsPage() {
  await requireAdmin();

  const projects = await prisma.project.findMany({
    include: {
      boards: {
        include: {
          columns: {
            include: {
              tasks: {
                include: {
                  assignee: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const enriched = projects.map((project) => {
    const allTasks = project.boards.flatMap((b) => b.columns.flatMap((c) => c.tasks));
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => {
      const colName = project.boards.flatMap((b) => b.columns).find((c) => c.id === t.columnId)?.name;
      return colName && ["Done", "Released", "Closed"].includes(colName);
    }).length;
    const inProgressTasks = allTasks.filter((t) => {
      const colName = project.boards.flatMap((b) => b.columns).find((c) => c.id === t.columnId)?.name;
      return colName && ["In Progress", "Review"].includes(colName);
    }).length;
    const uniqueDevelopers = new Set(allTasks.filter((t) => t.assignee).map((t) => t.assignee!.id));
    const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      id: project.id,
      name: project.name,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks: totalTasks - completedTasks,
      developerCount: uniqueDevelopers.size,
      completionPct,
    };
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Projects</h1>
        <p className="mt-1 text-sm text-gray-500">
          {projects.length} project{projects.length !== 1 ? "s" : ""} across all workspaces
        </p>
      </div>

      {enriched.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-gray-400">No projects found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enriched.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="flex items-center gap-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ProjectIcon />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-gray-900 truncate">{p.name}</p>
                  {p.developerCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <PersonIcon />
                      {p.developerCount}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>{p.totalTasks} task{p.totalTasks !== 1 ? "s" : ""}</span>
                  <span className="text-emerald-600 font-medium">{p.completedTasks} completed</span>
                  {p.inProgressTasks > 0 && <span className="text-blue-600">{p.inProgressTasks} in progress</span>}
                  {p.pendingTasks > 0 && <span className="text-amber-600">{p.pendingTasks} pending</span>}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${p.completionPct > 0 ? "bg-emerald-500" : "bg-gray-200"}`}
                    style={{ width: `${p.completionPct}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-semibold text-gray-700">{p.completionPct}%</span>
                <p className="text-xs text-gray-400">complete</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
