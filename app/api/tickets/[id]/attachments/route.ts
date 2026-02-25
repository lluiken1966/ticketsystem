import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { TicketAttachment } from "@/src/db/entities/TicketAttachment";
import { Ticket } from "@/src/db/entities/Ticket";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10");

/** Allowed file extensions. Blocks executables, scripts, server-side files. */
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".md", ".csv", ".json", ".xml", ".log",
  ".zip", ".tar", ".gz",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const role = session.user.role;
  const ticketId = parseInt(params.id);

  if (isNaN(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // File size check
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 });
  }

  // File type allowlist
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: `File type '${ext}' is not allowed` },
      { status: 415 }
    );
  }

  const ds = await getDataSource();
  const ticket = await ds.getRepository(Ticket).findOne({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  // Clients may only upload to their own tickets
  if (role === "CLIENT" && ticket.creatorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Save file to disk with a UUID filename (prevents path traversal via original name)
  const ticketDir = path.join(UPLOAD_DIR, String(ticketId));
  await fs.mkdir(ticketDir, { recursive: true });

  const storedName = `${uuidv4()}${ext}`;
  const storedPath = path.join(ticketDir, storedName);

  const bytes = await file.arrayBuffer();
  await fs.writeFile(storedPath, Buffer.from(bytes));

  const attachment = ds.getRepository(TicketAttachment).create({
    ticketId,
    filename: file.name,
    filepath: storedPath,
    filesize: file.size,
  });

  const saved = await ds.getRepository(TicketAttachment).save(attachment);
  return NextResponse.json(saved, { status: 201 });
}
