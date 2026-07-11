import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Nav } from "@/components/nav";
import { Board } from "@/components/board/board";
import { SearchBar } from "./search-bar";
import { FilterBar } from "./filter-bar";
import { SprintSidebar } from "@/components/sprint/sprint-sidebar";

export default async function ProjectPage(props: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await props.params;
  const searchParams = await props.searchParams;
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

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: project.workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });

  const assigneeFilter = searchParams.assignee as string | undefined;
  const priorityFilter = searchParams.priority as string | undefined;
  const labelFilter = searchParams.label as string | undefined;
  const searchQuery = searchParams.search as string | undefined;

  const columns = board.columns.map((col) => ({
    id: col.id,
    name: col.name,
    tasks: col.tasks
      .filter((t) => {
        if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
        if (priorityFilter && t.priority !== priorityFilter) return false;
        if (labelFilter && !t.labels.some((l) => l.label.id === labelFilter)) return false;
        if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .map((t) => ({
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

  return (
    <div className="bg-slate-50 min-h-screen">
      <Nav workspaces={workspaces} currentWorkspaceId={project.workspaceId} />
      <main className="max-w-full">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <SearchBar />
            <FilterBar
              members={members.map((m) => ({
                id: m.user.id,
                name: m.user.name,
              }))}
              labels={project.labels}
            />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 mb-6">
          <ProjectStats columns={board.columns} />
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

          <div className="flex-1 min-w-0 px-6">
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

function ProjectStats({ columns }: { columns: Array<{ id: string; name: string; tasks: Array<{ assigneeId: string | null }> }> }) {
  const allTasks = columns.flatMap((c) => c.tasks);
  const totalTasks = allTasks.length;
  const doneTasks = columns
    .filter((c) => ["Done", "Released", "Closed"].includes(c.name))
    .flatMap((c) => c.tasks);
  const completedCount = doneTasks.length;
  const pendingCount = totalTasks - completedCount;

  const developerIds = new Set(allTasks.map((t) => t.assigneeId).filter(Boolean));
  const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs text-gray-500">Total Tasks</p>
        <p className="mt-0.5 text-lg font-bold text-gray-900">{totalTasks}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs text-gray-500">Completed</p>
        <p className="mt-0.5 text-lg font-bold text-emerald-600">{completedCount}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs text-gray-500">Pending</p>
        <p className="mt-0.5 text-lg font-bold text-amber-600">{pendingCount}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs text-gray-500">Developers</p>
        <p className="mt-0.5 text-lg font-bold text-blue-600">{developerIds.size}</p>
        {pct > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
