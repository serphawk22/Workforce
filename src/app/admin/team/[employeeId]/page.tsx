import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ResetPasswordButton, DisableEmployeeButton } from "../employee-actions";
import { formatDate, isOverdue as checkOverdue } from "@/lib/dates";

const statusColors: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Review: "bg-amber-50 text-amber-700",
  Done: "bg-emerald-50 text-emerald-700",
  Released: "bg-purple-50 text-purple-700",
  Closed: "bg-gray-100 text-gray-500",
};

export default async function EmployeeDetailPage(props: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await props.params;
  await requireAdmin();

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

  const displayName = employee.displayName || employee.name;
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

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <Link
          href="/admin/team"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Team
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-700">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {displayName}
                {!employee.isActive && (
                  <span className="ml-2 text-sm font-normal text-gray-400">(Inactive)</span>
                )}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <span>{employee.email}</span>
                <Badge variant={employee.role === "ADMIN" ? "primary" : "default"}>
                  {employee.role}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ResetPasswordButton userId={employee.id} />
            <DisableEmployeeButton userId={employee.id} isActive={employee.isActive} />
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
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completionPct}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {projectNames.map((name) => (
            <Badge key={name} variant="gray">{name}</Badge>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Task Timeline ({totalTasks})
          </h2>
        </div>
        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-400">No tasks assigned.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((t) => (
              <div key={t.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${
                    t.column.name === "Done" ? "bg-emerald-500" :
                    t.column.name === "In Progress" ? "bg-blue-500" :
                    t.column.name === "Review" ? "bg-amber-500" :
                    "bg-gray-300"
                  }`} />
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  <span className={`ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[t.column.name] || "bg-gray-100 text-gray-700"}`}>
                    {t.column.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                  <TimelineCell label="Requested" date={t.createdAt} />
                  <TimelineCell label="Dev Start" date={t.dateOfDevAcceptOrStart} dotColor="blue" />
                  <TimelineCell label="Dev Done" date={t.dateOfDevComplete} dotColor="emerald" />
                  <TimelineCell label="QA Started" date={t.dateOfQaOrUatStart} dotColor="amber" />
                  <TimelineCell label="QA Done" date={t.dateOfQaOrUatComplete} dotColor="emerald" />
                  <TimelineCell label="Released" date={t.dateOfReleaseToProd} dotColor="purple" />
                  {t.dueDate && (
                    <TimelineCell
                      label="Due"
                      date={t.dueDate}
                      highlight={checkOverdue(t.dueDate) && !["Done", "Released", "Closed"].includes(t.column.name)}
                    />
                  )}
                </div>
                {t.originalOwner && t.originalOwner !== employee.name && (
                  <p className="mt-2 text-xs text-gray-400">Originally: {t.originalOwner}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TimelineCell({ label, date, dotColor, highlight }: { label: string; date: Date | null; dotColor?: string; highlight?: boolean }) {
  if (!date) return null;
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
      highlight ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"
    }`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${highlight ? "bg-red-400" : dotColor ? `bg-${dotColor}-400` : "bg-gray-300"}`} />
      <div>
        <p className="text-gray-400">{label}</p>
        <p className={`font-medium ${highlight ? "text-red-600" : "text-gray-700"}`}>{formatDate(date)}</p>
      </div>
    </div>
  );
}
