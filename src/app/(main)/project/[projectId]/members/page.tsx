import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { Avatar } from "@/components/ui/avatar";
import { ProjectMembersClient } from "./client";

export default async function ProjectMembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await requireSetup();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } },
          },
        },
      },
    },
  });

  if (!project) return <div className="text-gray-500 py-8 text-center">Project not found</div>;

  const caller = project.workspace.members.find((m) => m.user.id === session.user.id);
  const canManage = caller?.role === "OWNER" || caller?.role === "ADMIN";

  return (
    <ProjectMembersClient
      projectId={projectId}
      workspaceId={project.workspace.id}
      members={project.workspace.members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      }))}
      canManage={canManage}
      currentUserId={session.user.id}
    />
  );
}
