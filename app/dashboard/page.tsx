"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { ProgressSpinner } from "primereact/progressspinner";
import AppShell from "@/components/AppShell";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "info",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "secondary",
  IN_PROGRESS: "info",
  REVIEW: "warning",
  DONE: "success",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <AppShell>
      <div className="flex justify-content-center align-items-center" style={{ height: "60vh" }}>
        <ProgressSpinner />
      </div>
    </AppShell>
  );

  const laneChartData = {
    labels: ["Open", "In Progress", "Review", "Done"],
    datasets: [{
      data: [
        data.laneCounts.OPEN,
        data.laneCounts.IN_PROGRESS,
        data.laneCounts.REVIEW,
        data.laneCounts.DONE,
      ],
      backgroundColor: ["#64748b", "#3b82f6", "#f59e0b", "#22c55e"],
    }],
  };

  const priorityChartData = {
    labels: ["Low", "Medium", "High", "Critical"],
    datasets: [{
      label: "Tickets",
      data: [
        data.priorityCounts.LOW,
        data.priorityCounts.MEDIUM,
        data.priorityCounts.HIGH,
        data.priorityCounts.CRITICAL,
      ],
      backgroundColor: ["#22c55e", "#f59e0b", "#ef4444", "#7f1d1d"],
    }],
  };

  const role = (session?.user as any)?.role;

  let displayTickets = data.recentTickets || [];
  if (filterStatus) displayTickets = displayTickets.filter((t: any) => t.status === filterStatus);
  if (filterPriority) displayTickets = displayTickets.filter((t: any) => t.priority === filterPriority);

  return (
    <AppShell>
      <div className="flex flex-column gap-4">
        <div className="flex align-items-center justify-content-between">
          <h1 className="m-0 text-2xl font-bold">Dashboard</h1>
          {role !== "MANAGER" && role !== "CLIENT" && (
            <Button label="New Ticket" icon="pi pi-plus" onClick={() => router.push("/tickets/new")} />
          )}
        </div>

        {/* Lane Count Cards */}
        <div className="grid">
          {[
            { label: "Open", key: "OPEN", icon: "pi-inbox", color: "#64748b" },
            { label: "In Progress", key: "IN_PROGRESS", icon: "pi-sync", color: "#3b82f6" },
            { label: "Review", key: "REVIEW", icon: "pi-eye", color: "#f59e0b" },
            { label: "Done", key: "DONE", icon: "pi-check-circle", color: "#22c55e" },
          ].map(({ label, key, icon, color }) => (
            <div key={key} className="col-12 md:col-3">
              <Card className="text-center">
                <i className={`pi ${icon} text-3xl mb-2`} style={{ color }} />
                <div className="text-4xl font-bold" style={{ color }}>{data.laneCounts[key]}</div>
                <div className="text-color-secondary mt-1">{label}</div>
              </Card>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid">
          <div className="col-12 md:col-5">
            <Card title="Tickets by Lane">
              <Chart type="doughnut" data={laneChartData} style={{ maxHeight: "220px" }} />
            </Card>
          </div>
          <div className="col-12 md:col-7">
            <Card title="Tickets by Priority">
              <Chart type="bar" data={priorityChartData}
                options={{ plugins: { legend: { display: false } } }}
                style={{ maxHeight: "220px" }} />
            </Card>
          </div>
        </div>

        {/* My Assigned Tickets */}
        {(role === "DEVELOPER" || role === "ADMIN") && data.myTickets?.length > 0 && (
          <Card title="My Assigned Tickets">
            <DataTable value={data.myTickets} stripedRows rowHover
              onRowClick={(e) => router.push(`/tickets/${e.data.id}`)}>
              <Column field="id" header="#" style={{ width: "60px" }} />
              <Column field="title" header="Title" />
              <Column header="Priority" body={(r) => (
                <Tag value={r.priority} severity={PRIORITY_COLORS[r.priority] as any} />
              )} />
              <Column header="Status" body={(r) => (
                <Tag value={r.status.replace("_", " ")} severity={STATUS_COLORS[r.status] as any} />
              )} />
            </DataTable>
          </Card>
        )}

        {/* All Tickets with Filters */}
        <Card title="All Tickets">
          <div className="flex gap-2 mb-3 flex-wrap">
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
              placeholder="Filter by status"
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
              placeholder="Filter by priority"
              showClear
            />
            <Button label="View Kanban" icon="pi pi-th-large" outlined
              onClick={() => router.push("/tickets")} />
          </div>
          <DataTable value={displayTickets} paginator rows={10} stripedRows rowHover
            onRowClick={(e) => router.push(`/tickets/${e.data.id}`)}>
            <Column field="id" header="#" style={{ width: "60px" }} />
            <Column field="title" header="Title" />
            <Column field="creator.name" header="Submitted by" />
            <Column header="Priority" body={(r) => (
              <Tag value={r.priority} severity={PRIORITY_COLORS[r.priority] as any} />
            )} />
            <Column header="Status" body={(r) => (
              <Tag value={r.status.replace("_", " ")} severity={STATUS_COLORS[r.status] as any} />
            )} />
            <Column field="assignee.name" header="Assignee" />
          </DataTable>
        </Card>
      </div>
    </AppShell>
  );
}
