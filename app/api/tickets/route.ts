import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { Ticket } from "@/src/db/entities/Ticket";
import { enqueueJob } from "@/lib/jobs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const role = session.user.role;
  const { searchParams } = new URL(req.url);

  const ds = await getDataSource();
  const repo = ds.getRepository(Ticket);

  let query = repo
    .createQueryBuilder("t")
    .leftJoinAndSelect("t.assignee", "assignee")
    .leftJoinAndSelect("t.creator", "creator")
    .orderBy("t.createdAt", "DESC");

  // Clients only see their own tickets
  if (role === "CLIENT") {
    query = query.where("t.creatorId = :userId", { userId });
  }

  // Filters
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeId = searchParams.get("assigneeId");
  const mine = searchParams.get("mine");

  if (status) query = query.andWhere("t.status = :status", { status });
  if (priority) query = query.andWhere("t.priority = :priority", { priority });
  if (assigneeId) query = query.andWhere("t.assigneeId = :assigneeId", { assigneeId: parseInt(assigneeId) });
  if (mine === "true" && role !== "CLIENT") query = query.andWhere("t.assigneeId = :userId", { userId });

  const tickets = await query.getMany();
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const body = await req.json();
  const { title, description, acceptanceCriteria, affectedModule, priority } = body;

  if (!title || !description || !acceptanceCriteria || !affectedModule) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(Ticket);

  const ticket = repo.create({
    title,
    description,
    acceptanceCriteria,
    affectedModule,
    priority: priority || "MEDIUM",
    status: "OPEN",
    creatorId: userId,
  });

  const saved = await repo.save(ticket);

  // Enqueue AI validation job
  await enqueueJob("VALIDATE_TICKET", { ticketId: saved.id });

  return NextResponse.json(saved, { status: 201 });
}
