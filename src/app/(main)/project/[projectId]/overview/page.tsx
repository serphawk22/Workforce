import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await requireSetup();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      boards: { include: { columns: { include: { _count: { select: { tasks: true } } } } } },
      _count: { select: { labels: true, sprints: true } },
    },
  });

  if (!project) return <div className="text-gray-500 py-8 text-center">Project not found</div>;

  const totalTasks = project.boards.reduce((sum, b) =>
    sum + b.columns.reduce((s, c) => s + c._count.tasks, 0), 0
  );

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Tasks</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{totalTasks}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Labels</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{project._count.labels}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sprints</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{project._count.sprints}</p>
      </div>
    </div>
  );
}
