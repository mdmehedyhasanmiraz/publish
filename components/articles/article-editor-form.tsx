"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  publishArticleVersionAction,
  saveArticleVersionAction,
  unpublishArticleAction,
} from "@/lib/actions/article";
import type { ArticleReferenceRow } from "@/lib/articles/extra-metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArticleAssetManager } from "@/components/articles/article-asset-manager";
import { ArticleWorkflowPanel } from "@/components/articles/article-workflow-panel";
import { ArticlePreview } from "@/components/articles/article-preview";
import { SubmissionFilesPanel, type SubmissionFileRow } from "@/components/articles/submission-files-panel";
import Link from "next/link";
import { publicArticlePath } from "@/lib/articles/public-article-path";

type Asset = {
  id: string;
  asset_key: string;
  asset_type: "figure" | "table";
  caption: string | null;
  alt_text: string | null;
  table_markdown: string | null;
  storage_path: string | null;
  sort_order: number;
};

type IssueOption = { id: string; issue_slug: string; volumes?: { volume_slug: string } | { volume_slug: string }[] };

async function importManuscriptViaStream(
  articleId: string,
  onProgress: (percent: number, message: string) => void,
): Promise<
  | { ok: true; markdown: string; warnings: string[] }
  | { ok: false; message: string }
> {
  const res = await fetch("/api/articles/import-manuscript-body", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articleId }),
    credentials: "same-origin",
  });

  if (!res.ok) {
    try {
      const j = (await res.json()) as { message?: string };
      return { ok: false, message: j.message ?? `Request failed (${res.status}).` };
    } catch {
      return { ok: false, message: `Request failed (${res.status}).` };
    }
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return { ok: false, message: "No response stream from server." };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let outcome:
    | { ok: true; markdown: string; warnings: string[] }
    | { ok: false; message: string }
    | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (;;) {
      const nl = buffer.indexOf("\n");
      if (nl < 0) break;
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line) as unknown;
      } catch {
        continue;
      }
      if (!parsed || typeof parsed !== "object") continue;
      const msg = parsed as Record<string, unknown>;
      if (msg.type === "progress" && typeof msg.percent === "number" && typeof msg.message === "string") {
        onProgress(Math.max(0, Math.min(100, msg.percent)), msg.message);
      } else if (msg.type === "result") {
        if (msg.ok === true && typeof msg.markdown === "string" && Array.isArray(msg.warnings)) {
          outcome = { ok: true, markdown: msg.markdown, warnings: msg.warnings as string[] };
        } else if (msg.ok === false && typeof msg.message === "string") {
          outcome = { ok: false, message: msg.message };
        } else {
          outcome = { ok: false, message: "Invalid server response." };
        }
      }
    }
  }

  if (!outcome) {
    return { ok: false, message: "Import did not complete." };
  }
  return outcome;
}

function isArticleReferenceRow(x: unknown): x is ArticleReferenceRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.text === "string";
}

async function importReferencesFromManuscriptViaStream(
  articleId: string,
  onProgress: (percent: number, message: string) => void,
): Promise<
  | { ok: true; references: ArticleReferenceRow[]; warnings: string[] }
  | { ok: false; message: string }
> {
  const res = await fetch("/api/articles/import-references", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articleId }),
    credentials: "same-origin",
  });

  if (!res.ok) {
    try {
      const j = (await res.json()) as { message?: string };
      return { ok: false, message: j.message ?? `Request failed (${res.status}).` };
    } catch {
      return { ok: false, message: `Request failed (${res.status}).` };
    }
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return { ok: false, message: "No response stream from server." };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let outcome:
    | { ok: true; references: ArticleReferenceRow[]; warnings: string[] }
    | { ok: false; message: string }
    | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (;;) {
      const nl = buffer.indexOf("\n");
      if (nl < 0) break;
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line) as unknown;
      } catch {
        continue;
      }
      if (!parsed || typeof parsed !== "object") continue;
      const msg = parsed as Record<string, unknown>;
      if (msg.type === "progress" && typeof msg.percent === "number" && typeof msg.message === "string") {
        onProgress(Math.max(0, Math.min(100, msg.percent)), msg.message);
      } else if (msg.type === "result") {
        if (msg.ok === true && Array.isArray(msg.warnings)) {
          const refs = msg.references;
          if (!Array.isArray(refs) || !refs.every(isArticleReferenceRow)) {
            outcome = { ok: false, message: "Invalid server response." };
          } else {
            outcome = { ok: true, references: refs, warnings: msg.warnings as string[] };
          }
        } else if (msg.ok === false && typeof msg.message === "string") {
          outcome = { ok: false, message: msg.message };
        } else {
          outcome = { ok: false, message: "Invalid server response." };
        }
      }
    }
  }

  if (!outcome) {
    return { ok: false, message: "Import did not complete." };
  }
  return outcome;
}

function CopyTextButton(props: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={() => {
        void navigator.clipboard.writeText(props.text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        });
      }}
    >
      {done ? "Copied" : props.label}
    </Button>
  );
}

export function ArticleEditorForm(props: {
  articleId: string;
  versionId: string;
  initialTitle: string;
  initialAbstract: string;
  initialDoi: string;
  initialKeywords: string[];
  initialMarkdownBody: string;
  initialIssueId: string | null;
  workflowStatus: string;
  issueOptions: IssueOption[];
  assets: Asset[];
  submissionId?: string | null;
  submissionFiles?: SubmissionFileRow[];
  initialAcknowledgement?: string;
  initialCompetingInterests?: string;
  initialReferences?: ArticleReferenceRow[];
  /** Admin article desk: extra navigation and context. */
  editorContext?: "default" | "admin";
  journalSlug?: string | null;
  /** Manuscript reference code (public URL segment), when assigned. */
  articleCodeForPublic?: string | null;
  journalName?: string | null;
  submissionWorkflowHref?: string | null;
  manuscriptReferenceCode?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [publishPending, startPublishTransition] = useTransition();
  const [unpublishPending, startUnpublishTransition] = useTransition();
  const [importBusy, setImportBusy] = useState(false);
  const [importProgressPercent, setImportProgressPercent] = useState(0);
  const [importProgressMessage, setImportProgressMessage] = useState("");
  const [importNote, setImportNote] = useState<string | null>(null);
  const [refsImportBusy, setRefsImportBusy] = useState(false);
  const [refsImportProgressPercent, setRefsImportProgressPercent] = useState(0);
  const [refsImportProgressMessage, setRefsImportProgressMessage] = useState("");
  const [refsImportNote, setRefsImportNote] = useState<string | null>(null);
  const refsFileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState(props.initialTitle);
  const [abstractText, setAbstractText] = useState(props.initialAbstract);
  const [doi, setDoi] = useState(props.initialDoi);
  const [keywordsCsv, setKeywordsCsv] = useState((props.initialKeywords ?? []).join(", "));
  const [markdownBody, setMarkdownBody] = useState(props.initialMarkdownBody);
  const [issueId, setIssueId] = useState(props.initialIssueId ?? "");
  const [acknowledgement, setAcknowledgement] = useState(props.initialAcknowledgement ?? "");
  const [competingInterests, setCompetingInterests] = useState(props.initialCompetingInterests ?? "");
  const [references, setReferences] = useState<ArticleReferenceRow[]>(() => {
    const r = props.initialReferences;
    if (r?.length) return r;
    return [{ text: "" }];
  });

  function save() {
    startTransition(async () => {
      const refPayload = references
        .map((r) => ({
          text: r.text.trim(),
          doi: r.doi?.trim() || undefined,
          google_scholar_url: r.google_scholar_url?.trim() || undefined,
        }))
        .filter((r) => r.text.length > 0);

      const res = await saveArticleVersionAction({
        articleId: props.articleId,
        versionId: props.versionId,
        title,
        abstract: abstractText,
        doi,
        keywordsCsv,
        markdownBody,
        issueId: issueId || null,
        acknowledgement,
        competingInterests,
        references: refPayload,
      });
      setMessage(res.message ?? (res.ok ? "Saved." : "Could not save."));
    });
  }

  const refsForPreview: ArticleReferenceRow[] = references
    .map((r) => ({
      text: r.text.trim(),
      doi: r.doi?.trim() || undefined,
      google_scholar_url: r.google_scholar_url?.trim() || undefined,
    }))
    .filter((r) => r.text.length > 0);

  const publicArticleHref =
    props.journalSlug && props.articleCodeForPublic?.trim()
      ? publicArticlePath(props.journalSlug, props.articleCodeForPublic.trim())
      : null;

  const canPublish = ["draft", "in_review", "approved"].includes(props.workflowStatus);
  const isPublished = props.workflowStatus === "published";

  function publishPublicly() {
    if (!canPublish) return;
    if (
      !confirm(
        "Publish this article on the public journal website? It will be visible to readers at the public article URL.",
      )
    ) {
      return;
    }
    startPublishTransition(async () => {
      const res = await publishArticleVersionAction({ articleId: props.articleId, versionId: props.versionId });
      setMessage(res.message ?? (res.ok ? "Published." : "Could not publish."));
      if (res.ok) window.location.reload();
    });
  }

  function unpublishPublicly() {
    if (!isPublished) return;
    if (
      !confirm(
        "Unpublish this article? It will be removed from the public journal site until you publish again.",
      )
    ) {
      return;
    }
    startUnpublishTransition(async () => {
      const res = await unpublishArticleAction({ articleId: props.articleId, versionId: props.versionId });
      setMessage(res.message ?? (res.ok ? "Unpublished." : "Could not unpublish."));
      if (res.ok) window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {props.editorContext === "admin" ? (
        <section className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin · Article desk</p>
              <h1 className="mt-1 text-xl font-semibold leading-tight">{title || "Article"}</h1>
              {props.journalName ? (
                <p className="mt-1 text-sm text-muted-foreground">{props.journalName}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || publishPending || unpublishPending || importBusy || refsImportBusy}
                onClick={save}
              >
                {pending ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-teal-600 text-white shadow-sm hover:bg-teal-700"
                disabled={publishPending || unpublishPending || !canPublish}
                onClick={publishPublicly}
              >
                {publishPending ? "Publishing…" : isPublished ? "Published" : "Publish"}
              </Button>
              {isPublished ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-900 hover:bg-amber-50"
                  disabled={unpublishPending || publishPending || importBusy || refsImportBusy}
                  onClick={unpublishPublicly}
                >
                  {unpublishPending ? "Unpublishing…" : "Unpublish"}
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/admin/articles">All articles</Link>
              </Button>
              {props.submissionWorkflowHref ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href={props.submissionWorkflowHref}>Submission workflow</Link>
                </Button>
              ) : null}
              {publicArticleHref ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href={publicArticleHref} target="_blank" rel="noreferrer">
                    Public article URL
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
          {publicArticleHref ? (
            <p className="mt-3 font-mono text-xs text-muted-foreground break-all">{publicArticleHref}</p>
          ) : null}
        </section>
      ) : null}

      {props.editorContext !== "admin" ? (
        <div className="flex flex-wrap items-center gap-2">
          {props.submissionWorkflowHref ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={props.submissionWorkflowHref}>Open submission workflow</Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || publishPending || importBusy || refsImportBusy}
            onClick={save}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-teal-600 text-white shadow-sm hover:bg-teal-700"
            disabled={publishPending || !canPublish}
            onClick={publishPublicly}
          >
            {publishPending ? "Publishing…" : isPublished ? "Published" : "Publish"}
          </Button>
        </div>
      ) : null}

      {props.submissionId ? (
        <SubmissionFilesPanel submissionId={props.submissionId} files={props.submissionFiles ?? []} />
      ) : null}

      <section className="rounded-lg border bg-white p-5">
        <h1 className={`font-semibold ${props.editorContext === "admin" ? "text-lg" : "text-2xl"}`}>Article editor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Markdown: headings, <code>**bold**</code>, <code>*italic*</code>, <code>`code`</code>, citations{" "}
          <code>[1]</code>, <code>[2]</code> (match numbered references below). Figures/tables:{" "}
          <code>{"{{figure:fig-1}}"}</code>, <code>{"{{table:tbl-1}}"}</code>
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>DOI</Label>
            <Input value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.xxxx/xxxx" />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Abstract (Markdown)</Label>
              <CopyTextButton label="Copy abstract" text={abstractText} />
            </div>
            <Textarea rows={6} value={abstractText} onChange={(e) => setAbstractText(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Keywords (comma separated)</Label>
            <Input value={keywordsCsv} onChange={(e) => setKeywordsCsv(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Issue assignment</Label>
            <select
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            >
              <option value="">Ahead of issue</option>
              {props.issueOptions.map((issue) => {
                const volume = Array.isArray(issue.volumes) ? issue.volumes[0] : issue.volumes;
                return (
                  <option key={issue.id} value={issue.id}>
                    {volume?.volume_slug ? `${volume.volume_slug} / ` : ""}
                    {issue.issue_slug}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold">Other sections (stored as JSON metadata)</h2>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Acknowledgements (plain text or Markdown)</Label>
              <CopyTextButton label="Copy" text={acknowledgement} />
            </div>
            <Textarea rows={3} value={acknowledgement} onChange={(e) => setAcknowledgement(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Competing interests</Label>
              <CopyTextButton label="Copy" text={competingInterests} />
            </div>
            <Textarea rows={3} value={competingInterests} onChange={(e) => setCompetingInterests(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">References</h2>
          <div className="flex flex-wrap items-center gap-2">
            {props.submissionId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={refsImportBusy || pending}
                onClick={() => {
                  if (
                    !confirm(
                      'Replace all reference rows with entries scraped from the "References" section of the latest submission manuscript (.docx)?\n\n' +
                        "DOI (when detected), Google Scholar search links, and Crossref search links are filled in automatically in the preview.",
                    )
                  ) {
                    return;
                  }
                  setRefsImportNote(null);
                  setRefsImportBusy(true);
                  setRefsImportProgressPercent(0);
                  setRefsImportProgressMessage("Starting…");
                  void importReferencesFromManuscriptViaStream(props.articleId, (pct, msg) => {
                    setRefsImportProgressPercent(pct);
                    setRefsImportProgressMessage(msg);
                  }).then((r) => {
                    setRefsImportBusy(false);
                    setRefsImportProgressPercent(0);
                    setRefsImportProgressMessage("");
                    if (!r.ok) {
                      setRefsImportNote(r.message);
                      return;
                    }
                    setReferences(r.references.length ? r.references : [{ text: "" }]);
                    setRefsImportNote(
                      r.warnings.length
                        ? `Imported ${r.references.length} reference(s). Notes: ${r.warnings.slice(0, 4).join("; ")}`
                        : `Imported ${r.references.length} reference(s) from manuscript.`,
                    );
                  });
                }}
              >
                {refsImportBusy ? "Importing…" : "Import from manuscript"}
              </Button>
            ) : null}
            <input
              ref={refsFileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              aria-label="Upload Word document to extract references"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (
                  !confirm(
                    'Replace all reference rows with entries scraped from the "References" section of this .docx file?\n\n' +
                      "The file is not stored — only the extracted list is applied.",
                  )
                ) {
                  return;
                }
                setRefsImportNote(null);
                setRefsImportBusy(true);
                const fd = new FormData();
                fd.append("articleId", props.articleId);
                fd.append("file", file);
                void fetch("/api/articles/import-references-upload", {
                  method: "POST",
                  body: fd,
                  credentials: "same-origin",
                })
                  .then(async (res) => {
                    const j = (await res.json()) as
                      | { ok: true; references: ArticleReferenceRow[]; warnings: string[] }
                      | { ok: false; message: string };
                    setRefsImportBusy(false);
                    if (!res.ok || !j || typeof j !== "object" || !("ok" in j) || !j.ok) {
                      setRefsImportNote(
                        !j || typeof j !== "object" || !("message" in j)
                          ? `Upload failed (${res.status}).`
                          : String((j as { message?: string }).message ?? "Upload failed."),
                      );
                      return;
                    }
                    setReferences(j.references.length ? j.references : [{ text: "" }]);
                    setRefsImportNote(
                      j.warnings.length
                        ? `Imported ${j.references.length} reference(s). Notes: ${j.warnings.slice(0, 4).join("; ")}`
                        : `Imported ${j.references.length} reference(s) from file.`,
                    );
                  })
                  .catch(() => {
                    setRefsImportBusy(false);
                    setRefsImportNote("Upload failed.");
                  });
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refsImportBusy || pending}
              onClick={() => refsFileInputRef.current?.click()}
            >
              Upload .docx
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setReferences((r) => [...r, { text: "" }])}>
              Add reference
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Numbered list order matches in-text citations <code>[1]</code>, <code>[2]</code>, … Use{" "}
          <strong>Import from manuscript</strong> or <strong>Upload .docx</strong> to pull the list under a Word heading
          or a standalone line titled <code>References</code> (bold body text works). Bulleted or numbered lists (
          <code>[1]</code>, <code>1.</code>) and multi-line entries are split automatically. Detected DOIs are saved; the
          public article links DOI, Crossref search, and Google Scholar for each entry.
        </p>
        {refsImportBusy ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2"
          >
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
              <span>
                {refsImportProgressMessage || "Working…"}{" "}
                <span className="tabular-nums text-muted-foreground">({refsImportProgressPercent}%)</span>
              </span>
            </div>
          </div>
        ) : null}
        {refsImportNote ? <p className="mt-2 text-sm text-muted-foreground">{refsImportNote}</p> : null}
        <ul className="mt-4 space-y-4">
          {references.map((row, i) => (
            <li key={i} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Reference {i + 1}</span>
                <div className="flex flex-wrap gap-2">
                  <CopyTextButton label="Copy line" text={row.text} />
                  {references.length > 1 ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setReferences((r) => r.filter((_, j) => j !== i))}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
              <Textarea
                rows={3}
                placeholder="Full reference text (paste from manuscript)"
                value={row.text}
                onChange={(e) => {
                  const v = e.target.value;
                  setReferences((prev) => prev.map((x, j) => (j === i ? { ...x, text: v } : x)));
                }}
              />
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div className="grid gap-1">
                  <Label className="text-xs">DOI (optional)</Label>
                  <Input
                    placeholder="10.xxxx/xxxx"
                    value={row.doi ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setReferences((prev) => prev.map((x, j) => (j === i ? { ...x, doi: v } : x)));
                    }}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Google Scholar URL (optional)</Label>
                  <Input
                    placeholder="https://scholar.google.com/..."
                    value={row.google_scholar_url ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setReferences((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, google_scholar_url: v } : x)),
                      );
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Article body (Markdown)</h2>
          <div className="flex flex-wrap items-center gap-2">
            {props.submissionId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                disabled={importBusy || pending}
                onClick={() => {
                  if (
                    !confirm(
                      "Replace the entire article body with text converted from the latest submission manuscript (.docx)?\n\n" +
                        "• Figures and tables become shortcodes such as {{figure:fig-1}} and {{table:tbl-1}} — add matching assets in “Figures and Tables” below.\n" +
                        "• Superscript and subscript from Word are kept using <sup> and <sub> tags in the Markdown.",
                    )
                  ) {
                    return;
                  }
                  setImportNote(null);
                  setImportBusy(true);
                  setImportProgressPercent(0);
                  setImportProgressMessage("Starting import…");
                  void importManuscriptViaStream(props.articleId, (pct, msg) => {
                    setImportProgressPercent(pct);
                    setImportProgressMessage(msg);
                  }).then((r) => {
                    setImportBusy(false);
                    setImportProgressPercent(0);
                    setImportProgressMessage("");
                    if (!r.ok) {
                      setImportNote(r.message);
                      return;
                    }
                    setMarkdownBody(r.markdown);
                    setImportNote(
                      r.warnings.length
                        ? `Imported. Notes: ${r.warnings.slice(0, 4).join("; ")}`
                        : "Imported from manuscript.",
                    );
                  });
                }}
              >
                {importBusy ? "Importing…" : "Import from manuscript"}
              </Button>
            ) : null}
            <CopyTextButton label="Copy body" text={markdownBody} />
          </div>
        </div>
        {props.submissionId ? (
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>Import from manuscript</strong> reads the latest submission .docx and fills this field. Figures and tables become{" "}
            <code className="rounded bg-muted px-1">{"{{figure:fig-1}}"}</code> / <code className="rounded bg-muted px-1">{"{{table:tbl-1}}"}</code> placeholders — add matching keys under Figures and Tables. Word superscript/subscript are kept as{" "}
            <code className="rounded bg-muted px-1">&lt;sup&gt;</code> / <code className="rounded bg-muted px-1">&lt;sub&gt;</code> in the text.
          </p>
        ) : null}
        {importBusy ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="mt-3 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-3"
          >
            <div className="flex items-start gap-2">
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {importProgressMessage || "Working…"}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Server progress</span>
                  <span className="tabular-nums font-medium text-foreground">{importProgressPercent}%</span>
                </div>
                <div
                  className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-white/80"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={importProgressPercent}
                  aria-label={`Import progress, ${importProgressPercent} percent`}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                    style={{ width: `${importProgressPercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Progress updates when each step completes on the server (download, conversion, validation). Large files may pause longer on one step.
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <Textarea className="mt-3 font-mono text-sm" rows={18} value={markdownBody} onChange={(e) => setMarkdownBody(e.target.value)} />
        <div className="mt-3">
          <Button disabled={pending} onClick={save}>
            {pending ? "Saving..." : "Save draft"}
          </Button>
        </div>
        {importNote ? <p className="mt-2 text-sm text-muted-foreground">{importNote}</p> : null}
        {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
      </section>

      <ArticleAssetManager articleId={props.articleId} versionId={props.versionId} assets={props.assets} />

      <ArticleWorkflowPanel
        articleId={props.articleId}
        versionId={props.versionId}
        workflowStatus={props.workflowStatus}
        manuscriptReferenceCode={props.manuscriptReferenceCode}
      />

      <section className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold">Preview</h2>
        <div className="mt-3 rounded border p-4">
          <ArticlePreview
            abstractMarkdown={abstractText}
            markdownBody={markdownBody}
            assets={props.assets}
            references={refsForPreview}
          />
        </div>
      </section>
    </div>
  );
}
