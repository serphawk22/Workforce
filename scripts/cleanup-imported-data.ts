import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Identifying imported Google Sheets data...");

  const workspace = await prisma.workspace.findFirst({
    where: { name: "Google Sync" },
    include: {
      projects: {
        include: {
          _count: { select: { labels: true } },
          boards: {
            include: {
              columns: {
                include: {
                  _count: { select: { tasks: true } },
                },
              },
            },
          },
        },
      },
      _count: { select: { members: true } },
    },
  });

  if (!workspace) {
    console.log("No 'Google Sync' workspace found. Nothing to clean up.");
    return;
  }

  const totalTasks = workspace.projects.reduce(
    (sum, p) =>
      sum + p.boards.reduce((bs, b) => bs + b.columns.reduce((cs, c) => cs + c._count.tasks, 0), 0),
    0
  );

  console.log(`Found workspace: "${workspace.name}" (id: ${workspace.id})`);
  console.log(`  Projects: ${workspace.projects.length}`);
  console.log(`  Labels: ${workspace.projects.reduce((s, p) => s + p._count.labels, 0)}`);
  console.log(`  Tasks: ${totalTasks}`);
  console.log(`  Workspace members: ${workspace._count.members}`);
  console.log("");
  console.log("Deleting workspace and all cascading data...");
  console.log("(This will remove: tasks, subtasks, work updates, activity logs, comments,");
  console.log(" attachments, labels, task-label relations, boards, columns, projects)");
  console.log("");

  await prisma.workspace.delete({ where: { id: workspace.id } });

  console.log("Cleanup complete!");
  console.log("");

  const remaining = await prisma.workspace.findMany({ select: { id: true, name: true } });
  console.log("Remaining workspaces:", JSON.stringify(remaining));
  const remainingTasks = await prisma.task.count();
  console.log("Remaining tasks:", remainingTasks);
  const remainingProjects = await prisma.project.count();
  console.log("Remaining projects:", remainingProjects);
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
