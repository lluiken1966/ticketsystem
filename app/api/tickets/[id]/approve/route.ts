import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { Ticket } from "@/src/db/entities/Ticket";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await Promise.resolve(params);
  const ticketId = parseInt(resolvedParams.id);
  const role = session.user.role;

  if (isNaN(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
  }

  // Only ADMIN and MANAGER can approve tickets
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { approved } = await req.json();

  if (typeof approved !== "number" || ![0, 1].includes(approved)) {
    return NextResponse.json({ error: "approved must be 0 or 1" }, { status: 400 });
  }

  const ds = await getDataSource();
  const ticket = await ds.getRepository(Ticket).findOne({ where: { id: ticketId } });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  ticket.approved = approved;
  await ds.getRepository(Ticket).save(ticket);

  return NextResponse.json({
    success: true,
    ticket,
    message: approved === 1 ? "Ticket approved" : "Ticket approval removed",
  });
}
