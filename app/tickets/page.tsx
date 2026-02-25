"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import KanbanBoard from "@/components/KanbanBoard";
import AppShell from "@/components/AppShell";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "info", MEDIUM: "warning", HIGH: "danger", CRITICAL: "danger",
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: "secondary", IN_PROGRESS: "info", REVIEW: "warning", DONE: "success",
};

export default function TicketsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterMine, setFilterMine] = useState(false);
  const role = (session?.user as any)?.role;

  function buildUrl() {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterPriority) params.set("priority", filterPriority);
    if (filterMine) params.set("mine", "true");
    return `/api/tickets?${params.toString()}`;
  }

  useEffect(() => {
    setLoading(true);
    fetch(buildUrl())
      .then((r) => r.json())
      .then((d) => { setTickets(d); setLoading(false); });
  }, [filterStatus, filterPriority, filterMine]);

  return (
    <AppShell>
      <div className="flex flex-column gap-3">
        <div className="flex align-items-center justify-content-between flex-wrap gap-2">
          <h1 className="m-0 text-2xl font-bold">Tickets</h1>
          <div className="flex gap-2">
            <SelectButton
              value={view}
              options={[
                { label: "Kanban", value: "kanban", icon: "pi pi-th-large" },
                { label: "List", value: "list", icon: "pi pi-list" },
              ]}
              onChange={(e) => setView(e.value)}
              optionLabel="label"
              optionValue="value"
            />
            {role !== "MANAGER" && (
              <Button label="New Ticket" icon="pi pi-plus"
                onClick={() => router.push("/tickets/new")} />
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Dropdown
            value={filterStatus}
            options={[
              { label: "All Statuses", value: null },
              { label: "Open", value: "OPEN" },
              { label: "In Progress", value: "IN_PROGRESS" },
              { label: "Review", value: "REVIEW" },
              { label: "Done", value: "DONE" },
            ]}
            onChange={(e) => setFilterStatus(e.value)}
            placeholder="Status"
            showClear
          />
          <Dropdown
            value={filterPriority}
            options={[
              { label: "All Priorities", value: null },
              { label: "Low", value: "LOW" },
              { label: "Medium", value: "MEDIUM" },
              { label: "High", value: "HIGH" },
              { label: "Critical", value: "CRITICAL" },
            ]}
            onChange={(e) => setFilterPriority(e.value)}
            placeholder="Priority"
            showClear
          />
          {(role === "DEVELOPER" || role === "ADMIN") && (
            <Button
              label={filterMine ? "My Tickets" : "All Tickets"}
              icon={filterMine ? "pi pi-user" : "pi pi-users"}
              outlined={!filterMine}
              onClick={() => setFilterMine(!filterMine)}
            />
          )}
        </div>

        {loading ? (
          <div className="flex justify-content-center p-6">
            <ProgressSpinner />
          </div>
        ) : view === "kanban" ? (
          <KanbanBoard tickets={tickets} />
        ) : (
          <DataTable value={tickets} paginator rows={15} stripedRows rowHover
            onRowClick={(e) => router.push(`/tickets/${e.data.id}`)}>
            <Column field="id" header="#" style={{ width: "60px" }} sortable />
            <Column field="title" header="Title" sortable />
            <Column field="creator.name" header="Submitted by" />
            <Column header="Priority" body={(r) => (
              <Tag value={r.priority} severity={PRIORITY_COLORS[r.priority] as any} />
            )} sortable sortField="priority" />
            <Column header="Status" body={(r) => (
              <Tag value={r.status.replace("_", " ")} severity={STATUS_COLORS[r.status] as any} />
            )} sortable sortField="status" />
            <Column field="assignee.name" header="Assignee" />
          </DataTable>
        )}
      </div>
    </AppShell>
  );
}
