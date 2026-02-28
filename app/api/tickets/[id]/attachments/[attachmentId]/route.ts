import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDataSource } from "@/src/db/data-source";
import { TicketAttachment } from "@/src/db/entities/TicketAttachment";
import { Ticket } from "@/src/db/entities/Ticket";
import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> | { id: string; attachmentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await Promise.resolve(params);
  const ticketId = parseInt(resolvedParams.id);
  const attachmentId = parseInt(resolvedParams.attachmentId);
  const userId = parseInt(session.user.id);
  const role = session.user.role;

  if (isNaN(ticketId) || isNaN(attachmentId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const ds = await getDataSource();

  // Load ticket for ownership check
  const ticket = await ds.getRepository(Ticket).findOne({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  // Clients may only access attachments on their own tickets
  if (role === "CLIENT" && ticket.creatorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attachment = await ds.getRepository(TicketAttachment).findOne({
    where: { id: attachmentId, ticketId },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  // Verify file exists on disk
  try {
    await fs.access(attachment.filepath);
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  // Read file and stream it back
  const fileBuffer = await fs.readFile(attachment.filepath);
  const ext = path.extname(attachment.filename).toLowerCase();

  // Derive a safe Content-Type
  const MIME_TYPES: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain", ".md": "text/markdown", ".csv": "text/csv",
    ".json": "application/json", ".xml": "application/xml", ".log": "text/plain",
    ".zip": "application/zip", ".tar": "application/x-tar", ".gz": "application/gzip",
  };
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  // Use inline for viewable types, attachment for downloads
  const viewableInline = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"]);
  const disposition = viewableInline.has(ext)
    ? `inline; filename="${attachment.filename}"`
    : `attachment; filename="${attachment.filename}"`;

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Content-Length": String(fileBuffer.length),
    },
  });
}
