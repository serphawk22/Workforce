import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { Nav } from "@/components/nav";
import { StatCard } from "@/components/dashboard/stat-card";
import { Avatar } from "@/components/ui/avatar";
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

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors">
      <polyline points="9 18 15 12 9 6" />
    </svg>
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
  const session = await requireAuth();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const myTasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: { include: { board: { include: { project: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const now = new Date();
  const overdueTasks = myTasks.filter(
    (t) => t.dueDate && t.dueDate < now && t.column.name !== "Done"
  );

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

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard
            icon={<ListIcon />}
            title="Assigned to me"
            value={myTasks.length}
            description="Tasks assigned to you"
            accentClass="text-blue-600"
            bgAccentClass="bg-blue-50"
          />
          <StatCard
            icon={<ClockIcon />}
            title="Overdue"
            value={overdueTasks.length}
            description="Tasks past their due date"
            accentClass="text-red-600"
            bgAccentClass="bg-red-50"
          />
          <StatCard
            icon={<GridIcon />}
            title="Workspaces"
            value={workspaces.length}
            description="Workspaces you belong to"
            accentClass="text-emerald-600"
            bgAccentClass="bg-emerald-50"
          />
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Welcome to TaskFlow!
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              Create your first workspace to get started with managing projects and tasks.
            </p>
            <CreateWorkspaceForm />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  Your Workspaces
                </h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                  {workspaces.length}
                </span>
              </div>
              <div className="space-y-1">
                {workspaces.map((w) => (
                  <a
                    key={w.id}
                    href={`/workspace/${w.id}`}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <Avatar name={w.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {w.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Created {formatRelativeTime(w.createdAt)}
                      </p>
                    </div>
                    <ChevronRight />
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
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
                    <a
                      key={t.id}
                      href={`/project/${t.column.board.projectId}`}
                      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
                    >
                      <PriorityDot priority={t.priority} />
                      <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {t.title}
                          </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="gray">{t.column.board.project.name}</Badge>
                          <span className="text-xs text-gray-400">
                            {t.column.name}
                          </span>
                          {t.dueDate && (
                            <span
                              className={`text-xs ${
                                isOverdue(t.dueDate)
                                  ? "font-medium text-red-600"
                                  : "text-gray-400"
                              }`}
                            >
                              Due {formatDate(t.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CreateWorkspaceForm() {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        const { createWorkspace } = await import("@/actions/workspace");
        await createWorkspace(formData);
      }}
      className="mx-auto flex max-w-sm gap-2"
    >
      <input
        name="name"
        placeholder="Workspace name"
        required
        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors hover:border-gray-400"
      />
      <button
        type="submit"
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        Create
      </button>
    </form>
  );
}
