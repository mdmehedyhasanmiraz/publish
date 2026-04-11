import type { SupabaseClient } from "@supabase/supabase-js";

export type ExtractManuscriptMetadataResult =
  | {
      ok: true;
      title?: string;
      abstract?: string;
      skipped?: boolean;
      reason?: "no_file" | "unsupported_format" | "empty";
      message?: string;
    }
  | { ok: false; message: string };

export async function extractSubmissionManuscriptMetadata(
  supabase: SupabaseClient,
  userId: string,
  submissionId: string,
): Promise<ExtractManuscriptMetadataResult> {
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("id, owner_user_id")
    .eq("id", submissionId)
    .single();
  if (subErr || !submission || submission.owner_user_id !== userId) {
    return { ok: false, message: "Not allowed." };
  }

  const { data: files } = await supabase
    .from("submission_files")
    .select("id, storage_path, file_kind, mime_type")
    .eq("submission_id", submissionId)
    .in("file_kind", ["manuscript", "blinded_manuscript"])
    .order("id", { ascending: false })
    .limit(1);

  const file = files?.[0];
  if (!file?.storage_path) {
    return {
      ok: true,
      skipped: true,
      reason: "no_file",
      message: "No manuscript file found. Upload a manuscript in step 2.",
    };
  }

  const path = file.storage_path as string;
  const lower = path.toLowerCase();
  const mime = String(file.mime_type ?? "").toLowerCase();
  const isDocx =
    lower.endsWith(".docx") ||
    mime.includes("wordprocessingml") ||
    mime.includes("officedocument.wordprocessingml");
  const looksLegacyDoc = lower.endsWith(".doc") && !isDocx;

  if (looksLegacyDoc || (mime.includes("msword") && !mime.includes("openxml") && !isDocx)) {
    return {
      ok: true,
      skipped: true,
      reason: "unsupported_format",
      message:
        "Automatic extraction supports DOCX only. Convert to .docx or type the title and abstract manually.",
    };
  }

  if (!isDocx) {
    return {
      ok: true,
      skipped: true,
      reason: "unsupported_format",
      message: "Use a .docx manuscript file for automatic title and abstract extraction.",
    };
  }

  const { data: blob, error: dlErr } = await supabase.storage.from("data").download(path);
  if (dlErr || !blob) {
    return { ok: false, message: dlErr?.message ?? "Could not download manuscript file." };
  }

  const buf = await blob.arrayBuffer();
  const { extractPlainTextFromDocxBuffer } = await import("@/lib/manuscript/extract-docx-text");
  const { parseTitleAndAbstractFromPlainText } = await import("@/lib/manuscript/parse-title-abstract");

  let plain: string;
  try {
    const { text } = await extractPlainTextFromDocxBuffer(buf);
    plain = text;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not read DOCX file." };
  }

  if (!plain.trim()) {
    return {
      ok: true,
      skipped: true,
      reason: "empty",
      message: "No text could be extracted from the manuscript file.",
    };
  }

  const { title, abstract } = parseTitleAndAbstractFromPlainText(plain);
  if (!title.trim() && !abstract.trim()) {
    return {
      ok: true,
      skipped: true,
      reason: "empty",
      message: "Could not detect a title or abstract. Edit the fields manually.",
    };
  }

  return { ok: true, title, abstract };
}
