"use client";

import { useState } from "react";
import { createReviewerSubmissionFileSignedUrlAction } from "@/lib/actions/peer-review";
import { Button } from "@/components/ui/button";

export type ReviewerFileRow = {
  id: string;
  file_kind: string;
  storage_path: string;
  mime_type: string | null;
  description: string | null;
};

export function ReviewerManuscriptFiles(props: {
  submissionId: string;
  files: ReviewerFileRow[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!props.files.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No files are registered for this submission yet. If something is missing, contact the editorial office.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {props.files.map((f) => (
        <div
          key={f.id}
          className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium capitalize">{f.file_kind.replace(/_/g, " ")}</p>
            {f.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>
            ) : null}
            {f.mime_type ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{f.mime_type}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={busyId === f.id}
            onClick={() => {
              void (async () => {
                setMsg(null);
                setBusyId(f.id);
                const r = await createReviewerSubmissionFileSignedUrlAction({
                  submissionId: props.submissionId,
                  storagePath: f.storage_path,
                });
                setBusyId(null);
                if (!r.ok) {
                  setMsg(r.error);
                  return;
                }
                window.open(r.url, "_blank", "noopener,noreferrer");
              })();
            }}
          >
            {busyId === f.id ? "Preparing…" : "Download"}
          </Button>
        </div>
      ))}
      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
    </div>
  );
}
