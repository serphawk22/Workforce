import { requireAdmin } from "@/lib/authorization";
import { requireSetup } from "@/lib/require-setup";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppNavbar } from "@/components/layout/app-navbar";

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
    <div className="flex min-h-screen bg-background">
      <AppSidebar isAdmin={session.user.role === "ADMIN"} userName={session.user.name} userImage={session.user.image} />
      <div className="flex flex-1 flex-col ml-[280px] transition-all duration-200">
        <AppNavbar members={members} projects={projects} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
