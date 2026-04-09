import { CreateSubmissionForm } from "@/components/forms/create-submission-form";
import { getJournalsForSubmission } from "@/lib/db/publisher-context";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewSubmissionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const journals = await getJournalsForSubmission();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <p className="text-sm text-muted-foreground">
        <Link href="/dashboard/submissions" className="text-primary hover:underline">
          ← Submissions
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">New submission</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start a draft. You can upload files and submit for editorial review in a later step.
      </p>
      <div className="mt-8">
        <CreateSubmissionForm journals={journals} />
      </div>
    </main>
  );
}
