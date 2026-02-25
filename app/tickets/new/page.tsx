"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";
import { FileUpload } from "primereact/fileupload";
import AppShell from "@/components/AppShell";

export default function NewTicketPage() {
  const router = useRouter();
  const toast = useRef<Toast>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [affectedModule, setAffectedModule] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<number | null>(null);
  const fileUploadRef = useRef<any>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, acceptanceCriteria, affectedModule, priority }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.current?.show({ severity: "error", summary: "Error", detail: err.error, life: 4000 });
      setLoading(false);
      return;
    }

    const ticket = await res.json();
    setCreatedTicketId(ticket.id);

    toast.current?.show({
      severity: "success",
      summary: "Ticket created",
      detail: `Ticket #${ticket.id} submitted. AI validation running in background.`,
      life: 4000,
    });

    setLoading(false);
  }

  async function uploadFiles(ticketId: number) {
    if (!fileUploadRef.current?.getFiles()?.length) {
      router.push(`/tickets/${ticketId}`);
      return;
    }
    const files: File[] = fileUploadRef.current.getFiles();
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/tickets/${ticketId}/attachments`, { method: "POST", body: fd });
    }
    router.push(`/tickets/${ticketId}`);
  }

  return (
    <AppShell>
      <Toast ref={toast} />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Submit New Ticket</h1>
        {!createdTicketId ? (
          <Card>
            <form onSubmit={handleSubmit} className="flex flex-column gap-4">
              <div className="flex flex-column gap-2">
                <label htmlFor="title" className="font-semibold">
                  Title <span className="text-red-500">*</span>
                </label>
                <InputText id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                  required placeholder="Short, specific description of the change needed" />
              </div>

              <div className="flex flex-column gap-2">
                <label className="font-semibold">
                  Description <span className="text-red-500">*</span>
                </label>
                <InputTextarea value={description} onChange={(e) => setDescription(e.target.value)}
                  required rows={5} placeholder="Describe the problem or requirement in detail..." />
              </div>

              <div className="flex flex-column gap-2">
                <label className="font-semibold">
                  Acceptance Criteria <span className="text-red-500">*</span>
                </label>
                <InputTextarea value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  required rows={4}
                  placeholder="What does 'done' look like? List testable conditions..." />
              </div>

              <div className="grid">
                <div className="col-12 md:col-6 flex flex-column gap-2">
                  <label className="font-semibold">
                    Affected Module / Feature <span className="text-red-500">*</span>
                  </label>
                  <InputText value={affectedModule}
                    onChange={(e) => setAffectedModule(e.target.value)}
                    required placeholder="e.g. User Authentication, Invoice PDF, API v2" />
                </div>
                <div className="col-12 md:col-6 flex flex-column gap-2">
                  <label className="font-semibold">Priority</label>
                  <Dropdown value={priority} onChange={(e) => setPriority(e.value)}
                    options={[
                      { label: "Low", value: "LOW" },
                      { label: "Medium", value: "MEDIUM" },
                      { label: "High", value: "HIGH" },
                      { label: "Critical", value: "CRITICAL" },
                    ]}
                    className="w-full" />
                </div>
              </div>

              <div className="flex gap-3 justify-content-end">
                <Button type="button" label="Cancel" outlined
                  onClick={() => router.push("/tickets")} />
                <Button type="submit" label="Submit Ticket" icon="pi pi-send" loading={loading} />
              </div>
            </form>
          </Card>
        ) : (
          <Card title="Ticket Created">
            <p className="text-color-secondary mb-4">
              Ticket #{createdTicketId} has been submitted. You can optionally attach files below,
              then view your ticket.
            </p>
            <FileUpload ref={fileUploadRef} name="files" multiple auto={false}
              chooseLabel="Choose Files" uploadLabel="Upload" cancelLabel="Cancel"
              maxFileSize={10000000} />
            <div className="flex gap-3 mt-4">
              <Button label="Skip Attachments" outlined onClick={() => router.push(`/tickets/${createdTicketId}`)} />
              <Button label="Upload & View Ticket" icon="pi pi-upload"
                onClick={() => uploadFiles(createdTicketId)} />
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
