import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { ProjectTimeline } from "@/components/project/project-timeline";

export default async function ProjectTimelinePage({ params }: { params: Promise<{ projectId: string }> }) {
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

  const tasks = await prisma.task.findMany({
    where: {
      column: { board: { projectId } },
    },
    include: {
      assignee: { select: { name: true } },
      column: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    orderBy: { startDate: "asc" },
  });

  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    assigneeName: t.assignee?.name || null,
    columnName: t.column.name,
    startDate: t.dateOfDevAcceptOrStart?.toISOString() || t.createdAt.toISOString(),
    endDate: t.dueDate?.toISOString() || t.dateOfReleaseToProd?.toISOString() || t.dateOfDevComplete?.toISOString() || null,
  }));

  const serializedSprints = sprints.map((s) => ({
    id: s.id,
    name: s.name,
    startDate: s.startDate?.toISOString() || null,
    endDate: s.endDate?.toISOString() || null,
  }));

  return (
    <div>
      <ProjectTimeline tasks={serializedTasks} sprints={serializedSprints} projectId={projectId} />
    </div>
  );
}
