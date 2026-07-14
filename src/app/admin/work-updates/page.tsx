import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { WorkUpdatesTable } from "./work-updates-table";
import { TasksAwaitingTable } from "./tasks-awaiting-table";

type UpdateRow = {
  id: string;
  taskId: string;
  userId: string;
  subtaskId: string | null;
  status: string;
  taskStatus: string;
  progressNotes: string | null;
  workSummary: string | null;
  githubLink: string | null;
  productionUrl: string | null;
  timeSpent: number;
  createdAt: string;
  updatedAt: string | null;
  user: { id: string; name: string };
  subtask: { id: string; title: string; status: string } | null;
  task: {
    id: string;
    title: string;
    issueKey: string | null;
    sheetCode: string | null;
    column: { name: string; board: { project: { id: string; name: string; key: string } } };
  };
};

type AwaitingRow = {
  id: string;
  taskId: string;
  employeeId: string;
  employeeName: string;
  projectName: string;
  projectKey: string;
  taskTitle: string;
  issueKey: string | null;
  currentStatus: string;
  assignedDate: string;
  dueDate: string | null;
};

export default async function AdminWorkUpdatesPage() {
  const session = await requireAdmin();

  const [updates, employees] = await Promise.all([
    prisma.workUpdate.findMany({
      include: {
        user: { select: { id: true, name: true } },
        subtask: { select: { id: true, title: true, status: true } },
        task: {
          select: {
            id: true,
            title: true,
            issueKey: true,
            sheetCode: true,
            column: {
              select: {
                name: true,
                board: {
                  select: {
                    project: { select: { id: true, name: true, key: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const tasksAwaiting = await prisma.task.findMany({
    where: {
      assigneeId: { not: null },
      workUpdates: { none: {} },
      column: {
        board: {
          project: {
            workspace: {
              members: { some: { userId: session.user.id } },
            },
          },
        },
      },
    },
    include: {
      assignee: { select: { id: true, name: true } },
      column: {
        select: { name: true, board: { select: { project: { select: { id: true, name: true, key: true } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const serializedUpdates: UpdateRow[] = updates.map((u) => ({
    id: u.id,
    taskId: u.taskId,
    userId: u.userId,
    subtaskId: u.subtaskId,
    status: u.status,
    taskStatus: u.task.column.name,
    progressNotes: u.progressNotes,
    workSummary: u.workSummary,
    githubLink: u.githubLink,
    productionUrl: u.productionUrl,
    timeSpent: u.timeSpent,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt?.toISOString() ?? u.createdAt.toISOString(),
    user: u.user,
    subtask: u.subtask,
    task: u.task,
  }));

  const serializedAwaiting: AwaitingRow[] = tasksAwaiting.map((t) => ({
    id: `awaiting-${t.id}`,
    taskId: t.id,
    employeeId: t.assignee!.id,
    employeeName: t.assignee!.name,
    projectName: t.column.board.project.name,
    projectKey: t.column.board.project.key,
    taskTitle: t.title,
    issueKey: t.issueKey,
    currentStatus: t.column.name,
    assignedDate: t.createdAt.toISOString(),
    dueDate: t.dueDate?.toISOString() ?? null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Work Updates</h1>
        <p className="mt-1 text-sm text-gray-500">
          {updates.length} update{updates.length !== 1 ? "s" : ""} submitted by employees
        </p>
      </div>

      <WorkUpdatesTable updates={serializedUpdates} employees={employees} />

      {serializedAwaiting.length > 0 && (
        <div className="mt-12">
          <TasksAwaitingTable tasks={serializedAwaiting} />
        </div>
      )}
    </div>
  );
}
