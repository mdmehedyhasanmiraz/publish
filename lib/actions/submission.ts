"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { WizardAuthorRow } from "@/lib/submissions/wizard-author-types";

export type SubmissionActionState = { ok: boolean; message?: string; submissionId?: string };
export type RegisterSubmissionFileResult = { ok: boolean; message?: string; fileId?: string };
export type SubmitSubmissionResult = { ok: boolean; message?: string };

export async function createSubmissionAction(
  _prev: SubmissionActionState | undefined,
  formData: FormData,
): Promise<SubmissionActionState> {
  const journalId = String(formData.get("journal_id") ?? "");
  const title = String(formData.get("title") ?? "").trim() || "Untitled submission";
  const abstract = String(formData.get("abstract") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const submissionType = String(formData.get("submission_type") ?? "").trim();

  if (!journalId || !area || !submissionType) {
    return { ok: false, message: "Journal, area/field, and submission type are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "You must be signed in to submit." };
  }

  const { saveWizardStep1 } = await import("@/lib/submissions/save-wizard-step1");
  const result = await saveWizardStep1(supabase, user.id, {
    submissionId: null,
    journalId,
    title,
    abstract,
    area,
    submissionType,
  });
  if (!result.ok) return { ok: false, message: result.message };

  try {
    revalidatePath("/author/submissions");
    revalidatePath("/author/submissions/new");
    revalidatePath(`/author/submissions/${result.submissionId}`);
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    submissionId: result.submissionId,
    message: result.message ?? "Draft saved. You can add files and submit when ready.",
  };
}

export async function registerSubmissionFileAction(input: {
  submissionId: string;
  submissionVersionId: string;
  fileKind: string;
  storagePath: string;
  mimeType: string | null;
  description?: string;
}): Promise<RegisterSubmissionFileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "You must be signed in." };

  const { registerSubmissionFile } = await import("@/lib/submissions/register-submission-file");
  const result = await registerSubmissionFile(supabase, user.id, input);
  if (result.ok) {
    try {
      revalidatePath(`/author/submissions/${input.submissionId}`);
      revalidatePath("/author/submissions/new");
    } catch {
      /* ignore */
    }
  }
  return result;
}

export async function removeSubmissionFileAction(input: { fileId: string; storagePath: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "You must be signed in." };

  const { removeSubmissionFile } = await import("@/lib/submissions/remove-submission-file");
  const result = await removeSubmissionFile(supabase, user.id, input);
  if (result.ok) {
    try {
      if (result.submissionId) revalidatePath(`/author/submissions/${result.submissionId}`);
      revalidatePath("/author/submissions/new");
    } catch {
      /* ignore */
    }
  }
  return result;
}

export async function deleteSubmissionAction(input: { submissionId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "You must be signed in." };

  const { deleteDraftSubmission } = await import("@/lib/submissions/delete-draft-submission");
  const result = await deleteDraftSubmission(supabase, user.id, input.submissionId);
  if (!result.ok) return result;

  try {
    revalidatePath("/author/submissions");
    revalidatePath("/author/submissions/new");
    revalidatePath(`/author/submissions/${input.submissionId}`);
  } catch {
    /* ignore revalidation errors */
  }

  return { ok: true as const, message: result.message ?? "Submission deleted." };
}

export async function updateSubmissionStep3Action(input: {
  submissionId: string;
  authorsJson: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "You must be signed in." };

  let payload: unknown;
  try {
    payload = input.authorsJson.trim() ? JSON.parse(input.authorsJson) : [];
  } catch {
    return { ok: false as const, message: "Authors payload must be valid JSON." };
  }
  if (!Array.isArray(payload)) return { ok: false as const, message: "Authors payload must be an array." };

  const { saveWizardStep3Authors } = await import("@/lib/submissions/save-wizard-step3-authors");
  const result = await saveWizardStep3Authors(supabase, user.id, input.submissionId, payload as WizardAuthorRow[]);
  if (!result.ok) return result;

  try {
    revalidatePath(`/author/submissions/${input.submissionId}`);
    revalidatePath("/author/submissions/new");
  } catch {
    /* ignore */
  }
  return { ok: true as const, message: result.message ?? "Author affiliations saved." };
}

export async function lookupAuthorByEmailAction(input: { email: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "You must be signed in." };

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false as const, message: "Email is required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "user_id, salutation, first_name, middle_name, last_name, suffix, display_name, email, alternate_email, phone, whatsapp, orcid_id, scopus_author_id, wos_researcher_id, google_scholar_url, loop_profile_url, publons_url, address_line1, address_line2, city, state_region, postal_code, country_code",
    )
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      ok: true as const,
      exists: false as const,
      message:
        "No account found for this email yet. This author will be notified to confirm affiliations after they register with this email.",
    };
  }

  const { data: affiliations } = await supabase
    .from("profile_affiliations")
    .select("institution_name, department, position_title, city, country_code, start_date, end_date, is_primary")
    .eq("user_id", profile.user_id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  return {
    ok: true as const,
    exists: true as const,
    profile,
    affiliations: affiliations ?? [],
    message: "Author profile found. Fields and affiliations were prefilled.",
  };
}

export async function updateSubmissionStep4Action(input: {
  submissionId: string;
  title: string;
  abstract: string;
  supplementaryDataLink: string;
  submissionNotes: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "You must be signed in." };

  const { saveWizardStep4Details } = await import("@/lib/submissions/save-wizard-step4-details");
  const result = await saveWizardStep4Details(supabase, user.id, input);
  if (!result.ok) return result;

  try {
    revalidatePath(`/author/submissions/${input.submissionId}`);
    revalidatePath("/author/submissions/new");
  } catch {
    /* ignore */
  }
  return { ok: true as const, message: result.message ?? "Submission details saved." };
}

export async function submitSubmissionAction(input: { submissionId: string }): Promise<SubmitSubmissionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const { submitSubmissionForReview } = await import("@/lib/submissions/submit-submission-for-review");
  const result = await submitSubmissionForReview(supabase, user.id, input.submissionId);
  if (!result.ok) return result;

  try {
    revalidatePath("/author/submissions");
    revalidatePath(`/author/submissions/${input.submissionId}`);
  } catch {
    /* ignore */
  }
  return { ok: true, message: result.message ?? "Submitted for editorial review." };
}

export type ExtractManuscriptMetadataResult =
  | {
      ok: true;
      title?: string;
      abstract?: string;
      skipped?: boolean;
      reason?: "no_file" | "unsupported_format" | "empty";
      message?: string;
    }
  | { ok: false; message: string };

/** Download latest manuscript DOCX for a submission and extract title/abstract (best-effort). */
export async function extractManuscriptMetadataAction(input: {
  submissionId: string;
}): Promise<ExtractManuscriptMetadataResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const { extractSubmissionManuscriptMetadata } = await import("@/lib/submissions/extract-submission-manuscript-metadata");
  return extractSubmissionManuscriptMetadata(supabase, user.id, input.submissionId);
}
