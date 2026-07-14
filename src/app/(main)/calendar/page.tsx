import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const session = await requireSetup();

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { not: null },
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
      assignee: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const serialized = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    dueDate: t.dueDate!.toISOString(),
    projectId: t.column.board.project.id,
    projectName: t.column.board.project.name,
    columnName: t.column.name,
    assigneeName: t.assignee?.name || null,
  }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="mt-1 text-sm text-gray-500">View tasks and deadlines in a calendar format</p>
      </div>
      <CalendarView tasks={serialized} />
    </main>
  );
}
