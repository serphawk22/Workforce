import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updates = await prisma.workUpdate.findMany({ select: { id: true, timeSpent: true } });
  console.log(`Found ${updates.length} work updates`);
  for (const u of updates) {
    const minutes = Math.round(Number(u.timeSpent) * 60);
    await prisma.workUpdate.update({ where: { id: u.id }, data: { timeSpent: minutes } });
    console.log(`  Reverted ${u.id}: ${u.timeSpent} hrs -> ${minutes} min`);
  }
  console.log("Done");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
