import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { Ticket } from "@/src/db/entities/Ticket";
import { createBranch } from "@/lib/github";

export async function POST(
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

  // Only ADMIN and DEVELOPER can create branches
  if (role !== "ADMIN" && role !== "DEVELOPER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ds = await getDataSource();
  const ticket = await ds.getRepository(Ticket).findOne({ where: { id: ticketId } });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.approved === 0) {
    return NextResponse.json({ error: "Ticket must be approved first" }, { status: 400 });
  }

  if (ticket.branchName) {
    return NextResponse.json({ error: "Branch already created for this ticket" }, { status: 400 });
  }

  try {
    // Generate branch name from ticket ID and title
    const sanitizedTitle = ticket.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    
    const branchName = `ticket-${ticketId}-${sanitizedTitle}`;

    // Create the branch on GitHub
    const branchInfo = await createBranch(branchName);

    // Update ticket with branch name
    ticket.branchName = branchName;
    await ds.getRepository(Ticket).save(ticket);

    return NextResponse.json({
      success: true,
      branchName: branchInfo.branchName,
      url: branchInfo.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create branch:", message);
    return NextResponse.json(
      { error: `Failed to create branch: ${message}` },
      { status: 500 }
    );
  }
}
