import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { Ticket } from "@/src/db/entities/Ticket";
import { AiValidation } from "@/src/db/entities/AiValidation";
import { AiCodeAnalysis } from "@/src/db/entities/AiCodeAnalysis";
import { TicketComment } from "@/src/db/entities/TicketComment";
import { TicketAttachment } from "@/src/db/entities/TicketAttachment";
import { TicketHistory } from "@/src/db/entities/TicketHistory";
import { User } from "@/src/db/entities/User";
import { sendAssignmentEmail } from "@/lib/email";

const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticketId = parseInt(params.id);
  const userId = parseInt(session.user.id);
  const role = session.user.role;

  if (isNaN(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
  }

  const ds = await getDataSource();
  const ticket = await ds.getRepository(Ticket).findOne({
    where: { id: ticketId },
    relations: ["creator", "assignee"],
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role === "CLIENT" && ticket.creatorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [comments, attachments, history, aiValidation, aiCodeAnalysis] =
    await Promise.all([
      ds.getRepository(TicketComment).find({
        where: { ticketId },
        relations: ["user"],
        order: { createdAt: "ASC" },
      }),
      ds.getRepository(TicketAttachment).find({ where: { ticketId } }),
      ds.getRepository(TicketHistory).find({
        where: { ticketId },
        relations: ["changedBy"],
        order: { createdAt: "DESC" },
      }),
      ds.getRepository(AiValidation).findOne({
        where: { ticketId },
        order: { createdAt: "DESC" },
      }),
      ds.getRepository(AiCodeAnalysis).findOne({
        where: { ticketId },
        order: { createdAt: "DESC" },
      }),
    ]);

  // Hide internal comments from clients
  const visibleComments =
    role === "CLIENT" ? comments.filter((c) => !c.isInternal) : comments;

  return NextResponse.json({
    ticket,
    comments: visibleComments,
    attachments,
    history,
    aiValidation,
    aiCodeAnalysis: aiCodeAnalysis
      ? { ...aiCodeAnalysis, results: aiCodeAnalysis.getParsedResults() }
      : null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role === "CLIENT" || role === "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ticketId = parseInt(params.id);
  if (isNaN(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
  }

  const body = await req.json();
  const { assigneeId, priority } = body;

  // Validate priority value before touching the DB
  if (priority !== undefined && !VALID_PRIORITIES.has(priority)) {
    return NextResponse.json(
      { error: `Invalid priority. Must be one of: ${[...VALID_PRIORITIES].join(", ")}` },
      { status: 400 }
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(Ticket);

  const ticket = await repo.findOne({
    where: { id: ticketId },
    relations: ["assignee"],
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const previousAssigneeId = ticket.assigneeId;

  if (assigneeId !== undefined) ticket.assigneeId = assigneeId ?? null;
  if (priority) ticket.priority = priority;

  const updated = await repo.save(ticket);

  // Send assignment email when a new developer is assigned
  const assigneeChanged =
    assigneeId !== undefined && assigneeId !== previousAssigneeId && assigneeId !== null;

  if (assigneeChanged) {
    const newAssignee = await ds
      .getRepository(User)
      .findOne({ where: { id: assigneeId } });

    if (newAssignee) {
      sendAssignmentEmail(
        { id: ticket.id, title: ticket.title },
        { email: newAssignee.email, name: newAssignee.name }
      ).catch((err) => console.error("Assignment email error:", err));
    }
  }

  return NextResponse.json(updated);
}
