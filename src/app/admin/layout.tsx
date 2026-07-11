import { requireAdmin } from "@/lib/authorization";
import { requireSetup } from "@/lib/require-setup";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "./admin-nav";

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

  return (
    <div className="bg-slate-50 min-h-screen">
      <AdminNav workspaces={workspaces} />
      {children}
    </div>
  );
}