import type { SupabaseClient } from "@supabase/supabase-js";

export type DeleteDraftResult = { ok: true; message?: string } | { ok: false; message: string };

export async function deleteDraftSubmission(
  supabase: SupabaseClient,
  userId: string,
  submissionId: string,
): Promise<DeleteDraftResult> {
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("id, owner_user_id, status")
    .eq("id", submissionId)
    .single();
  if (subErr || !submission) return { ok: false, message: "Submission not found." };
  if (submission.owner_user_id !== userId) return { ok: false, message: "Not allowed." };

  if (submission.status !== "draft") {
    return { ok: false, message: "Only draft submissions can be deleted." };
  }

  const { data: files } = await supabase
    .from("submission_files")
    .select("storage_path")
    .eq("submission_id", submissionId);

  const paths = (files ?? []).map((f) => String(f.storage_path ?? "")).filter(Boolean);
  if (paths.length) {
    const { error: storageErr } = await supabase.storage.from("data").remove(paths);
    if (storageErr) return { ok: false, message: storageErr.message };
  }

  const { error } = await supabase.from("submissions").delete().eq("id", submissionId);
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Submission deleted." };
}
