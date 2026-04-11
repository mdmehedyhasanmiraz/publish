import type { SupabaseClient } from "@supabase/supabase-js";

export type SaveWizardStep4Result = { ok: true; message?: string } | { ok: false; message: string };

export async function saveWizardStep4Details(
  supabase: SupabaseClient,
  userId: string,
  input: {
    submissionId: string;
    title: string;
    abstract: string;
    supplementaryDataLink: string;
    submissionNotes: string;
  },
): Promise<SaveWizardStep4Result> {
  const { data: current } = await supabase
    .from("submissions")
    .select("id, owner_user_id")
    .eq("id", input.submissionId)
    .single();
  if (!current || current.owner_user_id !== userId) return { ok: false, message: "Not allowed." };

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) return { ok: false, message: "Title is required." };

  const { error } = await supabase
    .from("submissions")
    .update({
      title: trimmedTitle,
      abstract: input.abstract.trim() || null,
      supplementary_data_link: input.supplementaryDataLink.trim() || null,
      submission_notes: input.submissionNotes.trim() || null,
    })
    .eq("id", input.submissionId);
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Submission details saved." };
}
