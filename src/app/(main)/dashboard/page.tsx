import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatRelativeTime, isToday, getWeekStart } from "@/lib/dates";
import { UpdateWorkButton } from "@/components/work-update/update-work-button";
import {
  ListChecks,
  Clock,
  CheckCircle2,
  Rocket,
  ArrowUpRight,
  AlertCircle,
  CalendarDays,
  FolderKanban,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function StatCard({ icon, title, value, description, color }: { icon: React.ReactNode; title: string; value: number; description: string; color: string }) {
  const colors: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-500/10" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-500/10" },
    green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-500/10" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", ring: "ring-purple-500/10" },
  };
  const c = colors[color as keyof typeof colors] || colors.blue;

  return (
    <Card hover className="relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.bg} ${c.text} ring-1 ${c.ring}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function TaskCard({ task }: { task: any }) {
  const priorityColors: Record<string, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-amber-500",
    MEDIUM: "bg-blue-500",
    LOW: "bg-gray-400",
  };
  const priorityLabels: Record<string, string> = {
    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  };

  return (
    <div className="group flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityColors[task.priority] || "bg-gray-400"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="truncate">{task.column?.board?.project?.name || "Project"}</span>
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(new Date(task.dueDate))}
            </span>
          )}
          {task.githubLink && (
            <a href={task.githubLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" onClick={(e) => e.stopPropagation()}>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={
          task.column?.name === "Done" ? "success" :
          task.column?.name === "In Progress" ? "info" :
          task.column?.name === "Review" ? "warning" : "default"
        } size="sm">
          {task.column?.name || "To Do"}
        </Badge>
        {task.assignee && (
          <Avatar name={task.assignee.name} size="sm" />
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireSetup();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  const now = new Date();
  const weekStart = getWeekStart(now);

  const allMyTasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: { include: { board: { include: { project: true } } } },
      assignee: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const overdueTasks = allMyTasks.filter(
    (t) => t.dueDate && t.dueDate < now && t.column.name !== "Done"
  );

  const tasksDueToday = allMyTasks.filter(
    (t) => t.dueDate && isToday(t.dueDate) && t.column.name !== "Done"
  );

  const tasksStartedToday = allMyTasks.filter(
    (t) => t.dateOfDevAcceptOrStart && isToday(t.dateOfDevAcceptOrStart)
  );

  const completedThisWeek = allMyTasks.filter(
    (t) =>
      ["Done", "Released", "Closed"].includes(t.column.name) &&
      t.updatedAt >= weekStart
  );

  const recentlyReleased = allMyTasks.filter(
    (t) =>
      t.dateOfReleaseToProd &&
      t.dateOfReleaseToProd >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  );

  const upcomingReleases = allMyTasks
    .filter(
      (t) =>
        t.dateOfReleaseToProd &&
        t.dateOfReleaseToProd >= now &&
        !["Done", "Released", "Closed"].includes(t.column.name)
    )
    .sort((a, b) => a.dateOfReleaseToProd!.getTime() - b.dateOfReleaseToProd!.getTime())
    .slice(0, 5);

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
      assignee: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const upcomingTasks = allMyTasks
    .filter((t) => t.dueDate && t.dueDate >= now && t.column.name !== "Done")
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 5);

  const employeeProjectData = Array.from(new Map(allMyTasks.map((t) => {
    const p = t.column.board.project;
    return [p.id, { id: p.id, name: p.name, key: p.key, tasks: [] as { id: string; title: string; code: string | null; issueKey: string | null }[] }] as const;
  })).values());
  for (const t of allMyTasks) {
    const p = employeeProjectData.find((p) => p.id === t.column.board.project.id);
    if (p) p.tasks.push({ id: t.id, title: t.title, code: t.code, issueKey: t.issueKey });
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Welcome back, {user.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <UpdateWorkButton projects={employeeProjectData} />
          <Link href="/my-tasks">
            <Button variant="secondary" size="md">
              View all tasks
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<ListChecks className="h-6 w-6" />} title="Assigned to me" value={totalAssigned} description={`${completionPct}% completed`} color="blue" />
        <StatCard icon={<Clock className="h-6 w-6" />} title="Due Today" value={tasksDueToday.length} description="Tasks due today" color="amber" />
        <StatCard icon={<CheckCircle2 className="h-6 w-6" />} title="Completed" value={completedTasks.length} description="Tasks completed" color="green" />
        <StatCard icon={<Rocket className="h-6 w-6" />} title="Started Today" value={tasksStartedToday.length} description="Dev started today" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {overdueTasks.length > 0 && (
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <h2 className="text-base font-semibold text-gray-900">Overdue Tasks</h2>
              </div>
              <Badge variant="danger" size="sm">{overdueTasks.length}</Badge>
            </div>
            <div className="divide-y divide-gray-100">
              {overdueTasks.slice(0, 5).map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Statistics</h2>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Total Assigned</span>
                <span className="font-medium text-gray-900">{totalAssigned}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Completed</span>
                <span className="font-medium text-green-600">{completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">In Progress</span>
                <span className="font-medium text-blue-600">{inProgressTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Pending</span>
                <span className="font-medium text-gray-900">{totalAssigned - completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-400">Overdue</span>
                <span className="font-medium text-red-600">{overdueTasks.length}</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-400">Completion</span>
                  <span className="font-semibold text-gray-900">{completionPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {completedThisWeek.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h2 className="text-base font-semibold text-gray-900">Completed This Week</h2>
              </div>
              <Badge variant="success" size="sm">{completedThisWeek.length}</Badge>
            </div>
            <div className="divide-y divide-gray-100">
              {completedThisWeek.slice(0, 5).map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          </Card>
        )}

        {upcomingReleases.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-purple-500" />
                <h2 className="text-base font-semibold text-gray-900">Upcoming Releases</h2>
              </div>
              <Badge variant="info" size="sm">{upcomingReleases.length}</Badge>
            </div>
            <div className="divide-y divide-gray-100">
              {upcomingReleases.map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Your Projects</h2>
            </div>
            <Badge variant="default" size="sm">{projectNames.length}</Badge>
          </div>
          {projectNames.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No projects yet</p>
          ) : (
            <div className="space-y-2">
              {projectNames.map((name) => (
                <div key={name} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Recently Updated</h2>
            </div>
            <Badge variant="default" size="sm">{recentTasks.length}</Badge>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No recent tasks</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentTasks.map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          )}
        </Card>

        {upcomingTasks.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">Upcoming Timeline</h2>
              </div>
              <Badge variant="info" size="sm">{upcomingTasks.length}</Badge>
            </div>
            <div className="space-y-1">
              {upcomingTasks.map((t, i) => (
                <div key={t.id} className="relative pl-8">
                  <div className="absolute left-3 top-4 h-2.5 w-2.5 rounded-full border-2 border-blue-400 bg-white" />
                  {i < upcomingTasks.length - 1 && (
                    <div className="absolute left-[11px] top-7 h-full w-px bg-gray-200" />
                  )}
                  <TaskCard task={t} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
