import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-helpers";

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }
  redirect("/login");
}
