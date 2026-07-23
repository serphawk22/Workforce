import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { WorkUpdatesTable } from "./work-updates-table";

type WorkUpdateInfo = {
  id: string;
  userId: string;
  status: string;
  progressNotes: string | null;
  workSummary: string | null;
  githubLink: string | null;
  productionUrl: string | null;
  timeSpent: number;
  createdAt: string;
  updatedAt: string | null;
  user: { id: string; name: string };
};

export type SubtaskRow = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  workUpdate: WorkUpdateInfo | null;
};

export type ChildTaskRow = {
  id: string;
  code: string | null;
  title: string;
  columnName: string;
  assigneeName: string | null;
  workUpdate: WorkUpdateInfo | null;
};

export type TaskRow = {
  id: string;
  code: string | null;
  title: string;
  columnName: string;
  projectId: string;
  projectName: string;
  projectKey: string;
  assigneeName: string | null;
  subtasks: SubtaskRow[];
  childTasks: ChildTaskRow[];
  lastUpdated: string;
  isAwaiting: boolean;
  isStandalone?: boolean;
  todayWork?: string | null;
  tomorrowTask?: string | null;
  blockers?: string | null;
  status?: string;
  submittedAt?: string;
};

export default async function AdminWorkUpdatesPage() {
  const session = await requireAdmin();

  const [tasksWithUpdates, tasksAwaiting, standaloneUpdates, employees] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [
          { workUpdates: { some: {} } },
          { subtasks: { some: { workUpdates: { some: {} } } } },
          { childTasks: { some: { workUpdates: { some: {} } } } },
        ],
      },
      include: {
        assignee: { select: { id: true, name: true } },
        column: { select: { name: true, board: { select: { project: { select: { id: true, name: true, key: true } } } } } },
        subtasks: {
          include: {
            workUpdates: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { createdAt: "asc" },
        },
        childTasks: {
          include: {
            assignee: { select: { id: true, name: true } },
            column: { select: { name: true } },
            workUpdates: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { createdAt: "asc" },
        },
        workUpdates: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.task.findMany({
      where: { assigneeId: { not: null }, workUpdates: { none: {} }, subtasks: { none: { workUpdates: { some: {} } } }, childTasks: { none: { workUpdates: { some: {} } } } },
      include: {
        assignee: { select: { id: true, name: true } },
        column: { select: { name: true, board: { select: { project: { select: { id: true, name: true, key: true } } } } } },
        subtasks: { select: { id: true, code: true, title: true, status: true }, orderBy: { createdAt: "asc" } },
        childTasks: {
          include: {
            assignee: { select: { id: true, name: true } },
            column: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.workUpdate.findMany({
      where: { taskId: null, todayWork: { not: null } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  function pickWorkUpdateInfo(wu: { id: string; userId: string; status: string; progressNotes: string | null; workSummary: string | null; githubLink: string | null; productionUrl: string | null; timeSpent: number; createdAt: Date; updatedAt: Date | null; user: { id: string; name: string } } | undefined): WorkUpdateInfo | null {
    if (!wu) return null;
    return {
      id: wu.id,
      userId: wu.userId,
      status: wu.status,
      progressNotes: wu.progressNotes,
      workSummary: wu.workSummary,
      githubLink: wu.githubLink,
      productionUrl: wu.productionUrl,
      timeSpent: wu.timeSpent,
      createdAt: wu.createdAt.toISOString(),
      updatedAt: wu.updatedAt?.toISOString() ?? wu.createdAt.toISOString(),
      user: wu.user,
    };
  }

  const serialized: TaskRow[] = [
    ...tasksWithUpdates.map((t) => {
      const lastWu = t.workUpdates[0];
      const subtaskLatest = t.subtasks
        .map((s) => s.workUpdates[0])
        .filter(Boolean)
        .sort((a, b) => b!.createdAt.getTime() - a!.createdAt.getTime())[0];
      const childTaskLatest = t.childTasks
        .map((ct) => ct.workUpdates[0])
        .filter(Boolean)
        .sort((a, b) => b!.createdAt.getTime() - a!.createdAt.getTime())[0];
      const lastUpdated = [lastWu, subtaskLatest, childTaskLatest].filter(Boolean).sort((a, b) => b!.createdAt.getTime() - a!.createdAt.getTime())[0];
      return {
        id: t.id,
        code: t.code,
        title: t.title,
        columnName: t.column.name,
        projectId: t.column.board.project.id,
        projectName: t.column.board.project.name,
        projectKey: t.column.board.project.key,
        assigneeName: t.assignee?.name ?? null,
        subtasks: t.subtasks.map((s) => ({
          id: s.id,
          code: s.code,
          title: s.title,
          status: s.status,
          workUpdate: pickWorkUpdateInfo(s.workUpdates[0]),
        })),
        childTasks: t.childTasks.map((ct) => ({
          id: ct.id,
          code: ct.code,
          title: ct.title,
          columnName: ct.column.name,
          assigneeName: ct.assignee?.name ?? null,
          workUpdate: pickWorkUpdateInfo(ct.workUpdates[0]),
        })),
        lastUpdated: lastUpdated?.createdAt.toISOString() ?? t.createdAt.toISOString(),
        isAwaiting: false,
      };
    }),
    ...tasksAwaiting.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      columnName: t.column.name,
      projectId: t.column.board.project.id,
      projectName: t.column.board.project.name,
      projectKey: t.column.board.project.key,
      assigneeName: t.assignee?.name ?? null,
      subtasks: t.subtasks.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        status: s.status,
        workUpdate: null as WorkUpdateInfo | null,
      })),
      childTasks: t.childTasks.map((ct) => ({
        id: ct.id,
        code: ct.code,
        title: ct.title,
        columnName: ct.column.name,
        assigneeName: ct.assignee?.name ?? null,
        workUpdate: null as WorkUpdateInfo | null,
      })),
      lastUpdated: t.createdAt.toISOString(),
      isAwaiting: true,
    })),
    ...standaloneUpdates.map((wu) => ({
      id: `sheet-${wu.id}`,
      code: null,
      title: wu.todayWork || "Daily Work Entry",
      columnName: "Daily Sheet",
      projectId: "",
      projectName: wu.user.name,
      projectKey: "",
      assigneeName: wu.user.name,
      subtasks: [],
      childTasks: [],
      lastUpdated: wu.createdAt.toISOString(),
      isAwaiting: false,
      isStandalone: true,
      todayWork: wu.todayWork,
      tomorrowTask: wu.tomorrowTask,
      blockers: wu.blockers,
      status: wu.status,
      submittedAt: wu.createdAt.toISOString(),
    })),
  ];

  const totalUpdates = tasksWithUpdates.reduce(
    (sum, t) => sum + t.workUpdates.length + t.subtasks.reduce((s, st) => s + st.workUpdates.length, 0),
    0,
  ) + standaloneUpdates.length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Work Updates</h1>
        <p className="mt-1 text-sm text-gray-500">
          {serialized.length} task{serialized.length !== 1 ? "s" : ""} &middot; {totalUpdates} update{totalUpdates !== 1 ? "s" : ""}
        </p>
      </div>

      <WorkUpdatesTable tasks={serialized} employees={employees} />
    </div>
  );
}
