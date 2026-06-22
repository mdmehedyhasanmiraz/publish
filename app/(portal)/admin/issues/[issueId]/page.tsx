import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueCoverUpload } from "@/components/issue-cover-upload";
import { createClient } from "@/lib/supabase/server";

export default async function AdminIssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  const supabase = await createClient();
  const { data: issue } = await supabase
    .from("issues")
    .select("id, issue_number, issue_slug, cover_image_path, journals(name, slug, cover_image_path)")
    .eq("id", issueId)
    .maybeSingle();

  if (!issue) notFound();

  const j = Array.isArray(issue.journals) ? issue.journals[0] : issue.journals;
  const journalName = (j as { name?: string } | null)?.name ?? "Journal";
  const journalSlug = (j as { slug?: string } | null)?.slug;
  const journalCover = (j as { cover_image_path?: string | null } | null)?.cover_image_path ?? null;

  return (
    <div>
      <p className="text-sm text-slate-500">
        <Link href="/admin/issues" className="text-teal-600 hover:underline">
          ← Issues
        </Link>
      </p>
      <h2 className="mt-2 text-xl font-semibold">
        {issue.issue_number != null ? `Issue ${issue.issue_number}` : "Issue"} — {issue.issue_slug as string}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {journalName}
        {journalSlug ? (
          <>
            {" "}
            (<Link className="text-primary hover:underline" href={`${journalSlug}`}>
              {journalSlug}
            </Link>
            )
          </>
        ) : null}
      </p>
      <div className="mt-8">
        <IssueCoverUpload
          issueId={issue.id as string}
          issueCoverPath={(issue.cover_image_path as string | null) ?? null}
          journalCoverPath={journalCover}
        />
      </div>
    </div>
  );
}
