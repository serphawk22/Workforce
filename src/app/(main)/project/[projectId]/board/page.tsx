import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Board } from "@/components/board/board";
import { SearchBar } from "../search-bar";
import { FilterBar } from "../filter-bar";
import { SprintSidebar } from "@/components/sprint/sprint-sidebar";

export default async function ProjectBoardPage(props: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await props.params;
  const searchParams = await props.searchParams;
  const session = await requireSetup();

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
                  subtasks: { select: { id: true, title: true, status: true, code: true }, orderBy: { createdAt: "asc" } },
                  childTasks: { select: { id: true, title: true, code: true, issueKey: true, priority: true, assigneeId: true, assignee: { select: { id: true, name: true } }, dueDate: true, labels: { include: { label: true } }, columnId: true, order: true, sprintId: true, createdAt: true, dateOfDevAcceptOrStart: true, dateOfDevComplete: true, dateOfQaOrUatStart: true, dateOfQaOrUatComplete: true, dateOfReleaseToProd: true, comments: { select: { id: true } }, subtasks: { select: { id: true, title: true, status: true, code: true }, orderBy: { createdAt: "asc" } } }, orderBy: { order: "asc" } },
                },
              },
            },
          },
        },
      },
      labels: true,
    },
  });

  if (!project) {
    return <div className="text-gray-500 py-8 text-center">Board not found</div>;
  }
  if (project.workspace.members.length === 0) {
    return <div className="text-gray-500 py-8 text-center">Not authorized</div>;
  }

  const board = project.boards[0];
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: project.workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
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

  function mapTask(t: {
    id: string; title: string; code: string | null; issueKey: string | null;
    priority: string; assigneeId: string | null;
    assignee: { id: string; name: string } | null;
    dueDate: Date | null; sprintId: string | null;
    createdAt: Date;
    dateOfDevAcceptOrStart: Date | null; dateOfDevComplete: Date | null;
    dateOfQaOrUatStart: Date | null; dateOfQaOrUatComplete: Date | null;
    dateOfReleaseToProd: Date | null;
    labels: Array<{ label: { id: string; name: string; color: string } }>;
    comments: Array<{ id: string }>;
    subtasks: Array<{ id: string; title: string; status: string; code: string | null }>;
  }) {
    return {
      id: t.id, title: t.title, code: t.code, issueKey: t.issueKey,
      priority: t.priority, assignee: t.assignee,
      dueDate: t.dueDate?.toISOString() || null, sprintId: t.sprintId,
      labels: t.labels.map((l) => ({ id: l.label.id, name: l.label.name, color: l.label.color })),
      commentCount: t.comments.length,
      createdAt: t.createdAt.toISOString(),
      dateOfDevAcceptOrStart: t.dateOfDevAcceptOrStart?.toISOString() || null,
      dateOfDevComplete: t.dateOfDevComplete?.toISOString() || null,
      dateOfQaOrUatStart: t.dateOfQaOrUatStart?.toISOString() || null,
      dateOfQaOrUatComplete: t.dateOfQaOrUatComplete?.toISOString() || null,
      dateOfReleaseToProd: t.dateOfReleaseToProd?.toISOString() || null,
      subtasks: t.subtasks.map((s) => ({ id: s.id, title: s.title, code: s.code, status: s.status })),
      completedSubtaskCount: t.subtasks.filter((s) => s.status === "DONE").length,
    };
  }

  function mapChildTask(t: any) {
    return {
      ...mapTask(t),
      parentTaskId: t.parentTaskId,
    };
  }

  function isDoneColumn(colId: string) {
    const c = board.columns.find((x) => x.id === colId);
    return c && ["Done", "Released", "Closed"].includes(c.name);
  }

  const columns = board.columns.map((col) => {
    const childTasksMap = new Map<string, any[]>();
    for (const t of col.tasks) {
      if (t.parentTaskId) {
        const arr = childTasksMap.get(t.parentTaskId) || [];
        arr.push(t);
        childTasksMap.set(t.parentTaskId, arr);
      }
    }

    return {
      id: col.id,
      name: col.name,
      tasks: col.tasks
        .filter((t) => {
          if (t.parentTaskId) return false;
          if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
          if (priorityFilter && t.priority !== priorityFilter) return false;
          if (labelFilter && !t.labels.some((l) => l.label.id === labelFilter)) return false;
          if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
          return true;
        })
        .map((t) => {
          const children = (childTasksMap.get(t.id) || []).filter((ct) => {
            if (assigneeFilter && ct.assigneeId !== assigneeFilter) return false;
            if (priorityFilter && ct.priority !== priorityFilter) return false;
            if (labelFilter && !ct.labels.some((l: any) => l.label.id === labelFilter)) return false;
            if (searchQuery && !ct.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
          });
          return {
            ...mapTask(t),
            childTasks: children.map(mapChildTask),
            childTaskCount: children.length,
            completedChildTaskCount: children.filter((ct: any) => isDoneColumn(ct.columnId)).length,
          };
        }),
    };
  });

  const allTasks = columns.flatMap((c) => [...c.tasks, ...c.tasks.flatMap((t: any) => t.childTasks || [])]);

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        <ProjectStats columns={columns} />
        <div className="flex items-center gap-3">
          <SearchBar />
          <FilterBar
            members={members.map((m) => m.user)}
            labels={project.labels}
          />
        </div>
        <Board
          initialColumns={columns}
          projectId={projectId}
          boardId={board.id}
          members={members.map((m) => m.user)}
          labels={project.labels}
          sprints={sprints.map((s) => ({ id: s.id, name: s.name, status: s.status }))}
          parentTasks={board.columns.flatMap((c) => c.tasks.filter((t) => !t.parentTaskId)).map((t) => ({ id: t.id, title: t.title, code: t.code, issueKey: t.issueKey }))}
        />
      </div>
      <SprintSidebar
        projectId={projectId}
        sprints={sprints.map((s) => ({
          id: s.id,
          name: s.name,
          goal: s.goal,
          startDate: s.startDate?.toISOString() || null,
          endDate: s.endDate?.toISOString() || null,
          status: s.status,
          _count: { tasks: s._count.tasks },
        }))}
      />
    </div>
  );
}

function ProjectStats({ columns }: { columns: Array<{ id: string; name: string; tasks: Array<{ assignee: { id: string; name: string } | null; childTasks?: Array<{ assignee: { id: string; name: string } | null }> }> }> }) {
  const allTasks = columns.flatMap((c) => [...c.tasks, ...c.tasks.flatMap((t: any) => t.childTasks || [])]);
  const totalTasks = allTasks.length;
  const doneTasks = columns
    .filter((c) => ["Done", "Released", "Closed"].includes(c.name))
    .flatMap((c) => [...c.tasks, ...c.tasks.flatMap((t: any) => t.childTasks || [])]);
  const completedCount = doneTasks.length;
  const pendingCount = totalTasks - completedCount;
  const developerIds = new Set(allTasks.map((t) => t.assignee?.id).filter(Boolean));
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
