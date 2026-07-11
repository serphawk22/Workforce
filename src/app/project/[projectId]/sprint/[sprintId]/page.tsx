import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Nav } from "@/components/nav";
import { Board } from "@/components/board/board";
import { SprintSidebar } from "@/components/sprint/sprint-sidebar";

export default async function SprintPage(props: {
  params: Promise<{ projectId: string; sprintId: string }>;
}) {
  const { projectId, sprintId } = await props.params;
  const session = await requireSetup();

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: { members: { where: { userId: session.user.id } } },
      },
      boards: {
        include: {
          columns: {
            orderBy: { order: "asc" },
            include: {
              tasks: {
                where: { sprintId },
                orderBy: { order: "asc" },
                include: {
                  assignee: { select: { id: true, name: true } },
                  labels: { include: { label: true } },
                  comments: { select: { id: true } },
                },
              },
            },
          },
        },
      },
      labels: true,
    },
  });

  if (!project || project.workspace.members.length === 0) {
    return <div>Project not found</div>;
  }

  const board = project.boards[0];

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) return <div>Sprint not found</div>;

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: project.workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });

  const columns = board.columns.map((col) => ({
    id: col.id,
    name: col.name,
    tasks: col.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      assignee: t.assignee,
      dueDate: t.dueDate?.toISOString() || null,
      sprintId: t.sprintId,
      labels: t.labels.map((l) => ({ id: l.label.id, name: l.label.name, color: l.label.color })),
      commentCount: t.comments.length,
    })),
  }));

  const priorityColors: Record<string, string> = {
    LOW: "bg-gray-100",
    MEDIUM: "bg-blue-100",
    HIGH: "bg-orange-100",
    CRITICAL: "bg-red-100",
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <Nav workspaces={workspaces} currentWorkspaceId={project.workspaceId} />
      <main className="max-w-full">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.name} - {sprint.name}</h1>
              {sprint.goal && (
                <p className="text-sm text-gray-500 mt-1">{sprint.goal}</p>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              sprint.status === "ACTIVE" ? "bg-green-100 text-green-700" :
              sprint.status === "COMPLETED" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {sprint.status}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            {sprint.startDate && (
              <span>Start: {sprint.startDate.toLocaleDateString("en-US")}</span>
            )}
            {sprint.endDate && (
              <span>End: {sprint.endDate.toLocaleDateString("en-US")}</span>
            )}
          </div>
        </div>

        <div className="flex">
          <SprintSidebar
            projectId={projectId}
            sprints={sprints.map((s) => ({
              id: s.id,
              name: s.name,
              goal: s.goal,
              status: s.status,
              startDate: s.startDate?.toISOString() || null,
              endDate: s.endDate?.toISOString() || null,
              _count: { tasks: s._count.tasks },
            }))}
          />

          <div className="flex-1 min-w-0 px-4">
            <Board
              projectId={projectId}
              boardId={board.id}
              initialColumns={columns}
              members={members.map((m) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
              }))}
              labels={project.labels.map((l) => ({
                id: l.id,
                name: l.name,
                color: l.color,
              }))}
              sprints={sprints.map((s) => ({
                id: s.id,
                name: s.name,
                status: s.status,
              }))}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
