import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export default async function MyTasksPage() {
  const session = await requireAuth();

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const tasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: { include: { board: { include: { project: true } } } },
      labels: { include: { label: true } },
    },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
  });

  const now = new Date();

  const priorityDots: Record<string, string> = {
    LOW: "bg-gray-300",
    MEDIUM: "bg-blue-500",
    HIGH: "bg-orange-500",
    CRITICAL: "bg-red-500",
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <Nav workspaces={workspaces} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-gray-400">No tasks assigned to you.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <a
                key={t.id}
                href={`/project/${t.column.board.projectId}`}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-sm"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityDots[t.priority] || "bg-gray-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{t.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {t.column.board.project.name} / {t.column.name}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {t.labels.length > 0 && (
                    <div className="hidden sm:flex gap-1.5">
                      {t.labels.slice(0, 2).map((l) => (
                        <span
                          key={l.label.id}
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: l.label.color + "15", color: l.label.color }}
                        >
                          {l.label.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {t.dueDate && (
                    <span className={`text-xs whitespace-nowrap ${t.dueDate < now ? "font-medium text-red-500" : "text-gray-500"}`}>
                      {t.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
