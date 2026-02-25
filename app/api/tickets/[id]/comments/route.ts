import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { TicketComment } from "@/src/db/entities/TicketComment";
import { Ticket } from "@/src/db/entities/Ticket";
import { sendClientQuestionEmail, sendClientAnsweredEmail } from "@/lib/email";
import { User } from "@/src/db/entities/User";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const role = session.user.role;
  const ticketId = parseInt(params.id);

  const { content, isInternal, isClientQuestion } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Clients cannot post internal notes
  if (role === "CLIENT" && (isInternal || isClientQuestion)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ds = await getDataSource();
  const commentRepo = ds.getRepository(TicketComment);
  const ticketRepo = ds.getRepository(Ticket);

  const ticket = await ticketRepo.findOne({
    where: { id: ticketId },
    relations: ["creator", "assignee"],
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = commentRepo.create({
    ticketId,
    userId,
    content,
    isInternal: isInternal ? 1 : 0,
    isClientQuestion: isClientQuestion ? 1 : 0,
  });

  const saved = await commentRepo.save(comment);

  // If developer asks client a question — set awaiting_client and notify client
  if (isClientQuestion && role !== "CLIENT") {
    ticket.awaitingClient = 1;
    await ticketRepo.save(ticket);
    const poster = await ds.getRepository(User).findOne({ where: { id: userId } });
    sendClientQuestionEmail(ticket, content, poster?.name || "Developer").catch(
      (err) => console.error("Email error:", err)
    );
  }

  // If client replies and ticket was awaiting client — clear the flag
  if (role === "CLIENT" && ticket.awaitingClient === 1) {
    ticket.awaitingClient = 0;
    await ticketRepo.save(ticket);
    if (ticket.assignee) {
      sendClientAnsweredEmail(ticket, content, ticket.creator.name).catch(
        (err) => console.error("Email error:", err)
      );
    }
  }

  return NextResponse.json(saved, { status: 201 });
}
