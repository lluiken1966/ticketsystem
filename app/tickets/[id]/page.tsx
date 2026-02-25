"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { ProgressSpinner } from "primereact/progressspinner";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Divider } from "primereact/divider";
import { FileUpload } from "primereact/fileupload";
import AppShell from "@/components/AppShell";
import AiValidationPanel from "@/components/AiValidationPanel";
import AiCodeAnalysisPanel from "@/components/AiCodeAnalysisPanel";
import CommentThread from "@/components/CommentThread";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "info", MEDIUM: "success", HIGH: "warning", CRITICAL: "danger",
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: "secondary", IN_PROGRESS: "info", REVIEW: "warning", DONE: "success",
};
const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["REVIEW", "OPEN"],
  REVIEW: ["DONE", "IN_PROGRESS"],
  DONE: [],
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useRef<Toast>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);
  const [developers, setDevelopers] = useState<any[]>([]);

  const role = (session?.user as any)?.role;
  const canEdit = role === "DEVELOPER" || role === "ADMIN";

  async function load() {
    const res = await fetch(`/api/tickets/${id}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (canEdit) {
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then((users) => setDevelopers(
          users.filter((u: any) => u.role === "DEVELOPER" || u.role === "ADMIN")
        ));
    }
  }, [id]);

  async function moveTicket(toStatus: string) {
    setMovingTo(toStatus);
    const res = await fetch(`/api/tickets/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus }),
    });
    setMovingTo(null);
    if (res.ok) {
      toast.current?.show({ severity: "success", summary: "Ticket moved", detail: `Moved to ${toStatus.replace("_", " ")}`, life: 3000 });
      load();
    } else {
      const err = await res.json();
      toast.current?.show({ severity: "error", summary: "Error", detail: err.error, life: 3000 });
    }
  }

  async function updateAssignee(assigneeId: number | null) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId }),
    });
    load();
  }

  async function updatePriority(priority: string) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    load();
  }

  async function triggerAnalysis() {
    setTriggeringAnalysis(true);
    await fetch(`/api/tickets/${id}/analyze`, { method: "POST" });
    setTriggeringAnalysis(false);
    toast.current?.show({ severity: "info", summary: "Analysis queued", detail: "Code search running in background. Refresh in a moment.", life: 4000 });
    setTimeout(load, 8000);
  }

  async function uploadFile(e: any) {
    const file = e.files[0];
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/tickets/${id}/attachments`, { method: "POST", body: fd });
    load();
  }

  if (loading) return (
    <AppShell>
      <div className="flex justify-content-center align-items-center" style={{ height: "60vh" }}>
        <ProgressSpinner />
      </div>
    </AppShell>
  );

  if (!data) return (
    <AppShell>
      <p>Ticket not found.</p>
      <Button label="Back" onClick={() => router.push("/tickets")} />
    </AppShell>
  );

  const { ticket, comments, attachments, aiValidation, aiCodeAnalysis } = data;
  const nextStatuses = STATUS_TRANSITIONS[ticket.status] || [];

  return (
    <AppShell>
      <Toast ref={toast} />
      <ConfirmDialog />
      <div className="max-w-5xl mx-auto flex flex-column gap-4">

        {/* Header */}
        <div className="flex align-items-start justify-content-between gap-3 flex-wrap">
          <div>
            <Button icon="pi pi-arrow-left" text onClick={() => router.push("/tickets")} className="mb-2 pl-0" />
            <h1 className="m-0 text-2xl font-bold">
              <span className="text-color-secondary mr-2">#{ticket.id}</span>
              {ticket.title}
            </h1>
            {ticket.awaitingClient === 1 && (
              <Tag value="Awaiting Client Response" severity="warning" className="mt-2" />
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {canEdit && nextStatuses.map((s: string) => (
              <Button key={s}
                label={`Move to ${s.replace("_", " ")}`}
                icon={s === "DONE" ? "pi pi-check" : "pi pi-arrow-right"}
                severity={s === "DONE" ? "success" : "info"}
                loading={movingTo === s}
                onClick={() => confirmDialog({
                  message: `Move ticket to "${s.replace("_", " ")}"?`,
                  header: "Confirm Move",
                  icon: "pi pi-exclamation-triangle",
                  accept: () => moveTicket(s),
                })}
              />
            ))}
          </div>
        </div>

        <div className="grid">
          {/* Main content */}
          <div className="col-12 lg:col-8 flex flex-column gap-4">
            <Card>
              <div className="flex flex-column gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-color-secondary uppercase mb-2">Description</h3>
                  <p style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</p>
                </div>
                <Divider />
                <div>
                  <h3 className="text-sm font-semibold text-color-secondary uppercase mb-2">Acceptance Criteria</h3>
                  <p style={{ whiteSpace: "pre-wrap" }}>{ticket.acceptanceCriteria}</p>
                </div>
                <Divider />
                <div>
                  <h3 className="text-sm font-semibold text-color-secondary uppercase mb-2">Affected Module</h3>
                  <p>{ticket.affectedModule}</p>
                </div>
              </div>
            </Card>

            <AiValidationPanel validation={aiValidation} />
            <AiCodeAnalysisPanel
              analysis={aiCodeAnalysis}
              canTrigger={canEdit}
              onTrigger={triggerAnalysis}
              triggering={triggeringAnalysis}
            />

            {/* Attachments */}
            {(attachments.length > 0 || canEdit) && (
              <Card title="Attachments">
                {attachments.map((a: any) => (
                  <div key={a.id} className="flex align-items-center gap-2 mb-2">
                    <i className="pi pi-file" />
                    <a
                      href={`/api/tickets/${ticket.id}/attachments/${a.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary"
                    >
                      {a.filename}
                    </a>
                    <span className="text-xs text-color-secondary">
                      ({(a.filesize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
                {canEdit && (
                  <FileUpload mode="basic" auto customUpload
                    uploadHandler={uploadFile}
                    chooseLabel="Attach File" className="mt-2" />
                )}
              </Card>
            )}

            <Card>
              <CommentThread
                comments={comments}
                ticketId={ticket.id}
                userRole={role}
                onCommentAdded={load}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="col-12 lg:col-4 flex flex-column gap-3">
            <Card>
              <div className="flex flex-column gap-3">
                <div>
                  <div className="text-xs font-semibold text-color-secondary uppercase mb-1">Status</div>
                  <Tag value={ticket.status.replace("_", " ")} severity={STATUS_COLORS[ticket.status] as any} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-color-secondary uppercase mb-1">Priority</div>
                  {canEdit ? (
                    <Dropdown value={ticket.priority}
                      options={[
                        { label: "Low", value: "LOW" },
                        { label: "Medium", value: "MEDIUM" },
                        { label: "High", value: "HIGH" },
                        { label: "Critical", value: "CRITICAL" },
                      ]}
                      onChange={(e) => updatePriority(e.value)}
                      className="w-full" />
                  ) : (
                    <Tag value={ticket.priority} severity={PRIORITY_COLORS[ticket.priority] as any} />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-color-secondary uppercase mb-1">Assignee</div>
                  {canEdit ? (
                    <Dropdown value={ticket.assigneeId}
                      options={[
                        { label: "Unassigned", value: null },
                        ...developers.map((d: any) => ({ label: d.name, value: d.id })),
                      ]}
                      onChange={(e) => updateAssignee(e.value)}
                      placeholder="Assign to developer"
                      className="w-full"
                      showClear />
                  ) : (
                    <span>{ticket.assignee?.name || "Unassigned"}</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-color-secondary uppercase mb-1">Submitted by</div>
                  <span>{ticket.creator?.name}</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-color-secondary uppercase mb-1">Created</div>
                  <span className="text-sm">{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-color-secondary uppercase mb-1">Updated</div>
                  <span className="text-sm">{new Date(ticket.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
