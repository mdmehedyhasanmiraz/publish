import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmissionWizardForm } from "@/components/forms/submission-wizard-form";
import { getJournals } from "@/lib/db/journals";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const journals = await getJournals();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "salutation, first_name, middle_name, last_name, suffix, display_name, email, alternate_email, phone, whatsapp, orcid_id, scopus_author_id, wos_researcher_id, google_scholar_url, loop_profile_url, publons_url, address_line1, address_line2, city, state_region, postal_code, country_code",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: profileAffiliations } = await supabase
    .from("profile_affiliations")
    .select("institution_name, department, position_title, city, country_code, start_date, end_date, is_primary")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      "id, title, status, journal_id, owner_user_id, abstract, area, submission_type, supplementary_data_link, submission_notes, author_affiliations",
    )
    .eq("id", submissionId)
    .single();

  if (!submission || submission.owner_user_id !== user.id) {
    redirect("/author/submissions");
  }

  const status = submission.status as string;

  const { data: version } = await supabase
    .from("submission_versions")
    .select("id, version_number")
    .eq("submission_id", submissionId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: files } = await supabase
    .from("submission_files")
    .select("id, file_kind, description, storage_path, mime_type, created_at, submission_version_id")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });

  const latestVersionId = version?.id as string | undefined;
  const fileRows = files ?? [];
  const filesForWizard =
    status === "revision_requested" && latestVersionId
      ? fileRows.filter((f) => f.submission_version_id === latestVersionId)
      : fileRows;

  let reviewerFeedbackToAuthor: string | null = null;
  if (status === "revision_requested" || status === "revised_submission") {
    const { data: fb } = await supabase.rpc("get_author_submission_review_comments", {
      p_submission_id: submissionId,
    });
    if (typeof fb === "string" && fb.trim()) reviewerFeedbackToAuthor = fb;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <SubmissionWizardForm
        journals={journals}
        initialProfile={profile}
        initialAffiliations={profileAffiliations ?? []}
        initialSubmission={{
          id: submission.id as string,
          journal_id: submission.journal_id as string,
          area: (submission.area as string | null) ?? null,
          submission_type: (submission.submission_type as string | null) ?? null,
          title: (submission.title as string | null) ?? null,
          abstract: (submission.abstract as string | null) ?? null,
          supplementary_data_link: (submission.supplementary_data_link as string | null) ?? null,
          submission_notes: (submission.submission_notes as string | null) ?? null,
          author_affiliations: submission.author_affiliations,
          current_version_id: (version?.id as string | null) ?? null,
        }}
        initialFiles={filesForWizard.map((f) => ({
          id: String(f.id),
          kind: String(f.file_kind ?? ""),
          description: String(f.description ?? ""),
          path: String(f.storage_path ?? ""),
          mime: (f.mime_type as string | null) ?? null,
        }))}
        workflowStatus={status}
        revisionVersionNumber={typeof version?.version_number === "number" ? version.version_number : null}
        reviewerFeedbackToAuthor={reviewerFeedbackToAuthor}
      />
    </div>
  );
}

