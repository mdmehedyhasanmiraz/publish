import type { SupabaseClient } from "@supabase/supabase-js";

export type RegisterFileResult =
  | { ok: true; message?: string; fileId?: string }
  | { ok: false; message: string };

export async function registerSubmissionFile(
  supabase: SupabaseClient,
  userId: string,
  input: {
    submissionId: string;
    submissionVersionId: string;
    fileKind: string;
    storagePath: string;
    mimeType: string | null;
    description?: string;
  },
): Promise<RegisterFileResult> {
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("id, journal_id, owner_user_id")
    .eq("id", input.submissionId)
    .single();

  if (subErr || !submission) return { ok: false, message: "Submission not found." };
  if (submission.owner_user_id !== userId) return { ok: false, message: "Not allowed." };

  const { data: version, error: verErr } = await supabase
    .from("submission_versions")
    .select("id")
    .eq("id", input.submissionVersionId)
    .eq("submission_id", input.submissionId)
    .single();

  if (verErr || !version) return { ok: false, message: "Submission version not found." };

  const { data: inserted, error: insErr } = await supabase
    .from("submission_files")
    .insert({
      journal_id: submission.journal_id,
      submission_id: input.submissionId,
      submission_version_id: input.submissionVersionId,
      file_kind: input.fileKind,
      description: input.description?.trim() || null,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
    })
    .select("id")
    .single();

  if (insErr) return { ok: false, message: insErr.message };

  return { ok: true, message: "File registered.", fileId: inserted?.id as string | undefined };
}
