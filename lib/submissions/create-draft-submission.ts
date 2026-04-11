import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateDraftResult =
  | { ok: true; submissionId: string; message?: string }
  | { ok: false; message: string };

export async function createDraftSubmission(
  supabase: SupabaseClient,
  userId: string,
  input: {
    journalId: string;
    title: string;
    abstract: string;
    area: string;
    submissionType: string;
  },
): Promise<CreateDraftResult> {
  const journalId = input.journalId.trim();
  const area = input.area.trim();
  const submissionType = input.submissionType.trim();
  const title = input.title.trim() || "Untitled submission";
  const abstract = input.abstract.trim();

  if (!journalId || !area || !submissionType) {
    return { ok: false, message: "Journal, area/field, and submission type are required." };
  }

  const insertRow: Record<string, unknown> = {
    journal_id: journalId,
    owner_user_id: userId,
    title,
    abstract: abstract || null,
    area,
    submission_type: submissionType,
    status: "draft",
  };

  const { data: submission, error: subError } = await supabase
    .from("submissions")
    .insert(insertRow)
    .select("id")
    .single();

  if (subError || !submission) {
    return { ok: false, message: subError?.message ?? "Could not create submission." };
  }

  const { error: verError } = await supabase.from("submission_versions").insert({
    submission_id: submission.id,
    version_number: 1,
    created_by: userId,
  });

  if (verError) {
    return { ok: false, message: verError.message };
  }

  return {
    ok: true,
    submissionId: submission.id as string,
    message: "Draft saved. You can add files and submit when ready.",
  };
}
