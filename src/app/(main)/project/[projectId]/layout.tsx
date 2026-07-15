import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";

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
        include: { members: { where: { userId: session.user.id } } },
      },
    },
  });

  if (!project) {
    return <div className="mx-auto max-w-7xl px-6 py-8"><p className="text-gray-500">Project not found</p></div>;
  }
  if (project.workspace.members.length === 0) {
    return <div className="mx-auto max-w-7xl px-6 py-8"><p className="text-gray-500">Not authorized</p></div>;
  }

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
    <main className="max-w-full">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="py-4">
            <h1 className="text-xl font-bold text-gray-900">
              {project.key ? <span className="text-gray-400">{project.key} / </span> : null}
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-0.5 text-sm text-gray-500">{project.description}</p>
            )}
          </div>
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-6">
        {children}
      </div>
    </main>
  );
}
