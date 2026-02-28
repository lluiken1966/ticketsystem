"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Badge } from "primereact/badge";

const LANES = [
  { key: "OPEN", label: "Open", color: "#64748b" },
  { key: "IN_PROGRESS", label: "In Progress", color: "#3b82f6" },
  { key: "REVIEW", label: "Review", color: "#f59e0b" },
  { key: "DONE", label: "Done", color: "#22c55e" },
];

const PRIORITY_SEVERITY: Record<string, "info" | "success" | "warning" | "danger"> = {
  LOW: "info",
  MEDIUM: "success",
  HIGH: "warning",
  CRITICAL: "danger",
};

interface Ticket {
  id: number;
  title: string;
  priority: string;
  status: string;
  creator: { name: string };
  assignee: { name: string } | null;
  awaitingClient: number;
}

interface Props {
  tickets: Ticket[];
  onTicketMoved?: () => void; // optional callback when a ticket changes lanes
}

// helper for server update
async function moveTicketRequest(id: number, toStatus: string) {
  const res = await fetch(`/api/tickets/${id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toStatus }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Status ${res.status}`);
  }
  return res.json();
}
export default function KanbanBoard({ tickets }: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<Ticket[]>(tickets);

  // keep in sync when prop changes
  useEffect(() => {
    setLocal(tickets);
  }, [tickets]);

  async function handleDrop(e: React.DragEvent<HTMLDivElement>, laneKey: string) {
    e.preventDefault();
    const idStr = e.dataTransfer.getData("text/plain");
    const id = parseInt(idStr);
    if (isNaN(id)) return;
    try {
      await moveTicketRequest(id, laneKey);
      // update local copy
      setLocal((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: laneKey } : t))
      );
      onTicketMoved?.();
    } catch (err: any) {
      console.error("Move failed", err);
      alert(`Cannot move ticket: ${err.message}`);
    }
  }

  function allowDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {LANES.map((lane) => {
        const laneTickets = local.filter((t) => t.status === lane.key);
        return (
          <div
            key={lane.key}
            style={{ minWidth: "260px", flex: "1" }}
            onDragOver={allowDrop}
            onDrop={(e) => handleDrop(e, lane.key)}
          >
            <div
              className="flex align-items-center justify-content-between p-3 border-round-top"
              style={{ background: lane.color, color: "white" }}
            >
              <span className="font-semibold">{lane.label}</span>
              <Badge value={laneTickets.length} severity="secondary" />
            </div>
            <div
              className="flex flex-column gap-2 p-2 border-1 surface-border border-round-bottom"
              style={{ minHeight: "200px", background: "var(--surface-ground)" }}
            >
              {laneTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  draggable={true}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", ticket.id.toString())}
                  className="cursor-pointer hover:shadow-3 transition-all transition-duration-150"
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  style={{ padding: "0" }}
                >
                  <div className="flex flex-column gap-2">
                    <div className="flex align-items-center justify-content-between">
                      <span className="text-sm text-color-secondary">#{ticket.id}</span>
                      <Tag
                        value={ticket.priority}
                        severity={PRIORITY_SEVERITY[ticket.priority]}
                        style={{ fontSize: "11px" }}
                      />
                    </div>
                    <div className="font-medium text-sm line-clamp-2">{ticket.title}</div>
                    <div className="flex align-items-center justify-content-between">
                      <span className="text-xs text-color-secondary">
                        {ticket.creator?.name}
                      </span>
                      {ticket.awaitingClient === 1 && (
                        <Tag value="Awaiting Client" severity="warning" style={{ fontSize: "10px" }} />
                      )}
                      {ticket.assignee && (
                        <span className="text-xs text-color-secondary">
                          → {ticket.assignee.name}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {laneTickets.length === 0 && (
                <div className="text-center text-color-secondary p-4 text-sm">
                  No tickets
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
