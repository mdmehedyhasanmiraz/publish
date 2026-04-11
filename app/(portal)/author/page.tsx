import { createClient } from "@/lib/supabase/server";
import {
  AUTHOR_IN_REVIEW_STATUS_SET,
  AUTHOR_SUBMITTED_STATUS_SET,
} from "@/lib/submissions/author-filters";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AuthorHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select("status")
    .eq("owner_user_id", user.id);

  const submissionStatuses = (submissions ?? []).map((row) => row.status);
  const stats = {
    total: submissionStatuses.length,
    submitted: submissionStatuses.filter((status) => status !== "draft").length,
    submittedPipeline: submissionStatuses.filter((status) => AUTHOR_SUBMITTED_STATUS_SET.has(status))
      .length,
    accepted: submissionStatuses.filter((status) => status === "accepted").length,
    published: submissionStatuses.filter((status) => status === "published").length,
    inReview: submissionStatuses.filter((status) => AUTHOR_IN_REVIEW_STATUS_SET.has(status)).length,
    rejected: submissionStatuses.filter((status) => status === "rejected").length,
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use the sidebar to manage submissions. You can switch roles from the top-right account menu.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total manuscripts</p>
          <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Submitted (total)</p>
          <p className="mt-2 text-2xl font-semibold">{stats.submitted}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Awaiting editor / desk</p>
          <p className="mt-2 text-2xl font-semibold">{stats.submittedPipeline}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Under review / revision</p>
          <p className="mt-2 text-2xl font-semibold">{stats.inReview}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Accepted</p>
          <p className="mt-2 text-2xl font-semibold">{stats.accepted}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Published</p>
          <p className="mt-2 text-2xl font-semibold">{stats.published}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rejected</p>
          <p className="mt-2 text-2xl font-semibold">{stats.rejected}</p>
        </div>
      </div>
      <div className="mt-6">
        <Link href="/author/submissions" className="text-sm font-medium text-primary hover:underline">
          Go to submissions →
        </Link>
      </div>
    </div>
  );
}
