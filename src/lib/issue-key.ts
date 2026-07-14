import { prisma } from "@/lib/prisma";

export async function generateIssueKey(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { key: true, name: true },
  });

  if (!project) throw new Error("Project not found");

  const prefix = project.key || project.name.replace(/[^A-Za-z0-9]/g, "").substring(0, 4).toUpperCase();

  const board = await prisma.board.findUnique({
    where: { projectId },
    select: {
      columns: {
        select: { tasks: { select: { issueKey: true } } },
      },
    },
  });

  const existingKeys = board?.columns.flatMap((c) => c.tasks.map((t) => t.issueKey).filter(Boolean)) || [];
  const existingNumbers = existingKeys
    .map((k) => {
      const match = k?.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  return `${prefix}-${nextNumber}`;
}
