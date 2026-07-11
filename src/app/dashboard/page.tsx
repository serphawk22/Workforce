import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Nav } from "@/components/nav";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(date: Date): boolean {
  return date < new Date();
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: "bg-gray-400",
    MEDIUM: "bg-blue-500",
    HIGH: "bg-orange-500",
    CRITICAL: "bg-red-500",
  };
  return (
    <span
      className={`mt-1.5 block h-2 w-2 shrink-0 rounded-full ${colors[priority] || "bg-gray-400"}`}
    />
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ProjectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function TaskLinks({ githubLink, productionUrl }: { githubLink: string | null; productionUrl: string | null }) {
  if (!githubLink && !productionUrl) return null;
  return (
    <div className="mt-1 flex gap-2">
      {githubLink && (
        <a
          href={githubLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50"
        >
          <LinkIcon />
          GitHub
        </a>
      )}
      {productionUrl && (
        <a
          href={productionUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50"
        >
          <LinkIcon />
          Production
        </a>
      )}
    </div>
  );
}

function TaskItem({ task }: { task: {
  id: string;
  title: string;
  priority: string;
  dueDate: Date | null;
  githubLink: string | null;
  productionUrl: string | null;
  column: { name: string; board: { projectId: string; project: { name: string } } };
} }) {
  return (
    <a
      href={`/project/${task.column.board.projectId}`}
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
    >
      <PriorityDot priority={task.priority} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="gray">{task.column.board.project.name}</Badge>
          <span className="text-xs text-gray-400">
            {task.column.name}
          </span>
          {task.dueDate && (
            <span
              className={`text-xs ${
                isOverdue(task.dueDate)
                  ? "font-medium text-red-600"
                  : "text-gray-400"
              }`}
            >
              Due {formatDate(task.dueDate)}
            </span>
          )}
        </div>
        <TaskLinks githubLink={task.githubLink} productionUrl={task.productionUrl} />
      </div>
    </a>
  );
}

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

export default async function DashboardPage() {
  const session = await requireSetup();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const now = new Date();

  const allMyTasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: { include: { board: { include: { project: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const overdueTasks = allMyTasks.filter(
    (t) => t.dueDate && t.dueDate < now && t.column.name !== "Done"
  );

  const tasksDueToday = allMyTasks.filter(
    (t) => t.dueDate && isToday(t.dueDate) && t.column.name !== "Done"
  );

  const completedTasks = allMyTasks.filter((t) =>
    ["Done", "Released", "Closed"].includes(t.column.name)
  );

  const inProgressTasks = allMyTasks.filter((t) =>
    ["In Progress", "Review"].includes(t.column.name)
  );

  const totalAssigned = allMyTasks.length;
  const completionPct = totalAssigned > 0
    ? Math.round((completedTasks.length / totalAssigned) * 100)
    : 0;

  const projectNames = [
    ...new Set(allMyTasks.map((t) => t.column.board.project.name)),
  ];

  const recentTasks = await prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: session.user.id },
        { reporterId: session.user.id },
      ],
    },
    include: {
      column: { include: { board: { include: { project: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const upcomingTasks = allMyTasks
    .filter((t) => t.dueDate && t.dueDate >= now && t.column.name !== "Done")
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 5);

  return (
    <div className="bg-slate-50 min-h-screen">
      <Nav workspaces={workspaces} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, {user.name}
            </p>
          </div>
          <a
            href="/my-tasks"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            View all tasks
            <ArrowUpRight />
          </a>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<ListIcon />}
            title="Assigned to me"
            value={totalAssigned}
            description={completionPct > 0 ? `${completionPct}% completed` : "Tasks assigned to you"}
            accentClass="text-blue-600"
            bgAccentClass="bg-blue-50"
          />
          <StatCard
            icon={<ClockIcon />}
            title="Due Today"
            value={tasksDueToday.length}
            description="Tasks due today"
            accentClass="text-amber-600"
            bgAccentClass="bg-amber-50"
          />
          <StatCard
            icon={<CheckIcon />}
            title="Completed"
            value={completedTasks.length}
            description={completionPct > 0 ? `${completionPct}% of assigned` : "Tasks completed"}
            accentClass="text-emerald-600"
            bgAccentClass="bg-emerald-50"
          />
          <StatCard
            icon={<GridIcon />}
            title="Overdue"
            value={overdueTasks.length}
            description="Tasks past their due date"
            accentClass="text-red-600"
            bgAccentClass="bg-red-50"
          />
        </div>

        {tasksDueToday.length > 0 && (
          <div className="mb-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  Today&apos;s Tasks
                </h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-xs font-medium text-amber-700">
                  {tasksDueToday.length}
                </span>
              </div>
              <div className="space-y-1">
                {tasksDueToday.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            </div>
          </div>
        )}

        {overdueTasks.length > 0 && (
          <div className="mb-5">
            <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-red-700">
                  Overdue Tasks
                </h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100 text-xs font-medium text-red-700">
                  {overdueTasks.length}
                </span>
              </div>
              <div className="space-y-1">
                {overdueTasks.slice(0, 5).map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Statistics</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Assigned</span>
                <span className="font-medium text-gray-900">{totalAssigned}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Completed</span>
                <span className="font-medium text-emerald-600">{completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">In Progress</span>
                <span className="font-medium text-blue-600">{inProgressTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Pending</span>
                <span className="font-medium text-gray-900">{totalAssigned - completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Overdue</span>
                <span className="font-medium text-red-600">{overdueTasks.length}</span>
              </div>
              {completionPct > 0 && (
                <div className="pt-2">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Completion</span>
                    <span className="font-medium text-gray-900">{completionPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Your Projects
              </h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                {projectNames.length}
              </span>
            </div>
            {projectNames.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No projects yet</p>
            ) : (
              <div className="space-y-1">
                {projectNames.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <ProjectIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Recently Updated
              </h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                {recentTasks.length}
              </span>
            </div>
            <div className="space-y-1">
              {recentTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No recent tasks</p>
              ) : (
                recentTasks.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))
              )}
            </div>
          </div>
        </div>

        {upcomingTasks.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Upcoming Timeline
              </h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-xs font-medium text-blue-700">
                {upcomingTasks.length}
              </span>
            </div>
            <div className="space-y-1">
              {upcomingTasks.map((t) => (
                <div key={t.id} className="relative pl-8">
                  <div className="absolute left-3 top-3 h-2 w-2 rounded-full border-2 border-blue-400 bg-white" />
                  <div className="absolute left-[11px] top-6 h-full w-px bg-gray-200" />
                  <TaskItem task={t} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
