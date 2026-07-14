import { requireAdmin } from "@/lib/authorization";
import { requireSetup } from "@/lib/require-setup";
import { prisma } from "@/lib/prisma";
import { JiraNav } from "@/components/jira-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  await requireSetup();
  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });
  const members = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-white">
      <JiraNav members={members} projects={projects} workspaces={workspaces} />
      {children}
    </div>
  );
}
