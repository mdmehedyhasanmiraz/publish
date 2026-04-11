import { PeerReviewReportForm } from "@/components/peer-review-report-form";
import { ReviewerCompletedReport } from "@/components/reviewer-completed-report";
import { ReviewerManuscriptFiles, type ReviewerFileRow } from "@/components/reviewer-manuscript-files";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function statusBadgeClass(status: string) {
  switch (status) {
    case "accepted":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "completed":
      return "border-slate-200 bg-slate-100 text-slate-900";
    case "sent":
      return "border-sky-200 bg-sky-50 text-sky-950";
    default:
      return "border-border bg-muted text-foreground";
  }
}

export default async function ReviewerReviewTaskPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/reviewer/reviews/${invitationId}`)}`);

  const { data: inv, error } = await supabase
    .from("reviewer_invitations")
    .select(
      `
      id,
      status,
      reviewer_number,
      deadline_at,
      reviewer_user_id,
      review_rounds (
        submission_id,
        submissions (
          id,
          title,
          abstract,
          journals ( name, slug )
        )
      )
    `,
    )
    .eq("id", invitationId)
    .maybeSingle();

  if (error || !inv) notFound();
  if (inv.reviewer_user_id !== user.id) notFound();

  const rrRaw = inv.review_rounds as unknown;
  const rr = Array.isArray(rrRaw) ? rrRaw[0] : rrRaw;
  const rrObj = rr as {
    submission_id: string;
    submissions?: {
      id: string;
      title: string;
      abstract: string | null;
      journals: { name: string } | { name: string }[] | null;
    } | null;
  };
  const subRaw = rrObj?.submissions;
  const sub = Array.isArray(subRaw) ? subRaw[0] : subRaw;
  const submissionId = rrObj?.submission_id ?? sub?.id;
  const title = sub?.title ?? "Manuscript";
  const abstract = sub?.abstract?.trim() ?? null;
  const jRaw = sub?.journals;
  const journal = Array.isArray(jRaw) ? jRaw[0] : jRaw;
  const journalName = journal?.name ?? null;
  const journalSlug = journal?.slug ?? null;

  const { data: filesRaw } = submissionId
    ? await supabase
        .from("submission_files")
        .select("id, file_kind, storage_path, mime_type, description")
        .eq("submission_id", submissionId)
        .order("file_kind", { ascending: true })
        .order("id", { ascending: true })
    : { data: null };

  const files: ReviewerFileRow[] = (filesRaw ?? []).map((f) => ({
    id: f.id,
    file_kind: f.file_kind,
    storage_path: f.storage_path,
    mime_type: f.mime_type,
    description: f.description,
  }));

  const { data: existing } = await supabase
    .from("peer_review_reports")
    .select("id, submitted_at, comments_to_author, narrative, checklist")
    .eq("reviewer_invitation_id", invitationId)
    .maybeSingle();

  if (existing) {
    const checklist =
      existing.checklist && typeof existing.checklist === "object" && !Array.isArray(existing.checklist)
        ? (existing.checklist as Record<string, unknown>)
        : {};

    return (
      <div>
        <Link href="/reviewer" className="text-sm font-medium text-primary hover:underline">
          ← Reviewer home
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <Badge variant="outline" className={statusBadgeClass("completed")}>
            Completed
          </Badge>
        </div>
        {journalName ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Journal: <span className="font-medium text-foreground">{journalName}</span>
          </p>
        ) : null}
        <ReviewerCompletedReport
          submittedAt={existing.submitted_at}
          commentsToAuthor={
            (existing as { comments_to_author?: string | null }).comments_to_author ?? ""
          }
          narrative={existing.narrative ?? ""}
          checklist={checklist}
        />
        {submissionId ? (
          <section className="mt-10 border-t pt-6">
            <h3 className="text-sm font-semibold">Manuscript files</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              You can still download materials for your records (links expire shortly after opening).
            </p>
            <div className="mt-3">
              <ReviewerManuscriptFiles submissionId={submissionId} files={files} />
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (inv.status !== "accepted") {
    return (
      <div>
        <Link href="/reviewer" className="text-sm font-medium text-primary hover:underline">
          ← Reviewer home
        </Link>
        <h2 className="mt-3 text-xl font-semibold">Not ready</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Accept the invitation from your email link first (status is currently:{" "}
          <span className="font-medium text-foreground">{inv.status}</span>).
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/reviewer" className="text-sm font-medium text-primary hover:underline">
        ← Reviewer home
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Badge variant="outline" className={statusBadgeClass("accepted")}>
          In progress
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
        {journalName ? (
          <span>
            Journal: <span className="font-medium text-foreground">{journalName}</span>
          </span>
        ) : null}
        {inv.reviewer_number != null ? (
          <span>
            Reviewer #<span className="font-medium text-foreground">{inv.reviewer_number}</span>
          </span>
        ) : null}
        {inv.deadline_at ? (
          <span>
            Submit by:{" "}
            <span className="font-medium text-foreground">{new Date(inv.deadline_at).toLocaleString()}</span>
          </span>
        ) : null}
      </div>

      {abstract ? (
        <section className="mt-6 rounded-lg border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold text-foreground">Abstract</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{abstract}</p>
        </section>
      ) : null}

      {submissionId ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold">Manuscript &amp; supplementary files</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Download each file to review. Links are temporary and open in a new tab.
          </p>
          <div className="mt-3">
            <ReviewerManuscriptFiles submissionId={submissionId} files={files} />
          </div>
        </section>
      ) : null}

      <section className="mt-8 border-t pt-6">
        <h3 className="text-sm font-semibold">Review form</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete the ratings and confidential comments to the editor. Your recommendation is visible to the
          editorial team only.
        </p>
        <PeerReviewReportForm invitationId={invitationId} journalSlug={journalSlug} />
      </section>
    </div>
  );
}
