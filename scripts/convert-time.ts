import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updates = await prisma.workUpdate.findMany({ select: { id: true, timeSpent: true } });
  console.log(`Found ${updates.length} work updates`);
  for (const u of updates) {
    const hours = Math.round((Number(u.timeSpent) / 60) * 100) / 100;
    if (hours !== Number(u.timeSpent)) {
      await prisma.workUpdate.update({ where: { id: u.id }, data: { timeSpent: hours } });
      console.log(`  Converted ${u.id}: ${u.timeSpent} min -> ${hours} hrs`);
    } else {
      console.log(`  Skipped ${u.id}: ${u.timeSpent} (already hours or 0)`);
    }
  }
  console.log("Done");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
