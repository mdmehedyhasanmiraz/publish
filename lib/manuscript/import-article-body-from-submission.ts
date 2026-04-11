import type { SupabaseClient } from "@supabase/supabase-js";
import { docxBufferToArticleMarkdownBody } from "@/lib/manuscript/docx-to-article-body";

export type ImportManuscriptBodyResult =
  | { ok: true; markdown: string; warnings: string[] }
  | { ok: false; message: string };

export type ImportManuscriptProgress = { percent: number; message: string };

/**
 * Loads the submission’s latest .docx and converts it to article Markdown.
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
    const { markdown, warnings } = await docxBufferToArticleMarkdownBody(buf, {
      onPhase: (phase) => {
        if (phase === "word_to_html") {
          p(52, "Converting Word document to HTML…");
        } else if (phase === "html_to_markdown") {
          p(72, "Building Markdown (headings, figures, tables)…");
        }
      },
    });
    if (!markdown.trim()) {
      return { ok: false, message: "No body text could be extracted from the DOCX." };
    }
    p(94, "Validating extracted text…");
    p(100, "Import complete.");
    return { ok: true, markdown, warnings };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not convert DOCX." };
  }
}
