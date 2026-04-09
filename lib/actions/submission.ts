"use server";

import { createClient } from "@/lib/supabase/server";
import { getPublisherId } from "@/lib/db/publisher-context";
import { revalidatePath } from "next/cache";
import { assertTransition } from "@/lib/workflows/submission-machine";

export type SubmissionActionState = { ok: boolean; message?: string; submissionId?: string };
export type RegisterSubmissionFileResult = { ok: boolean; message?: string };
export type SubmitSubmissionResult = { ok: boolean; message?: string };

export async function createSubmissionAction(
  _prev: SubmissionActionState | undefined,
  formData: FormData,
): Promise<SubmissionActionState> {
  const journalId = String(formData.get("journal_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const abstract = String(formData.get("abstract") ?? "").trim();

  if (!journalId || !title) {
    return { ok: false, message: "Journal and title are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "You must be signed in to submit." };
  }

  const publisherId = await getPublisherId();
  const insertRow: Record<string, unknown> = {
    journal_id: journalId,
    owner_user_id: user.id,
    title,
    abstract: abstract || null,
    status: "draft",
  };
  if (publisherId) insertRow.publisher_id = publisherId;

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
    created_by: user.id,
  });

  if (verError) {
    return { ok: false, message: verError.message };
  }

  revalidatePath("/dashboard/submissions");
  return { ok: true, submissionId: submission.id, message: "Draft saved. You can add files and submit when ready." };
}

export async function registerSubmissionFileAction(input: {
  submissionId: string;
  submissionVersionId: string;
  fileKind: string;
  storagePath: string;
  mimeType: string | null;
}): Promise<RegisterSubmissionFileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "You must be signed in." };

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("id, publisher_id, journal_id, owner_user_id")
    .eq("id", input.submissionId)
    .single();

  if (subErr || !submission) return { ok: false, message: "Submission not found." };
  if (submission.owner_user_id !== user.id) return { ok: false, message: "Not allowed." };

  const { data: version, error: verErr } = await supabase
    .from("submission_versions")
    .select("id")
    .eq("id", input.submissionVersionId)
    .eq("submission_id", input.submissionId)
    .single();

  if (verErr || !version) return { ok: false, message: "Submission version not found." };

  const { error: insErr } = await supabase.from("submission_files").insert({
    publisher_id: submission.publisher_id,
    journal_id: submission.journal_id,
    submission_id: input.submissionId,
    submission_version_id: input.submissionVersionId,
    file_kind: input.fileKind,
    storage_path: input.storagePath,
    mime_type: input.mimeType,
  });

  if (insErr) return { ok: false, message: insErr.message };

  revalidatePath(`/dashboard/submissions/${input.submissionId}`);
  return { ok: true, message: "File registered." };
}

export async function submitSubmissionAction(input: { submissionId: string }): Promise<SubmitSubmissionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const { data: current, error } = await supabase
    .from("submissions")
    .select("id, status, owner_user_id")
    .eq("id", input.submissionId)
    .single();

  if (error || !current) return { ok: false, message: "Submission not found." };
  if (current.owner_user_id !== user.id) return { ok: false, message: "Not allowed." };

  try {
    assertTransition(current.status, "submitted");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Invalid transition." };
  }

  const { error: upErr } = await supabase
    .from("submissions")
    .update({ status: "submitted" })
    .eq("id", input.submissionId);

  if (upErr) return { ok: false, message: upErr.message };

  revalidatePath("/dashboard/submissions");
  revalidatePath(`/dashboard/submissions/${input.submissionId}`);
  return { ok: true, message: "Submitted for editorial review." };
}
