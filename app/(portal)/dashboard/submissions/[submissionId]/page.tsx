import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmissionFilesSection } from "@/components/submission-files-section";
import { Button } from "@/components/ui/button";

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

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, title, status, journal_id, publisher_id, owner_user_id, abstract")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    redirect("/dashboard/submissions");
  }

  const { data: versions } = await supabase
    .from("submission_versions")
    .select("id, version_number")
    .eq("submission_id", submissionId)
    .order("version_number", { ascending: false })
    .limit(1);

  const currentVersion = versions?.[0] ?? null;

  const { data: files } = await supabase
    .from("submission_files")
    .select("id, file_kind, storage_path, mime_type, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl p-8">
      <p className="text-sm text-muted-foreground">
        <Link href="/dashboard/submissions" className="text-primary hover:underline">
          ← Submissions
        </Link>
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{submission.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status: <span className="font-medium text-foreground">{submission.status}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/submissions/${submissionId}/submit`}>Submit</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6">
        <section className="rounded-lg border bg-white p-5">
          <h2 className="text-lg font-semibold">Abstract</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {submission.abstract || "—"}
          </p>
        </section>

        <SubmissionFilesSection
          submissionId={submissionId}
          submissionStatus={submission.status}
          currentVersionId={currentVersion?.id ?? null}
          files={(files ?? []).map((f) => ({
            id: f.id as string,
            kind: String(f.file_kind ?? ""),
            path: String(f.storage_path ?? ""),
            mime: (f.mime_type as string | null) ?? null,
          }))}
        />
      </div>
    </main>
  );
}

