import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, formatRelativeTime, isToday, getWeekStart } from "@/lib/dates";
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
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function StatCard({ icon, title, value, description, color }: { icon: React.ReactNode; title: string; value: number; description: string; color: string }) {
  const colors: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-500", ring: "ring-blue-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500", ring: "ring-amber-500/20" },
    green: { bg: "bg-green-500/10", text: "text-green-500", ring: "ring-green-500/20" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-500", ring: "ring-purple-500/20" },
  };
  const c = colors[color as keyof typeof colors] || colors.blue;

  return (
    <Card hover className="relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
    CRITICAL: "bg-danger",
    HIGH: "bg-warning",
    MEDIUM: "bg-blue-500",
    LOW: "bg-muted-foreground",
  };
  
  const hasChildTasks = task.childTasks && task.childTasks.length > 0;
  const doneStatuses = ["Done", "Released", "Closed"];
  const completedChildTasks = hasChildTasks ? task.childTasks.filter((ct: any) => doneStatuses.includes(ct.column?.name)).length : 0;
  const childProgress = hasChildTasks ? Math.round((completedChildTasks / task.childTasks.length) * 100) : 0;
  
  return (
    <div className="group flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border">
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityColors[task.priority] || "bg-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
          {task.code && <span className="text-xs font-mono text-muted-foreground shrink-0">#{task.code}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="truncate">{task.column?.board?.project?.name || "Project"}</span>
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(new Date(task.dueDate))}
            </span>
          )}
          {task.githubLink && (
            <a href={task.githubLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80" onClick={(e) => e.stopPropagation()}>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
        {hasChildTasks && (
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-16 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-success transition-all" style={{ width: `${childProgress}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{completedChildTasks}/{task.childTasks.length} subtasks</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
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
  const doneStatuses = ["Done", "Released", "Closed"];

  const allMyTasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: { include: { board: { include: { project: true } } } },
      assignee: true,
      childTasks: {
        include: { column: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const overdueTasks = allMyTasks.filter(
    (t) => t.dueDate && t.dueDate < now && !doneStatuses.includes(t.column.name)
  );

  const tasksDueToday = allMyTasks.filter(
    (t) => t.dueDate && isToday(t.dueDate) && !doneStatuses.includes(t.column.name)
  );

  const tasksStartedToday = allMyTasks.filter(
    (t) => t.dateOfDevAcceptOrStart && isToday(t.dateOfDevAcceptOrStart)
  );

  const myChildTasks = await prisma.task.count({
    where: { parentTask: { assigneeId: session.user.id } },
  });

  const completedChildTasks = await prisma.task.count({
    where: { parentTask: { assigneeId: session.user.id }, column: { name: { in: doneStatuses } } },
  });

  const inProgressChildTasks = await prisma.task.count({
    where: { parentTask: { assigneeId: session.user.id }, column: { name: { in: ["In Progress", "Review"] } } },
  });

  const completedThisWeek = allMyTasks.filter(
    (t) =>
      doneStatuses.includes(t.column.name) &&
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
        !doneStatuses.includes(t.column.name)
    )
    .sort((a, b) => a.dateOfReleaseToProd!.getTime() - b.dateOfReleaseToProd!.getTime())
    .slice(0, 5);

  const completedTasks = allMyTasks.filter((t) =>
    doneStatuses.includes(t.column.name)
  );

  const inProgressTasks = allMyTasks.filter((t) =>
    ["In Progress", "Review"].includes(t.column.name)
  );

  let totalUnits = 0;
  let completedUnits = 0;
  for (const t of allMyTasks) {
    if (t.childTasks && t.childTasks.length > 0) {
      const doneChildren = t.childTasks.filter((ct: any) => doneStatuses.includes(ct.column?.name)).length;
      totalUnits += t.childTasks.length;
      completedUnits += doneChildren;
    } else {
      totalUnits += 1;
      if (doneStatuses.includes(t.column.name)) {
        completedUnits += 1;
      }
    }
  }
  const completionPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
  const totalAssigned = allMyTasks.length;

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
    .filter((t) => t.dueDate && t.dueDate >= now && !doneStatuses.includes(t.column.name))
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {user.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/daily-work">
            <Button size="sm">
              <ClipboardList className="h-4 w-4" />
              Daily Work
            </Button>
          </Link>
          <Link href="/my-tasks">
            <Button variant="secondary" size="sm">
              View all tasks
              <ArrowUpRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ListChecks className="h-5 w-5" />} title="Assigned to me" value={totalAssigned} description={`${completionPct}% completed`} color="blue" />
        <StatCard icon={<Clock className="h-5 w-5" />} title="Due Today" value={tasksDueToday.length} description="Tasks due today" color="amber" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Completed" value={completedTasks.length} description="Tasks completed" color="green" />
        <StatCard icon={<Rocket className="h-5 w-5" />} title="Started Today" value={tasksStartedToday.length} description="Dev started today" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {overdueTasks.length > 0 && (
          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-danger" />
                <h2 className="text-base font-semibold text-foreground">Overdue Tasks</h2>
              </div>
              <Badge variant="danger" size="sm">{overdueTasks.length}</Badge>
            </div>
            <div className="divide-y divide-border/50 -mx-4">
              {overdueTasks.slice(0, 5).map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          </Card>
        )}

        <Card className="p-5 h-full">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Statistics</h2>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Total Assigned</span>
                <span className="font-medium text-foreground">{totalAssigned}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-success">{completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">In Progress</span>
                <span className="font-medium text-primary">{inProgressTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium text-foreground">{totalAssigned - completedTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Total Subtasks</span>
                <span className="font-medium text-foreground">{myChildTasks}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Subtasks Completed</span>
                <span className="font-medium text-success">{completedChildTasks}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Subtasks In Progress</span>
                <span className="font-medium text-primary">{inProgressChildTasks}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-muted-foreground">Overdue</span>
                <span className="font-medium text-danger">{overdueTasks.length}</span>
              </div>
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">Completion</span>
                  <span className="font-bold text-foreground">{completionPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-1000 ease-out"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {completedThisWeek.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h2 className="text-base font-semibold text-foreground">Completed This Week</h2>
              </div>
              <Badge variant="success" size="sm">{completedThisWeek.length}</Badge>
            </div>
            <div className="divide-y divide-border/50 -mx-4">
              {completedThisWeek.slice(0, 5).map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          </Card>
        )}

        {upcomingReleases.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-purple-500" />
                <h2 className="text-base font-semibold text-foreground">Upcoming Releases</h2>
              </div>
              <Badge variant="info" size="sm">{upcomingReleases.length}</Badge>
            </div>
            <div className="divide-y divide-border/50 -mx-4">
              {upcomingReleases.map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Your Projects</h2>
            </div>
              <Badge variant="default" size="sm">{projectNames.length}</Badge>
          </div>
          {projectNames.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No projects yet</p>
          ) : (
            <div className="space-y-2">
              {projectNames.map((name) => (
                <div key={name} className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 hover:bg-muted/50 hover:border-border transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Recently Updated</h2>
            </div>
            <Badge variant="default" size="sm">{recentTasks.length}</Badge>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent tasks</p>
          ) : (
            <div className="divide-y divide-border/50 -mx-4">
              {recentTasks.map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          )}
        </Card>

        {upcomingTasks.length > 0 && (
          <Card className="p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Upcoming Timeline</h2>
              </div>
              <Badge variant="info" size="sm">{upcomingTasks.length}</Badge>
            </div>
            <div className="space-y-0 -ml-2 -mr-4">
              {upcomingTasks.map((t, i) => (
                <div key={t.id} className="relative pl-8 pb-1">
                  <div className="absolute left-3 top-5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background z-10" />
                  {i < upcomingTasks.length - 1 && (
                    <div className="absolute left-[15px] top-7 bottom-0 w-px bg-border z-0" />
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
