import { prisma } from "@/lib/prisma";

export async function logActivity(
  taskId: string,
  userId: string,
  action: string,
  details?: {
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await prisma.activityLog.create({
    data: {
      taskId,
      userId,
      action,
      fieldName: details?.fieldName ?? null,
      oldValue: details?.oldValue ?? null,
      newValue: details?.newValue ?? null,
      metadata: details?.metadata ? JSON.stringify(details.metadata) : null,
    },
  });
}

export async function getActivityLog(taskId: string) {
  const logs = await prisma.activityLog.findMany({
    where: { taskId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));
}
