"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Badge } from "primereact/badge";
import confetti from "canvas-confetti";

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

  // Some responses may be empty (204 or error without JSON). Read text first.
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Not JSON
      data = { _raw: text };
    }
  }

  if (!res.ok) {
    const message = data?.error || data?._raw || `Status ${res.status}`;
    throw new Error(message);
  }

  return data;
}
// --------------- celebration helpers ---------------

function launchFireworks() {
  const duration = 3500;
  const end = Date.now() + duration;

  // Burst fireworks from random positions
  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: ["#ff595e", "#ffca3a", "#6a4c93", "#1982c4", "#8ac926"],
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: ["#ff595e", "#ffca3a", "#6a4c93", "#1982c4", "#8ac926"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();

  // Central star bursts
  setTimeout(() =>
    confetti({ particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.4 }, scalar: 1.2,
      shapes: ["star"], colors: ["#ffd700", "#ff6b6b", "#4ecdc4", "#45b7d1"] }), 200);
  setTimeout(() =>
    confetti({ particleCount: 80, spread: 120, origin: { x: 0.3, y: 0.5 },
      colors: ["#ff595e", "#ffca3a", "#8ac926"] }), 700);
  setTimeout(() =>
    confetti({ particleCount: 80, spread: 120, origin: { x: 0.7, y: 0.5 },
      colors: ["#6a4c93", "#1982c4", "#ff595e"] }), 1100);
}

function playHappyMusic() {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();

  // Simple fanfare melody: C E G C(high) — then a little flourish
  const notes = [
    { freq: 523.25, start: 0.0,  dur: 0.18 }, // C5
    { freq: 659.25, start: 0.2,  dur: 0.18 }, // E5
    { freq: 783.99, start: 0.4,  dur: 0.18 }, // G5
    { freq: 1046.5, start: 0.6,  dur: 0.40 }, // C6
    { freq: 783.99, start: 0.85, dur: 0.12 }, // G5
    { freq: 880.00, start: 1.0,  dur: 0.12 }, // A5
    { freq: 1046.5, start: 1.15, dur: 0.55 }, // C6 (long)
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
  });
}

function celebrate() {
  launchFireworks();
  playHappyMusic();
}

// ---------------------------------------------------

export default function KanbanBoard({ tickets, onTicketMoved }: Props) {
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
      if (laneKey === "DONE") celebrate();
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
