import { requireAuth } from "./auth-helpers";
import { getUserRole } from "./auth";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await requireAuth();
  const role = await getUserRole(session.user.id);
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }
  return session;
}

export async function isAdmin(): Promise<boolean> {
  const session = await requireAuth();
  const role = await getUserRole(session.user.id);
  return role === "ADMIN";
}