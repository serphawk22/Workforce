import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import { GoogleSyncClient } from "./client";

export const dynamic = "force-dynamic";

export default async function GoogleSyncPage() {
  await requireAdmin();

  const [latestSync, syncLogs] = await Promise.all([
    prisma.syncLog.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Google Sheets Sync
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Admin panel for synchronizing Google Sheet data with the database.
        </p>
      </div>

      <GoogleSyncClient
        latestSync={
          latestSync
            ? {
                startedAt: latestSync.startedAt.toISOString(),
                finishedAt: latestSync.finishedAt?.toISOString() ?? null,
                rowsRead: latestSync.rowsRead,
                rowsCreated: latestSync.rowsCreated,
                rowsUpdated: latestSync.rowsUpdated,
                rowsReassigned: latestSync.rowsReassigned,
                rowsSkipped: latestSync.rowsSkipped,
                rowsFailed: latestSync.rowsFailed,
                error: latestSync.error ?? null,
              }
            : null
        }
        syncLogs={syncLogs.map((l) => ({
          id: l.id,
          startedAt: l.startedAt.toISOString(),
          finishedAt: l.finishedAt?.toISOString() ?? null,
          rowsRead: l.rowsRead,
          rowsCreated: l.rowsCreated,
          rowsUpdated: l.rowsUpdated,
          rowsReassigned: l.rowsReassigned,
          rowsSkipped: l.rowsSkipped,
          rowsFailed: l.rowsFailed,
          error: l.error ?? null,
        }))}
      />
    </main>
  );
}
