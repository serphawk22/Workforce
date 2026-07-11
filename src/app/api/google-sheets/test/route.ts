import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, getUserRole } from "@/lib/auth";
import { testConnection, getSheetMetadata } from "@/lib/google-sheets";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = await getUserRole(session.user.id);
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
