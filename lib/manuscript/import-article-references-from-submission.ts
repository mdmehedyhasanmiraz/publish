import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArticleReferenceRow } from "@/lib/articles/extra-metadata";
import { docxBufferToArticleMarkdownBody } from "@/lib/manuscript/docx-to-article-body";
import { extractReferenceEntryTextsFromHtml } from "@/lib/manuscript/references-from-html";
import {
  enrichReferenceRowsFromTexts,
  extractReferenceEntryTexts,
} from "@/lib/manuscript/references-from-markdown";

const EMPTY_REFS_WARNING = 'Found a "References" heading but no entries below it.';
const NO_REFS_SECTION_PREFIX = 'No "References" section was found.';

export type ImportArticleReferencesResult =
  | { ok: true; references: ArticleReferenceRow[]; warnings: string[] }
  | { ok: false; message: string };

export type ImportManuscriptProgress = { percent: number; message: string };

export async function runImportArticleReferencesFromSubmission(
  supabase: SupabaseClient,
  articleId: string,
  onProgress?: (p: ImportManuscriptProgress) => void,
): Promise<ImportArticleReferencesResult> {
  const p = (percent: number, message: string) => onProgress?.({ percent, message });

  p(5, "Loading article and submission…");

  const { data: article, error: aErr } = await supabase
    .from("articles")
    .select("id, submission_id")
    .eq("id", articleId)
    .maybeSingle();
  if (aErr || !article?.submission_id) {
    return { ok: false, message: "This article is not linked to a submission with manuscript files." };
  }
  const submissionId = article.submission_id as string;

  p(15, "Finding latest manuscript file…");

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
      message: "Reference import supports .docx only. Convert the manuscript to Word .docx and re-upload if needed.",
    };
  }

  p(28, "Downloading manuscript from storage…");

  const { data: blob, error: dlErr } = await supabase.storage.from("data").download(path);
  if (dlErr || !blob) {
    return { ok: false, message: dlErr?.message ?? "Could not download manuscript file." };
  }

  p(42, "Reading file into memory…");
  const buf = await blob.arrayBuffer();

  try {
    const { markdown, html, warnings: convWarnings } = await docxBufferToArticleMarkdownBody(buf, {
      onPhase: (phase) => {
        if (phase === "word_to_html") {
          p(55, "Converting Word document to HTML…");
        } else if (phase === "html_to_markdown") {
          p(72, "Building Markdown…");
        }
      },
    });

    p(82, 'Finding "References" section…');
    let { entries, warnings: extractWarnings } = extractReferenceEntryTexts(markdown);
    if (!entries.length && html.trim()) {
      const fromHtml = extractReferenceEntryTextsFromHtml(html);
      if (fromHtml.entries.length) {
        entries = fromHtml.entries;
        extractWarnings = extractWarnings.filter(
          (w) => w !== EMPTY_REFS_WARNING && !w.startsWith(NO_REFS_SECTION_PREFIX),
        );
        extractWarnings.push(
          ...fromHtml.warnings,
          "Recovered references from Word HTML (layout was not plain paragraphs under References).",
        );
      }
    }
    const mergedWarnings = [...convWarnings, ...extractWarnings];

    if (!entries.length) {
      const msg =
        extractWarnings[0] ??
        'No references could be extracted. Add a "References" heading in the manuscript and try again.';
      return { ok: false, message: msg };
    }

    p(92, "Building reference list…");
    const references = enrichReferenceRowsFromTexts(entries);
    p(100, "Done.");
    return { ok: true, references, warnings: mergedWarnings };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not convert DOCX." };
  }
}

export async function importArticleReferencesFromDocxBuffer(
  buffer: ArrayBuffer,
  onProgress?: (p: ImportManuscriptProgress) => void,
): Promise<ImportArticleReferencesResult> {
  const p = (percent: number, message: string) => onProgress?.({ percent, message });
  p(20, "Converting document…");
  try {
    const { markdown, html, warnings: convWarnings } = await docxBufferToArticleMarkdownBody(buffer, {
      onPhase: (phase) => {
        if (phase === "word_to_html") p(35, "Converting Word to HTML…");
        else if (phase === "html_to_markdown") p(55, "Extracting text…");
      },
    });
    p(75, 'Finding "References" section…');
    let { entries, warnings: extractWarnings } = extractReferenceEntryTexts(markdown);
    if (!entries.length && html.trim()) {
      const fromHtml = extractReferenceEntryTextsFromHtml(html);
      if (fromHtml.entries.length) {
        entries = fromHtml.entries;
        extractWarnings = extractWarnings.filter(
          (w) => w !== EMPTY_REFS_WARNING && !w.startsWith(NO_REFS_SECTION_PREFIX),
        );
        extractWarnings.push(
          ...fromHtml.warnings,
          "Recovered references from Word HTML (layout was not plain paragraphs under References).",
        );
      }
    }
    const mergedWarnings = [...convWarnings, ...extractWarnings];
    if (!entries.length) {
      const msg =
        extractWarnings[0] ??
        'No references could be extracted. Add a "References" heading in the document and try again.';
      return { ok: false, message: msg };
    }
    p(90, "Building reference list…");
    const references = enrichReferenceRowsFromTexts(entries);
    p(100, "Done.");
    return { ok: true, references, warnings: mergedWarnings };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not convert DOCX." };
  }
}
