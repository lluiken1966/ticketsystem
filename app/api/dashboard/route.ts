import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { Ticket } from "@/src/db/entities/Ticket";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const role = session.user.role;
  const ds = await getDataSource();
  const repo = ds.getRepository(Ticket);

  // Lane counts
  const laneCounts = await repo
    .createQueryBuilder("t")
    .select("t.status", "status")
    .addSelect("COUNT(*)", "count")
    .groupBy("t.status")
    .getRawMany();

  // Priority breakdown
  const priorityCounts = await repo
    .createQueryBuilder("t")
    .select("t.priority", "priority")
    .addSelect("COUNT(*)", "count")
    .groupBy("t.priority")
    .getRawMany();

  // My assigned tickets (developer / admin)
  let myTickets: Ticket[] = [];
  if (role === "DEVELOPER" || role === "ADMIN") {
    myTickets = await repo.find({
      where: { assigneeId: userId },
      relations: ["creator"],
      order: { updatedAt: "DESC" },
      take: 10,
    });
  }

  // Recent tickets (for manager / admin)
  const recentTickets = await repo.find({
    relations: ["creator", "assignee"],
    order: { updatedAt: "DESC" },
    take: 20,
  });

  return NextResponse.json({
    laneCounts: Object.fromEntries(
      ["OPEN", "IN_PROGRESS", "REVIEW", "DONE"].map((s) => [
        s,
        parseInt(laneCounts.find((r) => r.status === s)?.count || "0"),
      ])
    ),
    priorityCounts: Object.fromEntries(
      ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => [
        p,
        parseInt(priorityCounts.find((r) => r.priority === p)?.count || "0"),
      ])
    ),
    myTickets,
    recentTickets,
  });
}
