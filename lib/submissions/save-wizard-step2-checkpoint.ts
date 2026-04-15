import type { SupabaseClient } from "@supabase/supabase-js";
import { extractSubmissionManuscriptMetadata } from "@/lib/submissions/extract-submission-manuscript-metadata";

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

  const metadata = await extractSubmissionManuscriptMetadata(supabase, userId, sid);
  if (!metadata.ok) {
    return { ok: false, message: metadata.message };
  }
  if (!metadata.skipped && Array.isArray(metadata.authors) && metadata.authors.length > 0) {
    return {
      ok: false,
      message:
        "Double-blind policy violation: author names were detected in the manuscript. Please remove author-identifying details and upload a blinded manuscript before continuing.",
    };
  }

  const { data: authorDetailsFile } = await supabase
    .from("submission_files")
    .select("id")
    .eq("submission_id", sid)
    .eq("file_kind", "author_details")
    .order("id", { ascending: false })
    .limit(1);

  if (!authorDetailsFile?.length) {
    return {
      ok: false,
      message:
        "Upload an author details file before continuing. Use the template (Name, Affiliations separated by ';', Email).",
    };
  }

  return { ok: true, message: "Step 2 saved. Continue to authors." };
}
