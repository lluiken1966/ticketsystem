"use client";
import { Panel } from "primereact/panel";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

interface CodeLocation {
  file_path: string;
  start_line: number;
  end_line: number;
  explanation: string;
}

interface Props {
  analysis: { results: CodeLocation[]; createdAt: string } | null;
  canTrigger: boolean;
  onTrigger: () => void;
  triggering: boolean;
}

export default function AiCodeAnalysisPanel({
  analysis, canTrigger, onTrigger, triggering
}: Props) {
  const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

  function deepLink(filePath: string, start: number, end: number) {
    return `https://github.com/${owner}/${repo}/blob/main/${filePath}#L${start}-L${end}`;
  }

  return (
    <Panel
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-code" />
          <span>AI Code Location Analysis</span>
        </div>
      }
      toggleable
      collapsed={!analysis}
    >
      {!analysis ? (
        <div className="flex flex-column gap-3">
          <Message severity="info" text="No code analysis yet." />
          {canTrigger && (
            <Button label="Run Code Search" icon="pi pi-search"
              loading={triggering} onClick={onTrigger} />
          )}
        </div>
      ) : (
        <div className="flex flex-column gap-3">
          <div className="flex align-items-center justify-content-between">
            <span className="text-xs text-color-secondary">
              Analyzed at {new Date(analysis.createdAt).toLocaleString()}
            </span>
            {canTrigger && (
              <Button label="Re-analyze" icon="pi pi-refresh" size="small" outlined
                loading={triggering} onClick={onTrigger} />
            )}
          </div>
          {analysis.results.length === 0 ? (
            <Message severity="warn" text="No relevant code locations found." />
          ) : (
            <DataTable value={analysis.results} stripedRows>
              <Column
                header="File"
                body={(r: CodeLocation) => (
                  <a href={deepLink(r.file_path, r.start_line, r.end_line)}
                    target="_blank" rel="noopener noreferrer"
                    className="text-primary">
                    {r.file_path}
                    <span className="text-color-secondary ml-1">
                      :{r.start_line}–{r.end_line}
                    </span>
                  </a>
                )}
              />
              <Column field="explanation" header="What to change" />
            </DataTable>
          )}
        </div>
      )}
    </Panel>
  );
}
