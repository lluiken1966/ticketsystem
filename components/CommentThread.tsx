"use client";
import { useState } from "react";
import { Timeline } from "primereact/timeline";
import { Card } from "primereact/card";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Checkbox } from "primereact/checkbox";

interface Comment {
  id: number;
  user: { name: string; role: string };
  content: string;
  isInternal: number;
  isClientQuestion: number;
  createdAt: string;
}

interface Props {
  comments: Comment[];
  ticketId: number;
  userRole: string;
  onCommentAdded: () => void;
}

export default function CommentThread({ comments, ticketId, userRole, onCommentAdded }: Props) {
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isClientQuestion, setIsClientQuestion] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!content.trim()) return;
    setLoading(true);
    await fetch(`/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, isInternal, isClientQuestion }),
    });
    setContent("");
    setIsInternal(false);
    setIsClientQuestion(false);
    setLoading(false);
    onCommentAdded();
  }

  function commentColor(c: Comment) {
    if (c.isInternal) return "#3f3a1f";
    if (c.isClientQuestion) return "#1e2f5a";
    return "#1e2139";
  }

  const timelineEvents = comments.map((c) => ({
    ...c,
    date: new Date(c.createdAt).toLocaleString(),
  }));

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">
        <i className="pi pi-comments mr-2" />
        Discussion
      </h3>

      {comments.length === 0 ? (
        <p className="text-color-secondary mb-4">No comments yet.</p>
      ) : (
        <Timeline
          value={timelineEvents}
          content={(item) => (
            <Card
              className="mb-3"
              style={{ background: commentColor(item), borderLeft: item.isInternal ? "3px solid #eab308" : item.isClientQuestion ? "3px solid #60a5fa" : "3px solid #64748b" }}
            >
              <div className="flex align-items-center justify-content-between mb-2">
                <div className="flex align-items-center gap-2">
                  <strong style={{ color: "#e2e8f0" }}>{item.user?.name}</strong>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>{item.date}</span>
                </div>
                <div className="flex gap-1">
                  {item.isInternal === 1 && <Tag value="Internal" severity="warning" style={{ fontSize: "10px" }} />}
                  {item.isClientQuestion === 1 && <Tag value="Question for Client" severity="info" style={{ fontSize: "10px" }} />}
                </div>
              </div>
              <p className="m-0" style={{ whiteSpace: "pre-wrap", color: "#e2e8f0" }}>{item.content}</p>
            </Card>
          )}
          marker={() => <i className="pi pi-circle-fill text-primary" style={{ fontSize: "10px" }} />}
        />
      )}

      <div className="flex flex-column gap-2 mt-4">
        <InputTextarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Write a comment..."
          className="w-full"
        />
        {(userRole !== "CLIENT" || userRole === "ADMIN") && (
          <div className="flex gap-4">
            <div className="flex align-items-center gap-2">
              <Checkbox inputId="internal" checked={isInternal}
                onChange={(e) => { setIsInternal(!!e.checked); if (e.checked) setIsClientQuestion(false); }} />
              <label htmlFor="internal" className="text-sm">Internal note (not visible to client)</label>
            </div>
            <div className="flex align-items-center gap-2">
              <Checkbox inputId="question" checked={isClientQuestion}
                onChange={(e) => { setIsClientQuestion(!!e.checked); if (e.checked) setIsInternal(false); }} />
              <label htmlFor="question" className="text-sm">Question for client (notifies them by email)</label>
            </div>
          </div>
        )}
        <Button label="Post Comment" icon="pi pi-send" loading={loading}
          onClick={submit} disabled={!content.trim()} className="align-self-end" />
      </div>
    </div>
  );
}
