import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getUserRole } from "@/lib/auth";
import { readSheet } from "@/lib/google-sheets";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = await getUserRole(session.user.id);
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const range =
    request.nextUrl.searchParams.get("range") || undefined;

  try {
    const data = await readSheet(range);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[google-sheets/read] error:", error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
