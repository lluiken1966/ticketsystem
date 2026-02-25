import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { Ticket, TicketStatus } from "@/src/db/entities/Ticket";
import { TicketHistory } from "@/src/db/entities/TicketHistory";
import { sendTicketMovedEmail } from "@/lib/email";
import { User } from "@/src/db/entities/User";

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["REVIEW", "OPEN"],
  REVIEW: ["DONE", "IN_PROGRESS"],
  DONE: [],
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const userId = parseInt(session.user.id);

  if (role === "CLIENT" || role === "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticketId = parseInt(params.id);
  const { toStatus } = await req.json();
  const ds = await getDataSource();

  const ticket = await ds.getRepository(Ticket).findOne({
    where: { id: ticketId },
    relations: ["creator", "assignee"],
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = VALID_TRANSITIONS[ticket.status];
  if (!allowed.includes(toStatus)) {
    return NextResponse.json(
      { error: `Cannot move from ${ticket.status} to ${toStatus}` },
      { status: 400 }
    );
  }

  const fromStatus = ticket.status;
  ticket.status = toStatus;
  await ds.getRepository(Ticket).save(ticket);

  // Record history
  const history = ds.getRepository(TicketHistory).create({
    ticketId,
    fromStatus,
    toStatus,
    changedById: userId,
  });
  await ds.getRepository(TicketHistory).save(history);

  // Send email notifications asynchronously (don't block response)
  const mover = await ds.getRepository(User).findOne({ where: { id: userId } });
  sendTicketMovedEmail(ticket, fromStatus, toStatus, mover?.name || "Someone").catch(
    (err) => console.error("Email send error:", err)
  );

  return NextResponse.json({ success: true, ticket });
}
