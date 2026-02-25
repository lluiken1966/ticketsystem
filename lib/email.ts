import nodemailer from "nodemailer";
import { Ticket } from "@/src/db/entities/Ticket";

/** Escape user-controlled values before inserting into HTML email bodies. */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.SMTP_FROM || "noreply@ticketsystem.local";

function html(title: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin:0">Ticket System — ${esc(title)}</h2>
      </div>
      <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
        ${body}
      </div>
    </div>
  `;
}

type TicketWithCreator = Ticket & { creator: { email: string; name: string } };
type TicketWithAssignee = Ticket & { assignee?: { email: string; name: string } | null };

export async function sendTicketMovedEmail(
  ticket: TicketWithCreator & TicketWithAssignee,
  fromStatus: string,
  toStatus: string,
  movedBy: string
) {
  const transport = createTransport();
  const subject = `Ticket #${ticket.id} moved to ${toStatus.replace("_", " ")}`;
  const body = `
    <p>Hi ${esc(ticket.creator.name)},</p>
    <p>Your ticket <strong>&ldquo;${esc(ticket.title)}&rdquo;</strong> has been updated:</p>
    <p><strong>${esc(fromStatus.replace("_", " "))} &rarr; ${esc(toStatus.replace("_", " "))}</strong></p>
    <p>Moved by: ${esc(movedBy)}</p>
    <hr/>
    <p style="color:#64748b;font-size:13px">Log in to view details and updates.</p>
  `;

  const recipients = [ticket.creator.email];

  // Also notify assigned developer when ticket enters IN_PROGRESS
  if (toStatus === "IN_PROGRESS" && ticket.assignee?.email) {
    recipients.push(ticket.assignee.email);
  }

  await transport.sendMail({
    from: FROM,
    to: recipients.join(","),
    subject,
    html: html(subject, body),
  });
}

export async function sendClientQuestionEmail(
  ticket: TicketWithCreator,
  question: string,
  askedBy: string
) {
  const transport = createTransport();
  const subject = `Action required: Question on Ticket #${ticket.id}`;
  const body = `
    <p>Hi ${esc(ticket.creator.name)},</p>
    <p>A team member has a question about your ticket <strong>&ldquo;${esc(ticket.title)}&rdquo;</strong>:</p>
    <blockquote style="border-left:4px solid #2563eb;padding-left:16px;color:#334155">${esc(question)}</blockquote>
    <p>Asked by: ${esc(askedBy)}</p>
    <p>Please log in and reply to the ticket so we can continue working on it.</p>
  `;

  await transport.sendMail({
    from: FROM,
    to: ticket.creator.email,
    subject,
    html: html(subject, body),
  });
}

export async function sendClientAnsweredEmail(
  ticket: Ticket & { title: string; assignee?: { email: string; name: string } | null },
  answer: string,
  clientName: string
) {
  if (!ticket.assignee?.email) return;
  const transport = createTransport();
  const subject = `Client replied on Ticket #${ticket.id}`;
  const body = `
    <p>Hi ${esc(ticket.assignee.name)},</p>
    <p>The client <strong>${esc(clientName)}</strong> has replied to your question on ticket <strong>&ldquo;${esc(ticket.title)}&rdquo;</strong>:</p>
    <blockquote style="border-left:4px solid #16a34a;padding-left:16px;color:#334155">${esc(answer)}</blockquote>
    <p>Log in to continue the conversation.</p>
  `;

  await transport.sendMail({
    from: FROM,
    to: ticket.assignee.email,
    subject,
    html: html(subject, body),
  });
}

export async function sendAssignmentEmail(
  ticket: { id: number; title: string },
  assignee: { email: string; name: string }
) {
  const transport = createTransport();
  const subject = `Ticket #${ticket.id} assigned to you`;
  const body = `
    <p>Hi ${esc(assignee.name)},</p>
    <p>Ticket <strong>&ldquo;${esc(ticket.title)}&rdquo;</strong> (#${ticket.id}) has been assigned to you.</p>
    <p>Log in to view details and start working on it.</p>
  `;

  await transport.sendMail({
    from: FROM,
    to: assignee.email,
    subject,
    html: html(subject, body),
  });
}
