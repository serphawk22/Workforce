import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { AllTasksClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminAllTasksPage() {
  await requireAdmin();

  const allTasks = await prisma.task.findMany({
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      reporter: { select: { id: true, name: true } },
      column: { select: { name: true, board: { select: { project: { select: { id: true, name: true } } } } } },
      labels: { include: { label: true } },
      childTasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          column: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });

  const parentTasks = allTasks.filter((t) => !t.parentTaskId);
  const childCount = allTasks.filter((t) => t.parentTaskId).length;

  const [projects, employees] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: { id: true, name: true, displayName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const statuses = [...new Set(parentTasks.map((t) => t.column.name))].sort();
  const categories = [...new Set(parentTasks.map((t) => t.category).filter(Boolean))].sort() as string[];
  const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Tasks</h1>
        <p className="mt-1 text-sm text-gray-500">
          {parentTasks.length} parent task{parentTasks.length !== 1 ? "s" : ""} &middot; {childCount} subtask{childCount !== 1 ? "s" : ""} across all projects
        </p>
      </div>
      <AllTasksClient
        tasks={JSON.parse(JSON.stringify(parentTasks))}
        projects={projects}
        employees={employees}
        statuses={statuses}
        categories={categories}
        priorities={priorities}
      />
    </main>
  );
}
