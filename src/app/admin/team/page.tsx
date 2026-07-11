import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { Badge } from "@/components/ui/badge";
import { CreateEmployeeModal } from "./create-employee-modal";

export default async function TeamPage() {
  await requireAdmin();

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      assignedTasks: {
        include: {
          column: {
            select: {
              name: true,
              board: { select: { project: { select: { name: true } } } },
            },
          },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const tasksWithProject = employees.map((emp) => {
    const tasks = emp.assignedTasks;
    const completedTasks = tasks.filter((t) =>
      ["Done", "Released", "Closed"].includes(t.column.name)
    );
    const inProgressTasks = tasks.filter((t) =>
      ["In Progress", "Review"].includes(t.column.name)
    );
    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < new Date() &&
        !["Done", "Released", "Closed"].includes(t.column.name)
    );
    const uniqueProjects = new Set(
      tasks.map((t) => t.column.board.project.name)
    );
    const totalTasks = tasks.length;
    const completionPct = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    return {
      id: emp.id,
      name: emp.displayName || emp.name,
      email: emp.email,
      avatarUrl: emp.avatarUrl,
      role: emp.role,
      isActive: emp.isActive,
      totalTasks,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      overdueTasks: overdueTasks.length,
      projects: Array.from(uniqueProjects),
      completionPct,
    };
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            {employees.length} employee{employees.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <CreateEmployeeModal />
      </div>

      {tasksWithProject.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-gray-400">No employees found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tasksWithProject.map((emp) => (
            <a
              key={emp.id}
              href={`/admin/team/${emp.id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {emp.name}
                    {!emp.isActive && (
                      <span className="ml-1.5 text-xs text-gray-400">(Inactive)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant={emp.role === "ADMIN" ? "primary" : "default"}>
                      {emp.role === "ADMIN" ? "Admin" : "Employee"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{emp.totalTasks}</p>
                  <p className="text-xs text-gray-500">Assigned</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{emp.completedTasks}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{emp.inProgressTasks}</p>
                  <p className="text-xs text-gray-500">In Progress</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${emp.overdueTasks > 0 ? "text-red-600" : "text-gray-400"}`}>
                    {emp.overdueTasks}
                  </p>
                  <p className="text-xs text-gray-500">Overdue</p>
                </div>
              </div>

              {emp.totalTasks > 0 && (
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium text-gray-700">{emp.completionPct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${emp.completionPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Projects ({emp.projects.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {emp.projects.length > 0 ? (
                    emp.projects.slice(0, 3).map((p) => (
                      <Badge key={p} variant="gray">{p}</Badge>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                  {emp.projects.length > 3 && (
                    <Badge variant="gray">+{emp.projects.length - 3}</Badge>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
