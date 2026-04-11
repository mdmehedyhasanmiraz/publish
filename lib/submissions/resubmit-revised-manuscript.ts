import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubmissionStatus } from "@/lib/types/domain";
import { assertTransition } from "@/lib/workflows/submission-machine";

export type ResubmitRevisionResult = { ok: true; message?: string } | { ok: false; message: string };

/**
 * Author uploads a new version while status is `revision_requested`, then submits for editorial review again.
 */
export async function resubmitRevisedManuscript(
  supabase: SupabaseClient,
  userId: string,
  submissionId: string,
): Promise<ResubmitRevisionResult> {
  const { data: current, error } = await supabase
    .from("submissions")
    .select("id, status, owner_user_id, author_affiliations")
    .eq("id", submissionId)
    .single();

  if (error || !current) return { ok: false, message: "Submission not found." };
  if (current.owner_user_id !== userId) return { ok: false, message: "Not allowed." };

  if (current.status !== "revision_requested") {
    return { ok: false, message: "A resubmission is only available when revision has been requested." };
  }

  try {
    assertTransition(current.status as SubmissionStatus, "revised_submission");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Invalid transition." };
  }

  const aff = current.author_affiliations as unknown;
  if (Array.isArray(aff)) {
    const n = aff.filter((a: { is_corresponding_author?: boolean }) => Boolean(a?.is_corresponding_author)).length;
    if (n < 1) {
      return { ok: false, message: "Select at least one corresponding author before resubmitting." };
    }
  } else {
    return { ok: false, message: "Author information is missing; open step 3 and save." };
  }

  const { data: latestVer } = await supabase
    .from("submission_versions")
    .select("id")
    .eq("submission_id", submissionId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestVer?.id) {
    return { ok: false, message: "No submission version found." };
  }

  const { data: manuscriptFiles } = await supabase
    .from("submission_files")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("submission_version_id", latestVer.id)
    .in("file_kind", ["manuscript", "blinded_manuscript"])
    .limit(1);

  if (!manuscriptFiles?.length) {
    return {
      ok: false,
      message: "Upload a manuscript (or blinded manuscript) for this revision before resubmitting.",
    };
  }

  const { error: upErr } = await supabase
    .from("submissions")
    .update({ status: "revised_submission" })
    .eq("id", submissionId);

  if (upErr) return { ok: false, message: upErr.message };

  return { ok: true, message: "Revision submitted. The editorial office will review your updated files." };
}
