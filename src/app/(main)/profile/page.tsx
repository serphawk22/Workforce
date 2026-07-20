import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await requireSetup();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      themePreference: true,
      notificationPreferences: true,
      createdAt: true,
    },
  });

  if (!user) return <div>User not found</div>;

  const totalAssignedTasks = await prisma.task.count({
    where: { assigneeId: session.user.id },
  });

  const totalReportedTasks = await prisma.task.count({
    where: { reporterId: session.user.id },
  });

  const doneColumns = await prisma.column.findMany({
    where: { name: { contains: "Done" } },
    select: { id: true },
  });
  const doneColumnIds = doneColumns.map((c) => c.id);

  const completedTasks = doneColumnIds.length > 0
    ? await prisma.task.count({
        where: { assigneeId: session.user.id, columnId: { in: doneColumnIds } },
      })
    : 0;

  const projectIds = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    select: { column: { select: { board: { select: { projectId: true } } } } },
    distinct: ["columnId"],
  });
  const uniqueProjectIds = new Set(projectIds.map((p) => p.column.board.projectId));

  const workUpdatesCount = await prisma.workUpdate.count({
    where: { userId: session.user.id },
  });

  const recentActivity = await prisma.activityLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { task: { select: { title: true } } },
  });

  const activityEntries = recentActivity.map((a) => ({
    id: a.id,
    action: a.action,
    taskTitle: a.task?.title || null,
    fieldName: a.fieldName,
    oldValue: a.oldValue,
    newValue: a.newValue,
    createdAt: a.createdAt.toISOString(),
  }));

  const filledFields = [
    user.displayName, user.avatarUrl, user.themePreference,
  ].filter(Boolean).length;
  const completionPercent = Math.min(100, Math.round((filledFields / 5) * 100));

  return (
    <ProfileClient
      userId={user.id}
      name={user.name}
      email={user.email}
      displayName={user.displayName}
      avatarUrl={user.avatarUrl}
      role={user.role}
      isActive={user.isActive}
      themePreference={user.themePreference}
      notificationPreferences={user.notificationPreferences}
      createdAt={user.createdAt.toISOString()}
      totalAssignedTasks={totalAssignedTasks}
      totalReportedTasks={totalReportedTasks}
      completedTasks={completedTasks}
      projectsCount={uniqueProjectIds.size}
      workUpdatesCount={workUpdatesCount}
      completionPercent={completionPercent}
      activityEntries={activityEntries}
    />
  );
}
