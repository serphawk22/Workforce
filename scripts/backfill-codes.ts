import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting code backfill...\n");

  // 1. Backfill Task codes
  const tasksWithoutCode = await prisma.task.findMany({
    where: { code: null },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Tasks without code: ${tasksWithoutCode.length}`);

  let maxNum = 0;
  const tasksWithCode = await prisma.task.findMany({
    where: { code: { not: null } },
    select: { code: true },
  });
  for (const t of tasksWithCode) {
    if (t.code && /^\d+$/.test(t.code)) {
      const n = parseInt(t.code, 10);
      if (n > maxNum) maxNum = n;
    }
  }

  let taskCount = 0;
  for (const task of tasksWithoutCode) {
    maxNum++;
    let code = String(maxNum);
    await prisma.task.update({
      where: { id: task.id },
      data: { code },
    });
    taskCount++;
    if (taskCount % 50 === 0) console.log(`  Backfilled ${taskCount} tasks...`);
  }
  console.log(`  Done: ${taskCount} tasks backfilled\n`);

  // 2. Backfill Subtask codes
  const allTasks = await prisma.task.findMany({
    where: { code: { not: null } },
    select: { id: true, code: true },
  });
  const taskCodeMap = new Map(allTasks.map((t) => [t.id, t.code!]));

  const subtasksWithoutCode = await prisma.subtask.findMany({
    where: { code: null },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Subtasks without code: ${subtasksWithoutCode.length}`);

  // First pass: build prefix -> max suffix map
  const allExistingSubtasks = await prisma.subtask.findMany({
    where: { code: { not: null } },
    select: { code: true },
  });
  const prefixMaxMap = new Map<string, number>();
  for (const s of allExistingSubtasks) {
    if (!s.code) continue;
    const match = s.code.match(/^(.+)_(\d+)$/);
    if (match) {
      const prefix = match[1];
      const suffix = parseInt(match[2], 10);
      const existing = prefixMaxMap.get(prefix) ?? -1;
      if (suffix > existing) prefixMaxMap.set(prefix, suffix);
    }
  }

  let subtaskCount = 0;
  for (const subtask of subtasksWithoutCode) {
    const parentCode = taskCodeMap.get(subtask.taskId);
    if (!parentCode) {
      console.warn(`  Skipping subtask ${subtask.id}: parent task ${subtask.taskId} has no code`);
      continue;
    }
    const existingMax = prefixMaxMap.get(parentCode) ?? -1;
    const newSuffix = existingMax + 1;
    prefixMaxMap.set(parentCode, newSuffix);
    const code = `${parentCode}_${newSuffix}`;
    await prisma.subtask.update({
      where: { id: subtask.id },
      data: { code },
    });
    subtaskCount++;
  }
  console.log(`  Done: ${subtaskCount} subtasks backfilled\n`);

  console.log("Code backfill complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
