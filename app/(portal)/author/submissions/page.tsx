import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  AUTHOR_IN_REVIEW_STATUSES,
  AUTHOR_SUBMITTED_STATUSES,
  parseAuthorSubmissionListFilter,
  type AuthorSubmissionListFilter,
} from "@/lib/submissions/author-filters";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const FILTER_COPY: Record<
  AuthorSubmissionListFilter,
  { title: string; description: string; empty: string }
> = {
  submitted: {
    title: "Submitted",
    description:
      "Manuscripts received by the journal that are not yet in active peer review (e.g. awaiting desk check or editor assignment).",
    empty: "No manuscripts in this stage.",
  },
  "under-review": {
    title: "Under Review",
    description:
      "Manuscripts with a handling editor and/or active peer review and revision (excludes the initial “submitted” desk stage).",
    empty: "Nothing in peer review right now.",
  },
  accepted: {
    title: "Accepted",
    description: "Manuscripts accepted for publication.",
    empty: "No accepted manuscripts yet.",
  },
  published: {
    title: "Published",
    description: "Manuscripts that have reached published status.",
    empty: "No published manuscripts yet.",
  },
  rejected: {
    title: "Rejected",
    description: "Submissions that were not accepted.",
    empty: "No rejected submissions.",
  },
};

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const filter = parseAuthorSubmissionListFilter((await searchParams).filter);

  let query = supabase
    .from("submissions")
    .select("id, title, status")
    .eq("owner_user_id", user.id);

  if (filter === "submitted") {
    query = query.in("status", [...AUTHOR_SUBMITTED_STATUSES]);
  } else if (filter === "under-review") {
    query = query.in("status", [...AUTHOR_IN_REVIEW_STATUSES]);
  } else if (filter === "accepted") {
    query = query.eq("status", "accepted");
  } else if (filter === "published") {
    query = query.eq("status", "published");
  } else if (filter === "rejected") {
    query = query.eq("status", "rejected");
  }

  const { data: submissions } = await query.order("id", { ascending: false });

  const header = filter
    ? FILTER_COPY[filter]
    : {
        title: "Submissions",
        description: "Your manuscripts and draft submissions.",
        empty:
          "No submissions yet. Create your first draft to start uploading files and submit for review.",
      };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{header.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{header.description}</p>
        </div>
        <Button asChild>
          <Link href="/author/submissions/new">New submission</Link>
        </Button>
      </div>
      <div className="mt-6 grid gap-3">
        {(submissions ?? []).length ? (
          (submissions ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/author/submissions/${s.id}`}
              className="rounded-lg border bg-white p-4 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Status: <span className="font-medium text-foreground">{s.status}</span>
                  </p>
                </div>
                <span className="shrink-0 text-sm text-primary">Open</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">{header.empty}</div>
        )}
      </div>
    </div>
  );
}
