import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { EmployeeTrackingClient } from "./employee-tracking-client";

  export type EmployeeData = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  manager: string | null;
  joiningDate: string | null;
  employmentType: string | null;
  workLocation: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  subtaskCount: number;
  completedSubtaskCount: number;
  hoursLogged: number;
  lastWorkUpdate: string | null;
  lastActivity: string | null;
  productivity: number;
  online: boolean;
  tasks: {
    id: string;
    title: string;
    code: string | null;
    status: string;
    priority: string;
    projectName: string;
    projectId: string;
    sprintName: string | null;
    dueDate: string | null;
    createdAt: string;
  }[];
  projects: {
    id: string;
    name: string;
    key: string;
    role: string;
    completion: number;
    taskCount: number;
    lastActivity: string | null;
  }[];
  workUpdates: {
    id: string;
    date: string;
    projectName: string;
    taskTitle: string;
    subtaskTitle: string | null;
    status: string;
    timeSpent: number;
    workSummary: string | null;
    progressNotes: string | null;
    githubLink: string | null;
    productionUrl: string | null;
  }[];
  activityLog: {
    id: string;
    action: string;
    fieldName: string | null;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
    taskTitle: string;
  }[];
  dailySheets: {
    id: string;
    submittedAt: string;
    projectName: string | null;
    taskTitle: string | null;
    taskCode: string | null;
    todayWork: string;
    todayWorkCompleted: string;
    status: string;
    yesterdayPlan: string | null;
    yesterdayCompleted: string | null;
    tomorrowTask: string;
    blockers: string | null;
    aiSummary: string | null;
    referenceLinks: string | null;
    attachments: string | null;
  }[];
};

export type TrackingData = {
  employees: EmployeeData[];
  totalEmployees: number;
  onlineNow: number;
  workingToday: number;
  totalAssigned: number;
  completedToday: number;
  overdueCount: number;
  workUpdatesToday: number;
  dailySheetsToday: number;
  averageProductivity: number;
  projects: { id: string; name: string }[];
};

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default async function EmployeeTrackingPage() {
  await requireAdmin();

  const [users, allTasks, allWorkUpdates, allActivityLogs, allProjects, allSprints] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      include: {
        assignedTasks: {
          include: {
            column: { select: { name: true, board: { select: { project: { select: { id: true, name: true } } } } } },
            sprint: { select: { id: true, name: true } },
            childTasks: { select: { id: true, column: { select: { name: true } } } },
          },
        },
        workUpdates: {
          include: {
            task: { select: { id: true, title: true, code: true, column: { select: { board: { select: { project: { select: { id: true, name: true } } } } } } } },
            subtask: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        activityLogEntries: {
          include: { task: { select: { id: true, title: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      include: {
        assignee: { select: { id: true, name: true } },
        column: { select: { name: true } },
      },
    }),
    prisma.workUpdate.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.sprint.findMany({
      select: { id: true, name: true, projectId: true },
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ]);

  const today = getTodayRange();
  const now = new Date();

  const completedColumnNames = ["Done", "DONE"];
  const inProgressColumnNames = ["In Progress", "IN_PROGRESS"];
  const blockedColumnNames = ["Blocked", "BLOCKED"];

  const employees: EmployeeData[] = users.map((user) => {
    const tasks = user.assignedTasks || [];
    const workUpdates = user.workUpdates || [];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => completedColumnNames.includes(t.column.name)).length;
    const inProgressTasks = tasks.filter((t) => inProgressColumnNames.includes(t.column.name)).length;
    const blockedTasks = tasks.filter((t) => blockedColumnNames.includes(t.column.name)).length;
    const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && !completedColumnNames.includes(t.column.name)).length;
    const hoursLogged = workUpdates.reduce((sum, wu) => sum + (wu.timeSpent || 0), 0) / 60;
    const subtaskCount = tasks.filter((t) => (t as any).childTasks?.length > 0).reduce((sum, t) => sum + ((t as any).childTasks?.length || 0), 0);
    const completedSubtaskCount = tasks.filter((t) => (t as any).childTasks?.length > 0).reduce((sum, t) => sum + ((t as any).childTasks?.filter((ct: any) => completedColumnNames.includes(ct.column?.name || "")).length || 0), 0);

    const lastWorkUpdate = workUpdates.length > 0 ? workUpdates[0].createdAt.toISOString() : null;
    const lastActivity = user.activityLogEntries.length > 0 ? user.activityLogEntries[0].createdAt.toISOString() : null;

    const completedCount = tasks.filter((t) => completedColumnNames.includes(t.column.name)).length;
    const productivity = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    const maxLogEntries = user.activityLogEntries || [];
    const recentActivityMap = new Map<string, typeof maxLogEntries[0]>();
    for (const log of maxLogEntries) {
      if (!recentActivityMap.has(log.taskId)) {
        recentActivityMap.set(log.taskId, log);
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      manager: user.manager,
      joiningDate: user.joiningDate?.toISOString() ?? null,
      employmentType: user.employmentType,
      workLocation: user.workLocation,
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      overdueTasks,
      subtaskCount,
      completedSubtaskCount,
      hoursLogged: Math.round(hoursLogged * 10) / 10,
      lastWorkUpdate,
      lastActivity,
      productivity,
      online: false,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        code: t.code,
        status: t.column.name,
        priority: t.priority,
        projectName: t.column.board.project.name,
        projectId: t.column.board.project.id,
        sprintName: t.sprint?.name ?? null,
        dueDate: t.dueDate?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      })),
      projects: buildProjectList(tasks),
      workUpdates: workUpdates.map((wu) => ({
        id: wu.id,
        date: wu.createdAt.toISOString(),
        projectName: wu.task?.column?.board?.project?.name ?? "",
        taskTitle: wu.task?.title ?? "",
        subtaskTitle: wu.subtask?.title ?? null,
        status: wu.status,
        timeSpent: wu.timeSpent,
        workSummary: wu.workSummary,
        progressNotes: wu.progressNotes,
        githubLink: wu.githubLink,
        productionUrl: wu.productionUrl,
      })),
      dailySheets: workUpdates
        .filter((wu) => wu.todayWork)
        .map((wu) => ({
          id: wu.id,
          submittedAt: wu.createdAt.toISOString(),
          projectName: wu.task?.column?.board?.project?.name ?? null,
          taskTitle: wu.task?.title ?? null,
          taskCode: wu.task?.code ?? null,
          todayWork: wu.todayWork ?? "",
          todayWorkCompleted: wu.todayWorkCompleted ?? "",
          status: wu.status,
          yesterdayPlan: wu.yesterdayPlan ?? null,
          yesterdayCompleted: wu.yesterdayCompleted ?? null,
          tomorrowTask: wu.tomorrowTask ?? "",
          blockers: wu.blockers ?? null,
          aiSummary: wu.aiSummary ?? null,
          referenceLinks: wu.referenceLinks ?? null,
          attachments: wu.attachments ?? null,
        })),
      activityLog: maxLogEntries.map((log) => ({
        id: log.id,
        action: log.action,
        fieldName: log.fieldName,
        oldValue: log.oldValue,
        newValue: log.newValue,
        createdAt: log.createdAt.toISOString(),
        taskTitle: log.task.title,
      })),
    };
  });

  const todayWorkUpdates = allWorkUpdates.filter(
    (wu) => wu.createdAt >= today.start && wu.createdAt <= today.end
  );
  const todayCompleted = allTasks.filter(
    (t) => completedColumnNames.includes(t.column.name) && t.updatedAt >= today.start && t.updatedAt <= today.end
  );

  const dailySheetsToday = users.reduce((sum, u) => {
    const todayEntries = u.workUpdates.filter(
      (wu) => wu.todayWork && wu.createdAt >= today.start && wu.createdAt <= today.end
    );
    return sum + todayEntries.length;
  }, 0);

  const averageProductivity = employees.length > 0
    ? Math.round(employees.reduce((sum, e) => sum + e.productivity, 0) / employees.length)
    : 0;

  const data: TrackingData = {
    employees,
    totalEmployees: users.length,
    onlineNow: 0,
    workingToday: todayWorkUpdates.length,
    totalAssigned: allTasks.length,
    completedToday: todayCompleted.length,
    overdueCount: allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && !completedColumnNames.includes(t.column.name)).length,
    workUpdatesToday: todayWorkUpdates.length,
    dailySheetsToday,
    averageProductivity,
    projects: allProjects,
  };

  return <EmployeeTrackingClient data={data} />;
}

function buildProjectList(tasks: { column: { board: { project: { id: string; name: string } } }; id: string; code: string | null; title: string; updatedAt: Date }[]) {
  const projectMap = new Map<string, { id: string; name: string; key: string; taskCount: number; lastActivity: Date | null }>();
  for (const t of tasks) {
    const project = t.column.board.project;
    if (!projectMap.has(project.id)) {
      projectMap.set(project.id, { id: project.id, name: project.name, key: "", taskCount: 0, lastActivity: null });
    }
    const entry = projectMap.get(project.id)!;
    entry.taskCount++;
    if (!entry.lastActivity || t.updatedAt > entry.lastActivity) {
      entry.lastActivity = t.updatedAt;
    }
  }
  return Array.from(projectMap.values()).map((p) => ({
    ...p,
    completion: 0,
    role: "MEMBER",
    lastActivity: p.lastActivity?.toISOString() ?? null,
  }));
}
