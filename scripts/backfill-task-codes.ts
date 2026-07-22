/**
 * Backfill Task Codes — Phase 1
 *
 * Assigns permanent project-scoped codes to all tasks and subtasks
 * that don't already have a valid code in the new CRM-N format.
 *
 * Run with:
 *   npx tsx scripts/backfill-task-codes.ts
 *
 * Safe to run multiple times — skips tasks that already have valid codes.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Starting task code backfill...\n");

  // ── 1. Load all projects ──────────────────────────────────────────────────
  const projects = await prisma.project.findMany({
    select: { id: true, key: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${projects.length} project(s)\n`);

  let totalTasksUpdated = 0;
  let totalSubtasksUpdated = 0;

  for (const project of projects) {
    const key = (project.key || "TASK").toUpperCase().trim() || "TASK";
    console.log(`Project: ${project.name} (${key})`);

    // Get all tasks for this project that need a new-format code
    const tasks = await prisma.task.findMany({
      where: {
        column: { board: { projectId: project.id } },
      },
      select: { id: true, code: true, title: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Determine which tasks already have a valid new-format code (KEY-N)
    const codePattern = new RegExp(`^${key}-\\d+$`);
    let maxExistingN = 0;

    const tasksWithValidCode = tasks.filter((t) => t.code && codePattern.test(t.code));
    const tasksNeedingCode = tasks.filter((t) => !t.code || !codePattern.test(t.code));

    for (const t of tasksWithValidCode) {
      const n = parseInt(t.code!.split("-")[1], 10);
      if (n > maxExistingN) maxExistingN = n;
    }

    console.log(`  ${tasksWithValidCode.length} tasks already have valid codes`);
    console.log(`  ${tasksNeedingCode.length} tasks need new codes`);

    // Assign sequential codes starting after the current max
    let counter = maxExistingN;

    for (const task of tasksNeedingCode) {
      counter++;
      const newCode = `${key}-${counter}`;
      await prisma.task.update({
        where: { id: task.id },
        data: { code: newCode, issueKey: newCode },
      });
      console.log(`    ✓ Task "${task.title.slice(0, 40)}" → ${newCode}`);
      totalTasksUpdated++;

      // Now backfill subtasks for this task
      const subtasks = await prisma.subtask.findMany({
        where: { taskId: task.id },
        select: { id: true, code: true, title: true },
        orderBy: { createdAt: "asc" },
      });

      const subtaskPattern = new RegExp(`^${newCode}\\.\\d+$`);
      const subtasksNeedingCode = subtasks.filter(
        (s) => !s.code || !subtaskPattern.test(s.code)
      );

      let subtaskCounter = subtasks
        .filter((s) => s.code && subtaskPattern.test(s.code))
        .reduce((max, s) => {
          const n = parseInt(s.code!.split(".")[1], 10);
          return n > max ? n : max;
        }, 0);

      for (const sub of subtasksNeedingCode) {
        subtaskCounter++;
        const subCode = `${newCode}.${subtaskCounter}`;
        await prisma.subtask.update({
          where: { id: sub.id },
          data: { code: subCode },
        });
        console.log(`      ↳ Subtask "${sub.title.slice(0, 35)}" → ${subCode}`);
        totalSubtasksUpdated++;
      }
    }

    // Also backfill subtasks for tasks that already had valid codes
    for (const task of tasksWithValidCode) {
      const subtasks = await prisma.subtask.findMany({
        where: { taskId: task.id },
        select: { id: true, code: true, title: true },
        orderBy: { createdAt: "asc" },
      });

      const subtaskPattern = new RegExp(`^${task.code}\\.\\d+$`);
      const subtasksNeedingCode = subtasks.filter(
        (s) => !s.code || !subtaskPattern.test(s.code)
      );

      let subtaskCounter = subtasks
        .filter((s) => s.code && subtaskPattern.test(s.code))
        .reduce((max, s) => {
          const n = parseInt(s.code!.split(".").pop()!, 10);
          return n > max ? n : max;
        }, 0);

      for (const sub of subtasksNeedingCode) {
        subtaskCounter++;
        const subCode = `${task.code}.${subtaskCounter}`;
        await prisma.subtask.update({
          where: { id: sub.id },
          data: { code: subCode },
        });
        console.log(`      ↳ Subtask (of ${task.code}) "${sub.title.slice(0, 35)}" → ${subCode}`);
        totalSubtasksUpdated++;
      }
    }

    console.log(`  Counter set to ${counter}\n`);
  }

  console.log("─────────────────────────────────────────────");
  console.log(`✅ Backfill complete`);
  console.log(`   Tasks updated:    ${totalTasksUpdated}`);
  console.log(`   Subtasks updated: ${totalSubtasksUpdated}`);
  console.log("─────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
