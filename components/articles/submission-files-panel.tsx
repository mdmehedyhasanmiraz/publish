"use client";

import { useState } from "react";
import { createSubmissionFileStaffDownloadAction } from "@/lib/actions/article";
import { Button } from "@/components/ui/button";

export type SubmissionFileRow = {
  id: string;
  file_kind: string;
  description: string | null;
  storage_path: string;
  version_number: number | null;
};

export function SubmissionFilesPanel(props: {
  submissionId: string;
  files: SubmissionFileRow[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function download(row: SubmissionFileRow) {
    setMsg(null);
    setBusyId(row.id);
    try {
      const r = await createSubmissionFileStaffDownloadAction({
        submissionId: props.submissionId,
        storagePath: row.storage_path,
      });
      if (r.ok) {
        window.open(r.url, "_blank", "noopener,noreferrer");
      } else {
        setMsg(r.message);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-5">
      <h2 className="text-lg font-semibold">Source manuscript files</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Files uploaded with the submission (by version). Download to prepare the article below.
      </p>
      {!props.files.length ? (
        <p className="mt-3 text-sm text-muted-foreground">No manuscript files are registered for this submission.</p>
      ) : null}
      <ul className="mt-3 space-y-2 text-sm">
        {props.files.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <span className="font-medium capitalize">{f.file_kind.replace(/_/g, " ")}</span>
              {f.version_number != null ? (
                <span className="ml-2 text-muted-foreground">· version {f.version_number}</span>
              ) : null}
              {f.description ? (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{f.description}</span>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busyId === f.id}
              onClick={() => void download(f)}
            >
              {busyId === f.id ? "Opening…" : "Download"}
            </Button>
          </li>
        ))}
      </ul>
      {msg ? <p className="mt-2 text-sm text-red-600">{msg}</p> : null}
    </section>
  );
}
