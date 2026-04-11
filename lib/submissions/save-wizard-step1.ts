import type { SupabaseClient } from "@supabase/supabase-js";
import { createDraftSubmission } from "@/lib/submissions/create-draft-submission";

export type SaveWizardStep1Result =
  | { ok: true; submissionId: string; message?: string; created: boolean }
  | { ok: false; message: string };

export async function saveWizardStep1(
  supabase: SupabaseClient,
  userId: string,
  input: {
    submissionId: string | null | undefined;
    journalId: string;
    title: string;
    abstract: string;
    area: string;
    submissionType: string;
  },
): Promise<SaveWizardStep1Result> {
  const journalId = input.journalId.trim();
  const area = input.area.trim();
  const submissionType = input.submissionType.trim();
  const title = input.title.trim() || "Untitled submission";
  const abstract = input.abstract.trim();

  if (!journalId || !area || !submissionType) {
    return { ok: false, message: "Journal, area/field, and submission type are required." };
  }

  const existingId = input.submissionId?.trim();
  if (existingId) {
    const { data: row, error: fetchErr } = await supabase
      .from("submissions")
      .select("id, owner_user_id, status")
      .eq("id", existingId)
      .single();
    if (fetchErr || !row) return { ok: false, message: "Submission not found." };
    if (row.owner_user_id !== userId) return { ok: false, message: "Not allowed." };
    if (row.status !== "draft" && row.status !== "revision_requested") {
      return { ok: false, message: "Only draft or revision-in-progress submissions can be edited here." };
    }

    const { error: upErr } = await supabase
      .from("submissions")
      .update({
        journal_id: journalId,
        area,
        submission_type: submissionType,
        title,
        abstract: abstract || null,
      })
      .eq("id", existingId);
    if (upErr) return { ok: false, message: upErr.message };

    return { ok: true, submissionId: existingId, message: "Step 1 saved.", created: false };
  }

  const created = await createDraftSubmission(supabase, userId, {
    journalId,
    title,
    abstract,
    area,
    submissionType,
  });
  if (!created.ok) return created;

  return {
    ok: true,
    submissionId: created.submissionId,
    message: created.message ?? "Draft created.",
    created: true,
  };
}
