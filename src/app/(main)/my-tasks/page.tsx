import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, isOverdue } from "@/lib/dates";
import { CalendarDays, ArrowUpRight, AlertCircle } from "lucide-react";

const statusColors: Record<string, "default" | "info" | "warning" | "success"> = {
  "To Do": "default",
  "In Progress": "info",
  Review: "warning",
  Done: "success",
  Released: "success",
  Closed: "default",
};

const priorityDots: Record<string, string> = {
  LOW: "bg-gray-300",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  CRITICAL: "bg-red-500",
};

export default async function MyTasksPage() {
  const session = await requireSetup();

  const tasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    include: {
      column: { include: { board: { include: { project: true } } } },
      labels: { include: { label: true } },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-400 mt-1">{tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned to you</p>
      </div>

      {tasks.length === 0 ? (
        <Card className="py-12">
          <div className="text-center">
            <p className="text-sm text-gray-400">No tasks assigned to you.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Link key={t.id} href={`/project/${t.column.board.projectId}`}>
              <Card hover className="block">
                <div className="flex items-start gap-4">
                  <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${priorityDots[t.priority] || "bg-gray-300"}`} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="gray">{t.column.board.project.name}</Badge>
                      <Badge variant={statusColors[t.column.name] || "default"} size="sm">{t.column.name}</Badge>
                      {t.labels.map((tl) => (
                        <span key={tl.id} className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: tl.label.color + "15", color: tl.label.color }}>
                          {tl.label.name}
                        </span>
                      ))}
                    </div>

                    <p className="text-base font-semibold text-gray-900 mb-3 leading-snug">{t.title}</p>

                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-400">
                      {t.createdAt && (
                        <span className="flex items-center gap-1.5">
                          Created {formatDate(t.createdAt)}
                        </span>
                      )}
                      {t.dueDate && (
                        <span className={`flex items-center gap-1.5 ${isOverdue(t.dueDate) && t.column.name !== "Done" ? "text-red-500 font-medium" : ""}`}>
                          <CalendarDays className="h-3 w-3" />
                          Due {formatDate(t.dueDate)}
                          {isOverdue(t.dueDate) && t.column.name !== "Done" && <AlertCircle className="h-3 w-3" />}
                        </span>
                      )}
                      {t.code && <span className="font-mono">#{t.code}</span>}
                      {t.issueKey && <span className="font-mono">{t.issueKey}</span>}
                    </div>
                  </div>

                  <ArrowUpRight className="h-4 w-4 text-gray-300 mt-1.5 shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
