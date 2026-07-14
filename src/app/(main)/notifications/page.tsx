import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import Link from "next/link";
import { formatDate } from "@/lib/dates";

export default async function NotificationsPage() {
  const session = await requireSetup();
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">Your latest activity updates</p>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-12 w-12 text-gray-300">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`rounded-lg border ${n.read ? "border-gray-100 bg-white" : "border-blue-100 bg-blue-50"} p-4 transition-colors hover:bg-gray-50`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm ${n.read ? "text-gray-900" : "font-semibold text-gray-900"}`}>{n.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{n.message}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{formatDate(n.createdAt.toISOString())}</span>
              </div>
              {n.taskId && (
                <Link href={`/project/${n.taskId}`} className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                  View issue →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
