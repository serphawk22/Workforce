import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { ProjectActionsDropdown } from "@/components/project/project-actions-dropdown";

const projectColors = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
];

function getProjectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return projectColors[Math.abs(hash) % projectColors.length];
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await requireSetup();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!project) {
    return <div className="mx-auto max-w-7xl px-6 py-8"><p className="text-gray-500">Project not found</p></div>;
  }
  if (project.workspace.members.length === 0) {
    return <div className="mx-auto max-w-7xl px-6 py-8"><p className="text-gray-500">Not authorized</p></div>;
  }

  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId: project.workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    take: 8,
  });

  const allMembersCount = await prisma.workspaceMember.count({
    where: { workspaceId: project.workspaceId },
  });

  const tasksCount = await prisma.task.count({
    where: {
      column: {
        board: { projectId },
      },
    },
  });

  const tabs = [
    { href: `/project/${projectId}/overview`, label: "Overview" },
    { href: `/project/${projectId}/board`, label: "Board" },
    { href: `/project/${projectId}/list`, label: "List" },
    { href: `/project/${projectId}/backlog`, label: "Backlog" },
    { href: `/project/${projectId}/timeline`, label: "Timeline" },
    { href: `/project/${projectId}/attachments`, label: "Attachments" },
    { href: `/project/${projectId}/archived`, label: "Archived" },
    { href: `/project/${projectId}/members`, label: "Members" },
    { href: `/project/${projectId}/settings`, label: "Settings" },
  ];

  return (
    <main className="max-w-full min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-4 py-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-sm shrink-0 shadow-sm ${getProjectColor(project.name)}`}>
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {project.name}
                </h1>
                {project.key && (
                  <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-mono font-medium text-gray-500">
                    {project.key}
                  </span>
                )}
              </div>
              {project.description && (
                <p className="mt-0.5 text-sm text-gray-500 truncate">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex -space-x-2">
                {workspaceMembers.slice(0, 5).map((wm) => {
                  const initials = wm.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={wm.user.id}
                      title={wm.user.name}
                      className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 ring-2 ring-white"
                    >
                      {wm.user.avatarUrl ? (
                        <img src={wm.user.avatarUrl} alt={wm.user.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                  );
                })}
                {workspaceMembers.length > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-500 ring-2 ring-white">
                    +{workspaceMembers.length - 5}
                  </div>
                )}
              </div>
              <Link
                href={`/project/${projectId}/board?create=true`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Create
              </Link>
              <ProjectActionsDropdown
                projectId={projectId}
                projectName={project.name}
                projectKey={project.key}
                workspaceName={project.workspace.name}
                membersCount={allMembersCount}
                tasksCount={tasksCount}
                createdAt={project.createdAt.toISOString()}
              />
            </div>
          </div>
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="shrink-0 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 transition-all hover:text-gray-700 hover:border-gray-300"
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="px-6 py-6">
        {children}
      </div>
    </main>
  );
}
