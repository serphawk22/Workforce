import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { isAdmin } from "@/lib/authorization";

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function EmployeeDetailPage(props: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await props.params;
  const session = await requireSetup();
  const admin = await isAdmin();

  if (session.user.id !== employeeId && !admin) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Nav workspaces={[]} />
        <main className="mx-auto max-w-7xl px-6 py-8 text-center">
          <p className="text-sm text-gray-500">You do not have permission to view this page.</p>
          <Link href="/team" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Back to Team
          </Link>
        </main>
      </div>
    );
  }

  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    include: {
      assignedTasks: {
        include: {
          column: {
            select: {
              name: true,
              board: { select: { project: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!employee) notFound();

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const now = new Date();
  const tasks = employee.assignedTasks;

  const completedTasks = tasks.filter((t) =>
    ["Done", "Released", "Closed"].includes(t.column.name)
  );
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && t.dueDate < now && !["Done", "Released", "Closed"].includes(t.column.name)
  );
  const pendingTasks = tasks.filter(
    (t) => !["Done", "Released", "Closed"].includes(t.column.name)
  );

  const projectNames = [...new Set(tasks.map((t) => t.column.board.project.name))];
  const totalTasks = tasks.length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const displayName = employee.displayName || employee.name;

  return (
    <div className="bg-slate-50 min-h-screen">
      <Nav workspaces={workspaces} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <Link
            href="/team"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Team
          </Link>
          <div className="mt-2 flex items-center gap-4">
            <Avatar name={displayName} url={employee.avatarUrl} size="lg" className="h-14 w-14 text-xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <a href={`mailto:${employee.email}`} className="hover:text-blue-600 transition-colors">
                  {employee.email}
                </a>
                <Badge variant={employee.role === "ADMIN" ? "primary" : "default"}>
                  {employee.role}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
            <p className="text-xs text-gray-500 mt-1">Total Assigned</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{completedTasks.length}</p>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-600">{pendingTasks.length}</p>
            <p className="text-xs text-gray-500 mt-1">Pending</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${overdueTasks.length > 0 ? "text-red-600" : "text-gray-400"}`}>
              {overdueTasks.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Overdue</p>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Completion Progress</h2>
            <span className="text-sm font-medium text-gray-700">{completionPct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${completionPct > 0 ? "bg-emerald-500" : "bg-gray-200"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {projectNames.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {projectNames.map((name) => (
                <Badge key={name} variant="gray">{name}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              All Tasks ({totalTasks})
            </h2>
          </div>
          {tasks.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-400">No tasks assigned.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tasks.map((t) => {
                const isOverdue = t.dueDate && t.dueDate < now && !["Done", "Released", "Closed"].includes(t.column.name);
                return (
                  <div key={t.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${
                            t.column.name === "Done" ? "bg-emerald-500" :
                            t.column.name === "In Progress" ? "bg-blue-500" :
                            t.column.name === "Review" ? "bg-amber-500" :
                            "bg-gray-300"
                          }`} />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {t.title}
                          </p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <Badge variant="gray">{t.column.board.project.name}</Badge>
                          <span>{t.column.name}</span>
                          {t.dueDate && (
                            <span className={isOverdue ? "font-medium text-red-600" : ""}>
                              Due {formatDate(t.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
