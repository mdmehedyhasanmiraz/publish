import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, title, status")
    .eq("owner_user_id", user.id)
    .order("id", { ascending: false });

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Submissions</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your manuscripts and draft submissions.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/submissions/new">New submission</Link>
        </Button>
      </div>
      <div className="mt-6 grid gap-3">
        {(submissions ?? []).length ? (
          (submissions ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/submissions/${s.id}`}
              className="rounded-lg border bg-white p-4 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Status: <span className="font-medium text-foreground">{s.status}</span>
                  </p>
                </div>
                <span className="text-sm text-primary">Open</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
            No submissions yet. Create your first draft to start uploading files and submit for review.
          </div>
        )}
      </div>
    </main>
  );
}
