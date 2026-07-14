import { prisma } from "@/lib/prisma";
import { requireSetup } from "@/lib/require-setup";
import { formatDate, formatDateShort } from "@/lib/dates";

export default async function ProjectAttachmentsPage({ params }: { params: Promise<{ projectId: string }> }) {
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

  if (!project || project.workspace.members.length === 0) {
    return <p className="text-gray-500 text-center py-8">Project not found</p>;
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      task: {
        column: { board: { projectId } },
      },
    },
    include: {
      task: { select: { id: true, title: true, issueKey: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-900">Attachments ({attachments.length})</h2>
        <p className="text-xs text-gray-500 mt-1">Files attached to tasks in this project</p>
      </div>

      {attachments.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-10 w-10 text-gray-300">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">No attachments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{a.fileName}</p>
                <p className="text-xs text-gray-500">
                  {a.task.issueKey ? `${a.task.issueKey} - ` : ""}{a.task.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.fileType} &middot; {a.fileSize > 1024 ? `${(a.fileSize / 1024).toFixed(1)} KB` : `${a.fileSize} B`}
                  {a.uploadedBy && <span> &middot; by {a.uploadedBy.name}</span>}
                  <span> &middot; {formatDateShort(a.createdAt)}</span>
                </p>
              </div>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
