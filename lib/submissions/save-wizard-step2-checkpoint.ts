import type { SupabaseClient } from "@supabase/supabase-js";

export type SaveWizardStep2Result = { ok: true; message?: string } | { ok: false; message: string };

/** Confirms the draft exists and is editable; files are persisted separately on upload. */
export async function saveWizardStep2Checkpoint(
  supabase: SupabaseClient,
  userId: string,
  submissionId: string,
): Promise<SaveWizardStep2Result> {
  const sid = submissionId.trim();
  if (!sid) return { ok: false, message: "Missing submission." };

  const { data: row, error } = await supabase
    .from("submissions")
    .select("id, owner_user_id, status")
    .eq("id", sid)
    .single();
  if (error || !row) return { ok: false, message: "Submission not found." };
  if (row.owner_user_id !== userId) return { ok: false, message: "Not allowed." };
  if (row.status !== "draft" && row.status !== "revision_requested") {
    return { ok: false, message: "Only draft or revision-in-progress submissions can be edited here." };
  }

  return { ok: true, message: "Step 2 saved. Continue to authors." };
}
