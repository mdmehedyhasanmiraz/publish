import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitSubmissionButton } from "@/components/submit-submission-button";

export const dynamic = "force-dynamic";

export default async function SubmitSubmissionPage({
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
    .select("id, title, status, owner_user_id")
    .eq("id", submissionId)
    .single();

  if (!submission || submission.owner_user_id !== user.id) {
    redirect("/dashboard/submissions");
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <p className="text-sm text-muted-foreground">
        <Link href={`/dashboard/submissions/${submissionId}`} className="text-primary hover:underline">
          ← Back to submission
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Submit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        When you submit, your draft moves to editorial processing. You can’t upload new files after submission unless a revision is requested.
      </p>

      <div className="mt-8 rounded-lg border bg-white p-5">
        <p className="text-sm">
          <span className="font-medium">Title:</span> {submission.title}
        </p>
        <p className="mt-2 text-sm">
          <span className="font-medium">Current status:</span> {submission.status}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Make sure you’ve uploaded all required documents (manuscript, cover letter, supplementary files, etc.) before submitting.
        </p>
        <div className="mt-5">
          <SubmitSubmissionButton submissionId={submissionId} currentStatus={submission.status} />
        </div>
      </div>
    </main>
  );
}

