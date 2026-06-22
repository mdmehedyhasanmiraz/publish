"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { xml } from "@codemirror/lang-xml";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  publishArticleVersionAction,
  saveArticleVersionAction,
  unpublishArticleAction,
} from "@/lib/actions/article";
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
import { jatsXmlToMarkdown } from "@/lib/articles/jats";

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
  | { ok: true; jatsXml: string; warnings: string[] }
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
    | { ok: true; jatsXml: string; warnings: string[] }
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
        if (msg.ok === true && typeof msg.jatsXml === "string" && Array.isArray(msg.warnings)) {
          outcome = { ok: true, jatsXml: msg.jatsXml, warnings: msg.warnings as string[] };
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

function prettyPrintXml(raw: string): string {
  if (!raw.trim()) return raw;
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "application/xml");
  if (doc.querySelector("parsererror")) return raw;
  const INDENT = "  ";
  const escapeText = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const pad = (n: number) => INDENT.repeat(Math.max(0, n));

  const formatNode = (node: Node, level: number): string[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.nodeValue ?? "").trim();
      return text ? [`${pad(level)}${escapeText(text)}`] : [];
    }
    if (node.nodeType === Node.COMMENT_NODE) {
      const text = (node.nodeValue ?? "").trim();
      return [`${pad(level)}<!-- ${text} -->`];
    }
    if (node.nodeType === Node.CDATA_SECTION_NODE) {
      return [`${pad(level)}<![CDATA[${node.nodeValue ?? ""}]]>`];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const el = node as Element;
    const attrs = Array.from(el.attributes)
      .map((a) => ` ${a.name}="${a.value}"`)
      .join("");
    const open = `<${el.tagName}${attrs}>`;
    const close = `</${el.tagName}>`;
    const children = Array.from(el.childNodes);

    if (children.length === 0) {
      return [`${pad(level)}<${el.tagName}${attrs}/>`];
    }

    if (
      children.length === 1 &&
      children[0]?.nodeType === Node.TEXT_NODE &&
      (children[0].nodeValue ?? "").trim()
    ) {
      const text = escapeText((children[0].nodeValue ?? "").trim());
      return [`${pad(level)}${open}${text}${close}`];
    }

    const out = [`${pad(level)}${open}`];
    for (const child of children) out.push(...formatNode(child, level + 1));
    out.push(`${pad(level)}${close}`);
    return out;
  };

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  const dt = doc.doctype;
  if (dt) {
    if (dt.publicId) {
      lines.push(`<!DOCTYPE ${dt.name} PUBLIC "${dt.publicId}" "${dt.systemId}">`);
    } else if (dt.systemId) {
      lines.push(`<!DOCTYPE ${dt.name} SYSTEM "${dt.systemId}">`);
    } else {
      lines.push(`<!DOCTYPE ${dt.name}>`);
    }
  }
  if (doc.documentElement) {
    lines.push(...formatNode(doc.documentElement, 0));
  }
  return lines.join("\n").trim();
}

export function ArticleEditorForm(props: {
  articleId: string;
  versionId: string;
  initialTitle: string;
  initialAbstract: string;
  initialDoi: string;
  initialKeywords: string[];
  initialJatsXmlBody: string;
  initialIssueId: string | null;
  workflowStatus: string;
  issueOptions: IssueOption[];
  assets: Asset[];
  submissionId?: string | null;
  submissionFiles?: SubmissionFileRow[];
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
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState(props.initialTitle);
  const [abstractText, setAbstractText] = useState(props.initialAbstract);
  const [doi, setDoi] = useState(props.initialDoi);
  const [keywordsCsv, setKeywordsCsv] = useState((props.initialKeywords ?? []).join(", "));
  const [jatsXmlBody, setJatsXmlBody] = useState(props.initialJatsXmlBody);
  const [issueId, setIssueId] = useState(props.initialIssueId ?? "");

  function save() {
    startTransition(async () => {
      const res = await saveArticleVersionAction({
        articleId: props.articleId,
        versionId: props.versionId,
        title,
        abstract: abstractText,
        doi,
        keywordsCsv,
        jatsXmlBody,
        issueId: issueId || null,
      });
      setMessage(res.message ?? (res.ok ? "Saved." : "Could not save."));
    });
  }

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
                disabled={pending || publishPending || unpublishPending || importBusy}
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
                  disabled={unpublishPending || publishPending || importBusy}
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
            disabled={pending || publishPending || importBusy}
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
        <p className="mt-1 text-sm text-muted-foreground">Edit the core article body as raw JATS XML.</p>
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
              <Label>Abstract</Label>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Article body (JATS XML)</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setJatsXmlBody((prev) => prettyPrintXml(prev))}
            >
              Pretty print XML
            </Button>
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
                      "Replace the entire article XML body with JATS converted from the latest submission manuscript (.docx)?\n\n" +
                        "• Figures and tables become shortcodes such as {{figure:fig-1}} and {{table:tbl-1}} — add matching assets in “Figures and Tables” below.\n" +
                        "• Superscript and subscript from Word are kept using <sup> and <sub> tags.",
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
                    setJatsXmlBody(prettyPrintXml(r.jatsXml));
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
            <CopyTextButton label="Copy XML" text={jatsXmlBody} />
          </div>
        </div>
        {props.submissionId ? (
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>Import from manuscript</strong> reads the latest submission .docx and fills this field with JATS XML. Figures and tables become{" "}
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
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-700">
          <CodeMirror
            value={jatsXmlBody}
            height="520px"
            theme={oneDark}
            extensions={[xml()]}
            onChange={(value) => setJatsXmlBody(value)}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              autocompletion: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
            }}
          />
        </div>
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
            markdownBody={jatsXmlToMarkdown(jatsXmlBody)}
            assets={props.assets}
          />
        </div>
      </section>
    </div>
  );
}
