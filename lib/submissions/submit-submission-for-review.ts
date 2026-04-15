import type { SupabaseClient } from "@supabase/supabase-js";
import { assertTransition } from "@/lib/workflows/submission-machine";
import { extractSubmissionManuscriptMetadata } from "@/lib/submissions/extract-submission-manuscript-metadata";
import type { WizardAuthorRow } from "@/lib/submissions/wizard-author-types";

export type SubmitSubmissionForReviewResult = { ok: true; message?: string } | { ok: false; message: string };

export async function submitSubmissionForReview(
  supabase: SupabaseClient,
  userId: string,
  submissionId: string,
): Promise<SubmitSubmissionForReviewResult> {
  const { data: current, error } = await supabase
    .from("submissions")
    .select("id, status, owner_user_id, author_affiliations")
    .eq("id", submissionId)
    .single();

  if (error || !current) return { ok: false, message: "Submission not found." };
  if (current.owner_user_id !== userId) return { ok: false, message: "Not allowed." };

  try {
    assertTransition(current.status, "submitted");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Invalid transition." };
  }

  const aff = current.author_affiliations as WizardAuthorRow[] | null | undefined;
  if (Array.isArray(aff)) {
    const n = aff.filter((a) => Boolean(a?.is_corresponding_author)).length;
    if (n > 3) {
      return { ok: false, message: "At most 3 corresponding authors are allowed. Edit authors in step 3." };
    }
    if (n < 1) {
      return { ok: false, message: "Select at least one corresponding author in step 3 before submitting." };
    }
  } else {
    return { ok: false, message: "Add author information in step 3 before submitting." };
  }

  const metadata = await extractSubmissionManuscriptMetadata(supabase, userId, submissionId);
  if (!metadata.ok) {
    return { ok: false, message: metadata.message };
  }
  if (!metadata.skipped && Array.isArray(metadata.authors) && metadata.authors.length > 0) {
    return {
      ok: false,
      message:
        "Double-blind policy violation: author names were detected in the manuscript. Upload a blinded manuscript before submitting.",
    };
  }

  const { error: upErr } = await supabase.from("submissions").update({ status: "submitted" }).eq("id", submissionId);

  if (upErr) return { ok: false, message: upErr.message };

  return { ok: true, message: "Submitted for editorial review." };
}
