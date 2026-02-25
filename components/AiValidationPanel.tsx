"use client";
import { Panel } from "primereact/panel";
import { Tag } from "primereact/tag";
import { Message } from "primereact/message";

interface Props {
  validation: { isComplete: number; feedback: string | null; createdAt: string } | null;
}

export default function AiValidationPanel({ validation }: Props) {
  return (
    <Panel
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-robot" />
          <span>AI Completeness Check</span>
          {validation && (
            <Tag
              value={validation.isComplete ? "Complete" : "Incomplete"}
              severity={validation.isComplete ? "success" : "warning"}
            />
          )}
        </div>
      }
      toggleable
      collapsed={!validation}
    >
      {!validation ? (
        <Message severity="info" text="Validation is running in the background. Refresh in a moment." />
      ) : (
        <div>
          <Message
            severity={validation.isComplete ? "success" : "warn"}
            text={validation.feedback || "No feedback provided."}
            className="w-full"
          />
          <p className="text-xs text-color-secondary mt-2">
            Analyzed at {new Date(validation.createdAt).toLocaleString()}
          </p>
        </div>
      )}
    </Panel>
  );
}
