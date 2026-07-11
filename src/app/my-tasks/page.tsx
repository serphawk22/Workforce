import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { formatDate, isOverdue } from "@/lib/dates";

const statusColors: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Review: "bg-amber-50 text-amber-700",
  Done: "bg-emerald-50 text-emerald-700",
  Released: "bg-purple-50 text-purple-700",
  Closed: "bg-gray-100 text-gray-500",
};

const priorityDots: Record<string, string> = {
  LOW: "bg-gray-300",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

export default async function MyTasksPage() {
  const session = await requireSetup();

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const tasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: { include: { board: { include: { project: true } } } },
      labels: { include: { label: true } },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });

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
          <div className="space-y-4">
            {tasks.map((t) => (
              <Link
                key={t.id}
                href={`/project/${t.column.board.projectId}`}
                className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${priorityDots[t.priority] || "bg-gray-300"}`} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="gray">{t.column.board.project.name}</Badge>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[t.column.name] || "bg-gray-100 text-gray-700"}`}>
                        {t.column.name}
                      </span>
                    </div>

                    <p className="text-base font-semibold text-gray-900 mb-3 leading-snug">{t.title}</p>

                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                      {t.createdAt && (
                        <DateBadge label="Requested" date={t.createdAt} />
                      )}
                      {t.dateOfDevAcceptOrStart && (
                        <DateBadge label="Dev Started" date={t.dateOfDevAcceptOrStart} />
                      )}
                      {t.dueDate && (
                        <span className={`inline-flex items-center gap-1 ${isOverdue(t.dueDate) && t.column.name !== "Done" ? "font-medium text-red-600" : "text-gray-500"}`}>
                          <CalendarIcon />
                          <span className="text-gray-400">Due:</span>
                          <span>{formatDate(t.dueDate)}</span>
                        </span>
                      )}
                    </div>

                    {(t.githubLink || t.productionUrl) && (
                      <div className="mt-2 flex gap-3">
                        {t.githubLink && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <GitHubIcon /> GitHub
                          </span>
                        )}
                        {t.productionUrl && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <LinkIcon /> Production
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DateBadge({ label, date }: { label: string; date: Date }) {
  return (
    <span className="inline-flex items-center gap-1 text-gray-500">
      <CalendarIcon />
      <span className="text-gray-400">{label}:</span>
      <span>{formatDate(date)}</span>
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-gray-400">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
