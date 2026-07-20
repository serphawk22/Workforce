import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeTime, getWeekStart } from "@/lib/dates";
import { AdminWorkflowActions } from "./admin-workflow-actions";
import {
  Users,
  FolderKanban,
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  UserCheck,
  Flame,
  CalendarDays,
  BarChart3,
  ExternalLink,
  TrendingUp,
  PlayCircle,
} from "lucide-react";

function getWeekEnd(date: Date): Date {
  const end = new Date(date);
  end.setDate(end.getDate() + (7 - end.getDay()));
  end.setHours(23, 59, 59, 999);
  return end;
}

function isToday(date: Date): boolean {
  const n = new Date();
  return date.getFullYear() === n.getFullYear() && date.getMonth() === n.getMonth() && date.getDate() === n.getDate();
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const userId = session.user.id;
  const now = new Date();

  const myTasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    include: { column: { select: { name: true } } },
  });

  const myTotal = myTasks.length;
  const myCompleted = myTasks.filter((t) => ["Done", "Released", "Closed"].includes(t.column.name)).length;
  const myOverdue = myTasks.filter((t) => t.dueDate && t.dueDate < now && !["Done", "Released", "Closed"].includes(t.column.name)).length;
  const myDueToday = myTasks.filter((t) => t.dueDate && isToday(t.dueDate) && !["Done", "Released", "Closed"].includes(t.column.name)).length;
  const myPct = myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0;

  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalEmployees, activeEmployees, totalTasks, totalProjects, columnStats, recentlyUpdated, unassignedCount, qaPendingCount, completedThisWeekCount, recentlyReleased, reassignedTodayCount, tasksWithoutUpdatesCount, tasksDueThisWeek, employeeWorkload, pendingWorkUpdatesCount, submittedTodayCount, overdueWorkUpdatesCount, workspace, labels] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
    prisma.task.count(),
    prisma.project.count(),
    prisma.task.groupBy({ by: ["columnId"], _count: true }),
    prisma.task.findMany({
      where: { updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      include: { assignee: { select: { id: true, name: true } }, column: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.task.count({ where: { assigneeId: null } }),
    prisma.task.count({ where: { column: { name: { in: ["Review"] } }, dateOfQaOrUatComplete: null } }),
    prisma.task.count({ where: { column: { name: { in: ["Done", "Released", "Closed"] } }, updatedAt: { gte: weekStart } } }),
    prisma.task.findMany({
      where: { dateOfReleaseToProd: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      include: { assignee: { select: { id: true, name: true } }, column: { select: { name: true } } },
      orderBy: { dateOfReleaseToProd: "desc" },
      take: 10,
    }),
    prisma.reassignmentHistory.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.task.count({
      where: { updatedAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, NOT: { column: { name: { in: ["Done", "Released", "Closed"] } } } },
    }),
    prisma.task.count({
      where: { dueDate: { gte: weekStart, lte: weekEnd }, NOT: { column: { name: { in: ["Done", "Released", "Closed"] } } } },
    }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true },
      select: { id: true, name: true, _count: { select: { assignedTasks: true } } },
      orderBy: { assignedTasks: { _count: "desc" } },
    }),
    prisma.task.count({
      where: { assigneeId: { not: null }, workUpdates: { none: {} }, NOT: { column: { name: { in: ["Done", "Released", "Closed"] } } } },
    }),
    prisma.workUpdate.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.task.count({
      where: { assigneeId: { not: null }, NOT: { column: { name: { in: ["Done", "Released", "Closed"] } } }, workUpdates: { some: { createdAt: { lt: sevenDaysAgo } } } },
    }),
    prisma.workspace.findFirst({ where: { members: { some: { userId: session.user.id } } }, select: { id: true, name: true } }),
    prisma.label.findMany({ select: { id: true, name: true, color: true } }),
  ]);

  const highestWorkload = employeeWorkload.slice(0, 3);
  const lowestWorkload = [...employeeWorkload].reverse().slice(0, 3).filter((e) => e._count.assignedTasks > 0);

  const columns = await prisma.column.findMany({ where: { id: { in: columnStats.map((c) => c.columnId) } } });
  const columnNameMap = new Map(columns.map((c) => [c.id, c.name]));

  const doneColumnIds = columns.filter((c) => ["Done", "Released", "Closed"].includes(c.name)).map((c) => c.id);
  const completedCount = doneColumnIds.length > 0
    ? columnStats.filter((c) => doneColumnIds.includes(c.columnId)).reduce((sum, c) => sum + c._count, 0)
    : 0;

  const overdueCount = await prisma.task.count({ where: { dueDate: { lt: now } } });

  const members = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-400 mt-1">Admin dashboard with your personal work and organization overview</p>
      </div>

      <Card className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-gray-900">My Work</h2>
          </div>
          <div className="flex gap-2">
            <Link href="/my-tasks"><Button variant="secondary" size="sm">My Tasks <ArrowUpRight className="h-3 w-3" /></Button></Link>
            <Link href="/my-projects"><Button variant="secondary" size="sm">My Projects <ArrowUpRight className="h-3 w-3" /></Button></Link>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-4">
          {[
            { label: "My Tasks", value: myTotal, color: "text-gray-900" },
            { label: "Due Today", value: myDueToday, color: myDueToday > 0 ? "text-amber-600" : "text-gray-900" },
            { label: "Completed", value: myCompleted, color: "text-green-600" },
            { label: "Overdue", value: myOverdue, color: myOverdue > 0 ? "text-red-600" : "text-gray-900" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        {myTotal > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-400">Completion</span>
              <span className="font-semibold text-gray-900">{myPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${myPct}%` }} />
            </div>
          </div>
        )}
      </Card>

      <div className="mb-8">
        <AdminWorkflowActions
          workspace={workspace}
          members={members.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
          projects={projects}
          labels={labels}
        />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { icon: <Users className="h-6 w-6" />, title: "Total Employees", value: totalEmployees, desc: `${activeEmployees} active`, color: "blue" },
          { icon: <FolderKanban className="h-6 w-6" />, title: "Total Projects", value: totalProjects, desc: "Active projects", color: "indigo" },
          { icon: <CheckSquare className="h-6 w-6" />, title: "Total Tasks", value: totalTasks, desc: `${unassignedCount} unassigned`, color: "purple" },
          { icon: <CheckCircle2 className="h-6 w-6" />, title: "Completed", value: completedCount, desc: `${totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0}% of all tasks`, color: "green" },
          { icon: <Clock className="h-6 w-6" />, title: "Pending", value: totalTasks - completedCount, desc: "Not yet completed", color: "amber" },
          { icon: <AlertTriangle className="h-6 w-6" />, title: "Overdue", value: overdueCount, desc: "Past due date", color: "red" },
        ].map((s, i) => {
          const colors: Record<string, string> = {
            blue: "bg-blue-50 text-blue-600", indigo: "bg-indigo-50 text-indigo-600",
            purple: "bg-purple-50 text-purple-600", green: "bg-green-50 text-green-600",
            amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600",
          };
          return (
            <Card key={i} hover>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-1">{s.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.desc}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-black/5 ${colors[s.color] || "bg-gray-50 text-gray-500"}`}>
                  {s.icon}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Manager Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1.5 mb-2"><RefreshCw className="h-3.5 w-3.5" /> Reassigned Today</p>
          <p className="text-2xl font-bold text-amber-600">{reassignedTodayCount}</p>
          <p className="text-xs text-gray-400 mt-1">Tasks reassigned today</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1.5 mb-2"><AlertCircle className="h-3.5 w-3.5" /> Stale Tasks</p>
          <p className="text-2xl font-bold text-red-600">{tasksWithoutUpdatesCount}</p>
          <p className="text-xs text-gray-400 mt-1">No update in 7+ days</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1.5 mb-2"><CalendarDays className="h-3.5 w-3.5" /> Due This Week</p>
          <p className="text-2xl font-bold text-blue-600">{tasksDueThisWeek}</p>
          <p className="text-xs text-gray-400 mt-1">Tasks due this week</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide flex items-center gap-1.5 mb-2"><Flame className="h-3.5 w-3.5" /> Highest Workload</p>
          <div className="space-y-1.5 mt-1">
            {highestWorkload.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-xs">
                <Link href={`/admin/team/${e.id}`} className="font-medium text-purple-800 hover:underline truncate">{e.name}</Link>
                <span className="text-purple-600 font-medium">{e._count.assignedTasks}</span>
              </div>
            ))}
            {highestWorkload.length === 0 && <p className="text-xs text-gray-400">No data</p>}
          </div>
        </Card>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Updates</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide flex items-center gap-1.5 mb-2"><Clock className="h-3.5 w-3.5" /> Pending</p>
          <p className="text-2xl font-bold text-orange-600">{pendingWorkUpdatesCount}</p>
          <p className="text-xs text-gray-400 mt-1">Tasks never updated</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide flex items-center gap-1.5 mb-2"><TrendingUp className="h-3.5 w-3.5" /> Submitted Today</p>
          <p className="text-2xl font-bold text-green-600">{submittedTodayCount}</p>
          <p className="text-xs text-gray-400 mt-1">Work updates today</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1.5 mb-2"><AlertTriangle className="h-3.5 w-3.5" /> Overdue</p>
          <p className="text-2xl font-bold text-red-600">{overdueWorkUpdatesCount}</p>
          <p className="text-xs text-gray-400 mt-1">No update in 7+ days</p>
        </Card>
      </div>

      {lowestWorkload.length > 0 && (
        <Card className="mb-8 border-green-200 bg-green-50/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5"><UserCheck className="h-4 w-4" /> Lowest Workload</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowestWorkload.map((e: any) => (
                  <Link key={e.id} href={`/admin/team/${e.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-green-700 border border-green-200 hover:bg-green-50 transition-colors">
                    {e.name} <span className="text-green-500">({e._count.assignedTasks})</span>
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/admin/workload"><Button variant="secondary" size="sm">View Workload</Button></Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-gray-400" /> Tasks by Column</h2>
          <div className="space-y-3">
            {columnStats.map((c) => {
              const colName = columnNameMap.get(c.columnId) ?? "Unknown";
              const pct = totalTasks > 0 ? Math.round((c._count / totalTasks) * 100) : 0;
              return (
                <div key={c.columnId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{colName}</span>
                    <span className="text-gray-400">{c._count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {columnStats.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No tasks yet</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><RefreshCw className="h-5 w-5 text-gray-400" /> Recently Updated</h2>
          {recentlyUpdated.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No recent updates</p>
          ) : (
            <div className="space-y-2">
              {recentlyUpdated.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.assignee && <span className="text-xs text-gray-400">{t.assignee.name}</span>}
                      <Badge variant="gray" size="sm">{t.column.name}</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-3">{formatDateTime(t.updatedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="border-blue-100">
          <h2 className="text-base font-semibold text-blue-700 mb-2 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Completed This Week</h2>
          <p className="text-3xl font-bold text-blue-600">{completedThisWeekCount}</p>
          <p className="text-xs text-gray-400 mt-1">Tasks moved to Done/Released/Closed</p>
        </Card>
        <Card className="border-amber-100">
          <h2 className="text-base font-semibold text-amber-700 mb-2 flex items-center gap-2"><PlayCircle className="h-5 w-5" /> QA Pending</h2>
          <p className="text-3xl font-bold text-amber-600">{qaPendingCount}</p>
          <p className="text-xs text-gray-400 mt-1">In Review without QA completion date</p>
        </Card>
      </div>

      {recentlyReleased.length > 0 && (
        <Card className="mb-8 border-purple-100">
          <h2 className="text-base font-semibold text-purple-700 mb-4 flex items-center gap-2"><ExternalLink className="h-5 w-5" /> Recently Released (7 days)</h2>
          <div className="space-y-2">
            {recentlyReleased.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.assignee && <span className="text-xs text-gray-400">{t.assignee.name}</span>}
                    <Badge variant="gray" size="sm">{t.column.name}</Badge>
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-3">{t.dateOfReleaseToProd ? formatDate(t.dateOfReleaseToProd) : ""}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><ExternalLink className="h-5 w-5 text-gray-400" /> Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/team"><Button variant="primary" size="sm">Team Overview</Button></Link>
          <Link href="/dashboard"><Button variant="secondary" size="sm">My Dashboard</Button></Link>
          <Link href="/my-tasks"><Button variant="secondary" size="sm">My Tasks</Button></Link>
          <Link href="/admin/analytics"><Button variant="secondary" size="sm">Analytics</Button></Link>
        </div>
      </Card>
    </div>
  );
}
