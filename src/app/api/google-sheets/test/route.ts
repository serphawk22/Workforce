import { NextResponse } from "next/server";
import { testConnection, getSheetMetadata } from "@/lib/google-sheets";

export async function GET() {
  const connection = await testConnection();
  if (!connection.success) {
    return NextResponse.json(connection, { status: 500 });
  }

  let metadata = null;
  try {
    metadata = await getSheetMetadata();
  } catch {
    // metadata is optional for the test response
  }

  return NextResponse.json({ ...connection, metadata });
}
