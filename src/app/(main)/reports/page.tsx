import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { ReportsView } from "@/components/reports/reports-view";
import { getMonthKey } from "@/lib/dates";

export default async function ReportsPage() {
  const session = await requireSetup();

  const tasks = await prisma.task.findMany({
    where: {
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
      column: {
        select: {
          name: true,
          board: {
            select: {
              project: { select: { id: true, name: true } },
            },
          },
        },
      },
      assignee: { select: { id: true, name: true } },
    },
  });

  const now = new Date();

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  const projectCounts: Record<string, { id: string; name: string; count: number }> = {};
  const employeeCounts: Record<string, { name: string; count: number; completed: number }> = {};
  const monthlyCounts: Record<string, { created: number; completed: number }> = {};

  for (const t of tasks) {
    statusCounts[t.column.name] = (statusCounts[t.column.name] || 0) + 1;
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;

    const pId = t.column.board.project.id;
    if (!projectCounts[pId]) {
      projectCounts[pId] = { id: pId, name: t.column.board.project.name, count: 0 };
    }
    projectCounts[pId].count++;

    if (t.assignee) {
      if (!employeeCounts[t.assignee.id]) {
        employeeCounts[t.assignee.id] = { name: t.assignee.name, count: 0, completed: 0 };
      }
      employeeCounts[t.assignee.id].count++;
      if (["Done", "Released", "Closed"].includes(t.column.name)) {
        employeeCounts[t.assignee.id].completed++;
      }
    }

    const monthKey = getMonthKey(t.createdAt);
    if (!monthlyCounts[monthKey]) monthlyCounts[monthKey] = { created: 0, completed: 0 };
    monthlyCounts[monthKey].created++;
  }

  for (const t of tasks) {
    if (["Done", "Released", "Closed"].includes(t.column.name)) {
      const monthKey = getMonthKey(t.updatedAt);
      if (!monthlyCounts[monthKey]) monthlyCounts[monthKey] = { created: 0, completed: 0 };
      monthlyCounts[monthKey].completed++;
    }
  }

  const sortedMonths = Object.entries(monthlyCounts).sort(([a], [b]) => {
    const da = new Date(a);
    const db = new Date(b);
    return da.getTime() - db.getTime();
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => ["Done", "Released", "Closed"].includes(t.column.name)).length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && !["Done", "Released", "Closed"].includes(t.column.name)).length;

  const sortedEmployees = Object.values(employeeCounts).sort((a, b) => b.count - a.count);
  const sortedProjects = Object.values(projectCounts).sort((a, b) => b.count - a.count);

  const data = {
    totalTasks,
    completedTasks,
    completionPct,
    overdueTasks,
    statusCounts,
    priorityCounts,
    projects: sortedProjects,
    employees: sortedEmployees,
    monthly: sortedMonths,
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Task and project reports with exportable data</p>
      </div>
      <ReportsView data={data} />
    </main>
  );
}
