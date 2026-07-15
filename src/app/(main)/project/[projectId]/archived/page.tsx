import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import Link from "next/link";
import { formatDateShort } from "@/lib/dates";

export default async function ProjectArchivedPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await requireSetup();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: { members: { where: { userId: session.user.id } } },
      },
    },
  });

  if (!project) {
    return <p className="text-gray-500 text-center py-8">Project not found</p>;
  }
  if (project.workspace.members.length === 0) {
    return <p className="text-gray-500 text-center py-8">Not authorized</p>;
  }

  const archivedTasks = await prisma.task.findMany({
    where: {
      column: {
        board: { projectId },
        name: { in: ["Done", "Closed", "Released"] },
      },
    },
    include: {
      column: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-900">Archived Tasks ({archivedTasks.length})</h2>
        <p className="text-xs text-gray-500 mt-1">Completed and closed tasks</p>
      </div>

      {archivedTasks.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-10 w-10 text-gray-300">
            <rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">No archived tasks</p>
        </div>
      ) : (
        <div className="space-y-1">
          {archivedTasks.map((t) => (
            <Link
              key={t.id}
              href={`/project/${projectId}/board`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${
                t.column.name === "Done" ? "bg-emerald-500" :
                t.column.name === "Released" ? "bg-purple-500" :
                "bg-gray-500"
              }`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                <p className="text-xs text-gray-500">
                  {t.column.name}
                  {t.assignee ? <span> &middot; {t.assignee.name}</span> : null}
                  {t.updatedAt && <span> &middot; {formatDateShort(t.updatedAt)}</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
