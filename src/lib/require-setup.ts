import { prisma } from "./prisma";
import { requireAuth } from "./auth-helpers";
import { redirect } from "next/navigation";

export async function requireSetup() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstLoginRequired: true },
  });
  if (user?.firstLoginRequired) {
    redirect("/account/setup");
  }
  return session;
}
