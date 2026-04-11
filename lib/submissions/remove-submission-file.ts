import type { SupabaseClient } from "@supabase/supabase-js";

export type RemoveFileResult = { ok: true; message?: string; submissionId?: string } | { ok: false; message: string };

export async function removeSubmissionFile(
  supabase: SupabaseClient,
  userId: string,
  input: { fileId: string; storagePath: string },
): Promise<RemoveFileResult> {
  const { data: fileRow, error: fileErr } = await supabase
    .from("submission_files")
    .select("id, submission_id")
    .eq("id", input.fileId)
    .single();
  if (fileErr || !fileRow) return { ok: false, message: "File not found." };

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("id, owner_user_id")
    .eq("id", fileRow.submission_id)
    .single();
  if (subErr || !submission || submission.owner_user_id !== userId) {
    return { ok: false, message: "Not allowed." };
  }

  const { error: storageErr } = await supabase.storage.from("data").remove([input.storagePath]);
  if (storageErr) return { ok: false, message: storageErr.message };

  const { error: deleteErr } = await supabase.from("submission_files").delete().eq("id", input.fileId);
  if (deleteErr) return { ok: false, message: deleteErr.message };

  return { ok: true, message: "File removed.", submissionId: submission.id as string };
}
