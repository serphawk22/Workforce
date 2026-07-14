import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

export default async function WorkloadPage() {
  await requireAdmin();
  const now = new Date();

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    include: {
      assignedTasks: {
        include: { column: { select: { name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const columns = await prisma.column.findMany({
    where: {
      board: { project: { workspace: { members: { some: { userId: { not: undefined } } } } } },
    },
  });

  const totalTasks = await prisma.task.count();
  const employeeCount = employees.length;
  const tasksPerEmployee = employeeCount > 0 ? Math.ceil(totalTasks / employeeCount) : 0;

  const workloadData = employees.map((emp) => {
    const tasks = emp.assignedTasks;
    const total = tasks.length;
    const inProgress = tasks.filter((t) => ["In Progress", "Started", "Working"].includes(t.column.name)).length;
    const completed = tasks.filter((t) => ["Done", "Released", "Closed"].includes(t.column.name)).length;
    const overdue = tasks.filter(
      (t) => t.dueDate && t.dueDate < now && !["Done", "Released", "Closed"].includes(t.column.name)
    ).length;
    const capacity = tasksPerEmployee;
    const remaining = Math.max(0, capacity - total);

    return { id: emp.id, name: emp.name, email: emp.email, total, inProgress, completed, overdue, capacity, remaining };
  });

  const maxTotal = Math.max(...workloadData.map((w) => w.total), 1);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Workload Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Employee workload distribution — {employeeCount} active employees, {totalTasks} total tasks
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">In Progress</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Remaining</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Load</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workloadData.map((w) => {
              const pct = Math.round((w.total / maxTotal) * 100);
              const isOverloaded = w.total > w.capacity;
              return (
                <tr key={w.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/team/${w.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {w.name}
                    </Link>
                    <p className="text-xs text-gray-400">{w.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">{w.total}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.inProgress > 0 ? "bg-blue-50 text-blue-700" : "text-gray-400"
                    }`}>
                      {w.inProgress}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.completed > 0 ? "bg-emerald-50 text-emerald-700" : "text-gray-400"
                    }`}>
                      {w.completed}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.overdue > 0 ? "bg-red-50 text-red-700" : "text-gray-400"
                    }`}>
                      {w.overdue}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">{w.capacity}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-medium ${isOverloaded ? "text-red-600" : "text-emerald-600"}`}>
                      {isOverloaded ? "Overloaded" : w.remaining}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverloaded ? "bg-red-500" : w.total === 0 ? "bg-gray-200" : "bg-blue-500"
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className={`shrink-0 text-xs font-medium ${isOverloaded ? "text-red-600" : "text-gray-500"}`}>
                        {pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {workloadData.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                  No active employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
