import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { ListView } from "@/components/list/list-view";

const doneColumnNames = ["Done", "Released", "Closed"];

export const dynamic = "force-dynamic";

export default async function ProjectListPage(props: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const allColumnIds = board?.columns.map((c) => c.id) || [];

  const allTasks = await prisma.task.findMany({
    where: { columnId: { in: allColumnIds } },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      reporter: { select: { id: true, name: true, email: true } },
      column: { select: { id: true, name: true } },
      sprint: { select: { id: true, name: true, status: true } },
      labels: { include: { label: true } },
      subtasks: {
        select: { id: true, title: true, status: true, code: true },
        orderBy: { createdAt: "asc" },
      },
      epic: { select: { id: true, title: true, issueKey: true } },
      childTasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          reporter: { select: { id: true, name: true, email: true } },
          column: { select: { id: true, name: true } },
          sprint: { select: { id: true, name: true, status: true } },
          labels: { include: { label: true } },
          subtasks: { select: { id: true, title: true, status: true, code: true }, orderBy: { createdAt: "asc" } },
          epic: { select: { id: true, title: true, issueKey: true } },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ epicId: "asc" }, { order: "asc" }],
  });

  const tasks = allTasks.filter((t) => !t.parentTaskId);

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: project.workspaceId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const epics = tasks.filter((t) => t.type === "EPIC");

  return (
    <ListView
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        issueKey: t.issueKey,
        code: t.code,
        type: t.type,
        epicId: t.epicId,
        priority: t.priority,
        assignee: t.assignee,
        reporter: t.reporter,
        column: t.column,
        sprint: t.sprint,
        labels: t.labels.map((l) => ({ id: l.label.id, name: l.label.name, color: l.label.color })),
        completedSubtaskCount: t.subtasks.filter((s) => s.status === "DONE").length,
        subtasks: t.subtasks,
        epic: t.epic,
        dueDate: t.dueDate?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        githubLink: t.githubLink,
        productionUrl: t.productionUrl,
        dateOfDevAcceptOrStart: t.dateOfDevAcceptOrStart?.toISOString() || null,
        dateOfDevComplete: t.dateOfDevComplete?.toISOString() || null,
        dateOfQaOrUatStart: t.dateOfQaOrUatStart?.toISOString() || null,
        dateOfQaOrUatComplete: t.dateOfQaOrUatComplete?.toISOString() || null,
        dateOfReleaseToProd: t.dateOfReleaseToProd?.toISOString() || null,
        childTasks: (t.childTasks || []).map((ct: any) => ({
          id: ct.id,
          title: ct.title,
          code: ct.code,
          issueKey: ct.issueKey,
          status: doneColumnNames.includes(ct.column?.name || "") ? "DONE" : ct.column?.name === "In Progress" ? "IN_PROGRESS" : "TODO",
        })),
        completedChildTaskCount: (t.childTasks || []).filter((ct: any) => doneColumnNames.includes(ct.column?.name || "")).length,
      }))}
      columns={board?.columns.map((c) => ({ id: c.id, name: c.name })) || []}
      members={members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, avatarUrl: m.user.avatarUrl }))}
      labels={project.labels.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
      sprints={sprints}
      epics={epics.map((e) => ({ id: e.id, title: e.title, issueKey: e.issueKey }))}
      projectId={projectId}
      boardId={board?.id || ""}
    />
  );
}
