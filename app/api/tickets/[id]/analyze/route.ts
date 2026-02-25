import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enqueueJob } from "@/lib/jobs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role === "CLIENT" || role === "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await enqueueJob("ANALYZE_CODE", { ticketId: parseInt(params.id) });
  return NextResponse.json({ message: "Code analysis queued" });
}
