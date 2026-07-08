import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { Nav } from "@/components/nav";
import { WorkspaceClient } from "./workspace-client";

export default async function WorkspacePage(props: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await props.params;
  const session = await requireAuth();

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
      projects: {
        orderBy: { createdAt: "desc" },
      },
      invites: true,
    },
  });

  if (!workspace) return <div>Workspace not found</div>;

  const currentMember = workspace.members.find(
    (m) => m.userId === session.user.id
  );
  const canManage = currentMember && (currentMember.role === "OWNER" || currentMember.role === "ADMIN");

  return (
    <div className="bg-slate-50 min-h-screen">
      <Nav workspaces={workspaces} currentWorkspaceId={workspaceId} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {workspace.members.length} member{workspace.members.length !== 1 ? "s" : ""} · {workspace.projects.length} project{workspace.projects.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <WorkspaceClient
          workspaceId={workspaceId}
          projects={workspace.projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            createdAt: p.createdAt.toISOString(),
          }))}
          members={workspace.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
            role: m.role,
          }))}
          invites={workspace.invites.map((i) => ({
            email: i.email,
            createdAt: i.createdAt.toISOString(),
          }))}
          canManage={!!canManage}
          isOwner={currentMember?.role === "OWNER"}
        />
      </main>
    </div>
  );
}
