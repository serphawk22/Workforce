import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";

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

  return (
    <div className="space-y-3">
      {project.workspace.members.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <Avatar name={m.user.name} url={m.user.avatarUrl} size="sm" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
            <p className="text-xs text-gray-500">{m.user.email}</p>
          </div>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{m.role}</span>
        </div>
      ))}
      {project.workspace.members.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">No members</p>
      )}
    </div>
  );
}
