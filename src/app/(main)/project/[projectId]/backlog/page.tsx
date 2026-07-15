import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Board } from "@/components/board/board";
import { SprintSidebar } from "@/components/sprint/sprint-sidebar";

export default async function BacklogPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await props.params;
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
                where: { sprintId: null },
                orderBy: { order: "asc" },
                include: {
                  assignee: { select: { id: true, name: true } },
                  labels: { include: { label: true } },
                  comments: { select: { id: true } },
                  subtasks: { select: { id: true, title: true, status: true, code: true }, orderBy: { createdAt: "asc" } },
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
    return <div className="py-8 text-center text-gray-500">Project not found</div>;
  }
  if (project.workspace.members.length === 0) {
    return <div className="py-8 text-center text-gray-500">Not authorized</div>;
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

  const columns = board.columns.map((col) => ({
    id: col.id,
    name: col.name,
    tasks: col.tasks
      .filter((t) => !t.code || !t.code.includes("_"))
      .map((t) => ({
        id: t.id,
        title: t.title,
        code: t.code,
        issueKey: t.issueKey,
        priority: t.priority,
        assignee: t.assignee,
        dueDate: t.dueDate?.toISOString() || null,
        sprintId: t.sprintId,
        labels: t.labels.map((l) => ({ id: l.label.id, name: l.label.name, color: l.label.color })),
        commentCount: t.comments.length,
        createdAt: t.createdAt.toISOString(),
        dateOfDevAcceptOrStart: t.dateOfDevAcceptOrStart?.toISOString() || null,
        dateOfDevComplete: t.dateOfDevComplete?.toISOString() || null,
        dateOfQaOrUatStart: t.dateOfQaOrUatStart?.toISOString() || null,
        dateOfQaOrUatComplete: t.dateOfQaOrUatComplete?.toISOString() || null,
        dateOfReleaseToProd: t.dateOfReleaseToProd?.toISOString() || null,
        subtasks: t.subtasks.map((s) => ({
          id: s.id,
          title: s.title,
          code: s.code,
          status: s.status,
        })),
        completedSubtaskCount: t.subtasks.filter((s) => s.status === "DONE").length,
      })),
  }));

  return (
    <div className="flex gap-6">
      <div className="w-64 shrink-0">
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
      </div>
      <div className="flex-1 min-w-0">
        <p className="mb-4 text-sm text-gray-500">Tasks not assigned to any sprint</p>
        <Board
          projectId={projectId}
          boardId={board.id}
          initialColumns={columns}
          members={members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }))}
          labels={project.labels.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
          sprints={sprints.map((s) => ({ id: s.id, name: s.name, status: s.status }))}
        />
      </div>
    </div>
  );
}
