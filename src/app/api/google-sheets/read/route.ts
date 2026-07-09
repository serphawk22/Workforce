import { NextRequest, NextResponse } from "next/server";
import { readSheet } from "@/lib/google-sheets";

export async function GET(request: NextRequest) {
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
