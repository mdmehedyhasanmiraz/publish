import type { SupabaseClient } from "@supabase/supabase-js";
import { docxBufferToArticleMarkdownBody } from "@/lib/manuscript/docx-to-article-body";
import { markdownToJatsXml } from "@/lib/articles/jats";
import { extractReferenceEntryTexts } from "@/lib/manuscript/references-from-markdown";
import { extractReferenceEntryTextsFromHtml } from "@/lib/manuscript/references-from-html";
import type { PublicArticleAuthorRow } from "@/lib/articles/public-article-authors";

export type ImportManuscriptBodyResult =
  | { ok: true; jatsXml: string; warnings: string[] }
  | { ok: false; message: string };

export type ImportManuscriptProgress = { percent: number; message: string };

const REFERENCES_HEADING = /^#{1,3}\s*references\s*:?\s*\.?\s*$/i;
const ANY_HEADING = /^#{1,3}\s+/;

function stripExistingReferencesSection(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (REFERENCES_HEADING.test(lines[i].trim())) {
      start = i;
      break;
    }
  }
  if (start < 0) return markdown.trim();

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (ANY_HEADING.test(lines[i].trim())) {
      end = i;
      break;
    }
  }

  const before = lines.slice(0, start).join("\n").trim();
  const after = lines.slice(end).join("\n").trim();
  if (before && after) return `${before}\n\n${after}`.trim();
  return (before || after).trim();
}

function injectReferencesIntoMarkdown(markdown: string, referenceEntries: string[]): string {
  if (!referenceEntries.length) return markdown.trim();
  const body = stripExistingReferencesSection(markdown);
  const refBlock = [
    "## References",
    "",
    ...referenceEntries.map((entry, idx) => `[${idx + 1}] ${entry.trim()}`),
  ].join("\n");
  return body ? `${body}\n\n${refBlock}` : refBlock;
}

/**
 * Loads the submission’s latest .docx and converts it to article JATS XML.
 * `onProgress` is invoked at real phase boundaries (DB, storage, conversion).
 */
export async function runImportArticleBodyFromSubmission(
  supabase: SupabaseClient,
  articleId: string,
  onProgress?: (p: ImportManuscriptProgress) => void,
): Promise<ImportManuscriptBodyResult> {
  const p = (percent: number, message: string) => onProgress?.({ percent, message });

  p(4, "Loading article and submission…");

  const { data: article, error: aErr } = await supabase
    .from("articles")
    .select("id, submission_id")
    .eq("id", articleId)
    .maybeSingle();
  if (aErr || !article?.submission_id) {
    return { ok: false, message: "This article is not linked to a submission with manuscript files." };
  }
  const submissionId = article.submission_id as string;
  const { data: subMeta } = await supabase
    .from("submissions")
    .select("author_affiliations")
    .eq("id", submissionId)
    .maybeSingle();
  const manuscriptAuthors: PublicArticleAuthorRow[] = Array.isArray(subMeta?.author_affiliations)
    ? (subMeta.author_affiliations as PublicArticleAuthorRow[])
    : [];

  p(12, "Finding latest manuscript file…");

  const { data: files } = await supabase
    .from("submission_files")
    .select("storage_path, file_kind, mime_type")
    .eq("submission_id", submissionId)
    .in("file_kind", ["manuscript", "blinded_manuscript"])
    .order("id", { ascending: false })
    .limit(1);

  const file = files?.[0];
  if (!file?.storage_path) {
    return { ok: false, message: "No manuscript or blinded manuscript file found for this submission." };
  }

  const path = file.storage_path as string;
  const lower = path.toLowerCase();
  const mime = String(file.mime_type ?? "").toLowerCase();
  const isDocx =
    lower.endsWith(".docx") ||
    mime.includes("wordprocessingml") ||
    mime.includes("officedocument.wordprocessingml");
  if (!isDocx) {
    return {
      ok: false,
      message: "Import supports .docx only. Convert the manuscript to Word .docx and re-upload if needed.",
    };
  }

  p(24, "Downloading manuscript from storage…");

  const { data: blob, error: dlErr } = await supabase.storage.from("data").download(path);
  if (dlErr || !blob) {
    return { ok: false, message: dlErr?.message ?? "Could not download manuscript file." };
  }

  p(40, "Reading file into memory…");

  const buf = await blob.arrayBuffer();

  try {
    const { markdown, html, warnings: conversionWarnings } = await docxBufferToArticleMarkdownBody(buf, {
      onPhase: (phase) => {
        if (phase === "word_to_html") {
          p(52, "Converting Word document to HTML…");
        } else if (phase === "html_to_markdown") {
          p(72, "Building JATS XML body…");
        }
      },
    });
    if (!markdown.trim()) {
      return { ok: false, message: "No body text could be extracted from the DOCX." };
    }
    p(80, 'Extracting "References" section…');
    let { entries: referenceEntries, warnings: referenceWarnings } = extractReferenceEntryTexts(markdown);
    if (!referenceEntries.length && html.trim()) {
      const fromHtml = extractReferenceEntryTextsFromHtml(html);
      if (fromHtml.entries.length) {
        referenceEntries = fromHtml.entries;
        referenceWarnings = [...referenceWarnings, ...fromHtml.warnings];
      }
    }
    const markdownWithReferences = injectReferencesIntoMarkdown(markdown, referenceEntries);

    p(86, "Saving JATS XML…");
    const { data: cur } = await supabase
      .from("articles")
      .select("current_version_id, title, abstract")
      .eq("id", articleId)
      .maybeSingle();
    const versionId = (cur?.current_version_id as string | null) ?? null;
    let jatsXml = "";
    if (versionId) {
      const title = String(cur?.title ?? "").trim() || "Untitled";
      const abstract = cur?.abstract ? String(cur.abstract).trim() : null;
      jatsXml = markdownToJatsXml({
        title,
        abstract,
        markdownBody: markdownWithReferences,
        authors: manuscriptAuthors,
      });
      await supabase.from("article_versions").update({ jats_xml: jatsXml }).eq("id", versionId).eq("article_id", articleId);
    } else {
      jatsXml = markdownToJatsXml({
        title: "Untitled",
        abstract: null,
        markdownBody: markdownWithReferences,
        authors: manuscriptAuthors,
      });
    }
    p(94, "Validating extracted text…");
    p(100, "Import complete.");
    return { ok: true, jatsXml, warnings: [...conversionWarnings, ...referenceWarnings] };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not convert DOCX." };
  }
}
