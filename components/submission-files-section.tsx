"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type ExistingFile = { id: string; kind: string; path: string; mime: string | null };

export function SubmissionFilesSection(props: {
  submissionId: string;
  submissionStatus: string;
  currentVersionId: string | null;
  files: ExistingFile[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [kind, setKind] = useState("manuscript");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canUpload = props.submissionStatus === "draft" && !!props.currentVersionId;

  async function onUpload() {
    setMessage(null);
    if (!file) return setMessage("Choose a file first.");
    if (!props.currentVersionId) return setMessage("Missing submission version.");

    const safeName = file.name.replaceAll(/[^a-zA-Z0-9._-]+/g, "-");
    const objectPath = `submissions/${props.submissionId}/${props.currentVersionId}/${crypto.randomUUID()}-${safeName}`;

    const { error: upErr } = await supabase.storage.from("data").upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (upErr) return setMessage(upErr.message);

    startTransition(async () => {
      let res: { ok: boolean; message?: string };
      try {
        const fetchRes = await fetch("/api/author/submissions/files/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId: props.submissionId,
            submissionVersionId: props.currentVersionId!,
            fileKind: kind,
            storagePath: objectPath,
            mimeType: file.type || null,
          }),
        });
        try {
          res = (await fetchRes.json()) as typeof res;
        } catch {
          setMessage("Invalid response from server.");
          return;
        }
      } catch {
        setMessage("Network error while registering file.");
        return;
      }
      setMessage(res.message ?? (res.ok ? "Uploaded." : "Upload registered with errors."));
      if (res.ok) {
        setFile(null);
        location.reload();
      }
    });
  }

  return (
    <section className="rounded-lg border bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Files</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your manuscript and supplementary documents. Files are stored in the <code>data</code> bucket under{" "}
            <code>submissions/</code>.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {props.files.length ? (
          <div className="grid gap-2">
            {props.files.map((f) => (
              <div key={f.id} className="flex flex-col gap-1 rounded border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.kind}</p>
                  <p className="truncate text-xs text-muted-foreground">{f.path}</p>
                </div>
                <p className="text-xs text-muted-foreground">{f.mime ?? "—"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
        )}

        <div className="mt-3 rounded border bg-muted/20 p-4">
          <p className="text-sm font-medium">Upload a file</p>
          {!canUpload && (
            <p className="mt-1 text-sm text-muted-foreground">
              Uploads are only available for drafts (and require a current version).
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="file_kind">File kind</Label>
              <select
                id="file_kind"
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                disabled={!canUpload || isPending}
              >
                <option value="manuscript">Manuscript</option>
                <option value="cover_letter">Cover letter</option>
                <option value="supplementary">Supplementary</option>
                <option value="figures">Figures</option>
                <option value="tables">Tables</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="file_input">File</Label>
              <Input
                id="file_input"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={!canUpload || isPending}
              />
            </div>
          </div>
          {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
          <div className="mt-3">
            <Button onClick={onUpload} disabled={!canUpload || !file || isPending}>
              {isPending ? "Saving…" : "Upload"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

