import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.taskLabel.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();
  await prisma.project.deleteMany();
  await prisma.pendingInvite.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email: "demo@taskflow.dev",
      passwordHash,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: "Jane Smith",
      email: "jane@taskflow.dev",
      passwordHash,
    },
  });

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Acme Corp",
      ownerId: user.id,
      members: {
        create: [
          { userId: user.id, role: "OWNER" },
          { userId: user2.id, role: "MEMBER" },
        ],
      },
    },
  });

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description: "Complete overhaul of the company website",
      workspaceId: workspace.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Mobile App",
      description: "iOS and Android app development",
      workspaceId: workspace.id,
    },
  });

  // Create boards with default columns for each project
  const boards = await Promise.all(
    [project1, project2].map((p) =>
      prisma.board.create({
        data: {
          projectId: p.id,
          name: "Main Board",
          columns: {
            create: [
              { name: "To Do", order: 0 },
              { name: "In Progress", order: 1 },
              { name: "Review", order: 2 },
              { name: "Done", order: 3 },
            ],
          },
        },
      })
    )
  );

  const columns1 = await prisma.column.findMany({
    where: { boardId: boards[0].id },
    orderBy: { order: "asc" },
  });

  const columns2 = await prisma.column.findMany({
    where: { boardId: boards[1].id },
    orderBy: { order: "asc" },
  });

  // Create labels
  const bug = await prisma.label.create({
    data: { name: "Bug", color: "#EF4444", projectId: project1.id },
  });
  const feature = await prisma.label.create({
    data: { name: "Feature", color: "#3B82F6", projectId: project1.id },
  });
  const enhancement = await prisma.label.create({
    data: { name: "Enhancement", color: "#10B981", projectId: project1.id },
  });

  // Create tasks for project 1
  const tasks1 = await Promise.all([
    prisma.task.create({
      data: {
        columnId: columns1[0].id,
        title: "Design home page mockup",
        description: "Create Figma mockups for the new home page layout including hero section, features grid, and footer.",
        priority: "HIGH",
        assigneeId: user.id,
        reporterId: user.id,
        dueDate: new Date("2026-07-15"),
        order: 0,
      },
    }),
    prisma.task.create({
      data: {
        columnId: columns1[0].id,
        title: "Set up CI/CD pipeline",
        description: "Configure GitHub Actions for automated testing and deployment.",
        priority: "MEDIUM",
        assigneeId: user2.id,
        reporterId: user.id,
        dueDate: new Date("2026-07-20"),
        order: 1,
      },
    }),
    prisma.task.create({
      data: {
        columnId: columns1[1].id,
        title: "Implement user authentication",
        description: "Add login/signup using NextAuth with Google and email providers.",
        priority: "CRITICAL",
        assigneeId: user.id,
        reporterId: user.id,
        dueDate: new Date("2026-07-10"),
        order: 0,
      },
    }),
    prisma.task.create({
      data: {
        columnId: columns1[2].id,
        title: "API endpoint documentation",
        description: "Document all REST API endpoints using Swagger/OpenAPI.",
        priority: "LOW",
        assigneeId: user2.id,
        reporterId: user.id,
        dueDate: new Date("2026-07-25"),
        order: 0,
      },
    }),
    prisma.task.create({
      data: {
        columnId: columns1[3].id,
        title: "Database schema design",
        description: "Design and finalize the PostgreSQL schema for the application.",
        priority: "HIGH",
        assigneeId: user.id,
        reporterId: user.id,
        order: 0,
      },
    }),
  ]);

  // Create tasks for project 2
  await Promise.all([
    prisma.task.create({
      data: {
        columnId: columns2[0].id,
        title: "Research push notification libraries",
        priority: "MEDIUM",
        assigneeId: user.id,
        reporterId: user.id,
        order: 0,
      },
    }),
    prisma.task.create({
      data: {
        columnId: columns2[1].id,
        title: "Implement offline mode",
        description: "Add local caching with SyncManager for offline-first experience.",
        priority: "HIGH",
        assigneeId: user2.id,
        reporterId: user.id,
        order: 0,
      },
    }),
  ]);

  // Add labels to tasks
  await prisma.taskLabel.createMany({
    data: [
      { taskId: tasks1[0].id, labelId: feature.id },
      { taskId: tasks1[1].id, labelId: enhancement.id },
      { taskId: tasks1[2].id, labelId: feature.id },
      { taskId: tasks1[2].id, labelId: bug.id },
      { taskId: tasks1[3].id, labelId: enhancement.id },
    ],
  });

  // Add comments
  await prisma.comment.createMany({
    data: [
      {
        taskId: tasks1[2].id,
        authorId: user.id,
        content: "I've started working on the NextAuth setup. Should have a PR ready by tomorrow.",
      },
      {
        taskId: tasks1[2].id,
        authorId: user2.id,
        content: "Great! Let me know if you need any help with the OAuth provider configuration.",
      },
      {
        taskId: tasks1[0].id,
        authorId: user2.id,
        content: "Please share the Figma link when you have the first draft ready.",
      },
    ],
  });

  console.log("Seed completed successfully!");
  console.log("Demo user: demo@taskflow.dev / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
