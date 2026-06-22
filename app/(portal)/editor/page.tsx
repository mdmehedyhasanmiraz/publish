import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EditorHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: allSubmissions }, { data: mySubmissions }, { data: decisions }] = await Promise.all([
    supabase
      .from("submissions")
      .select("status, assigned_editor_user_id"),
    supabase
      .from("submissions")
      .select("id, title, status, journals(name)")
      .eq("assigned_editor_user_id", user.id)
      .in("status", [
        "submitted",
        "admin_check",
        "editor_assigned",
        "under_review",
        "revision_requested",
        "revised_submission"
      ])
      .order("id", { ascending: false })
      .limit(10),
    supabase
      .from("editor_decisions")
      .select("id, submission_id, actor_user_id, decision, submissions(title)")
      .order("id", { ascending: false })
      .limit(10),
  ]);

  const total = allSubmissions?.length ?? 0;
  const activeQueue = allSubmissions?.filter((s) =>
    ["submitted", "admin_check", "editor_assigned", "under_review", "revision_requested", "revised_submission"].includes(s.status)
  ).length ?? 0;
  const assignedToMe = allSubmissions?.filter((s) =>
    s.assigned_editor_user_id === user.id &&
    ["submitted", "admin_check", "editor_assigned", "under_review", "revision_requested", "revised_submission"].includes(s.status)
  ).length ?? 0;
  const awaitingAssignment = allSubmissions?.filter((s) =>
    !s.assigned_editor_user_id &&
    ["submitted", "admin_check"].includes(s.status)
  ).length ?? 0;
  const underPeerReview = allSubmissions?.filter((s) =>
    ["under_review", "editor_assigned", "revised_submission"].includes(s.status)
  ).length ?? 0;
  const awaitingRevision = allSubmissions?.filter((s) =>
    s.status === "revision_requested"
  ).length ?? 0;
  const closed = allSubmissions?.filter((s) =>
    ["accepted", "rejected", "published", "production", "scheduled"].includes(s.status)
  ).length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Editorial overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Track and manage active journal submissions, editor assignments, peer review rounds, and recent decisions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active queue</p>
          <p className="mt-2 text-2xl font-semibold">{activeQueue}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assigned to me</p>
          <p className="mt-2 text-2xl font-semibold">{assignedToMe}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Awaiting editor</p>
          <p className="mt-2 text-2xl font-semibold">{awaitingAssignment}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Under peer review</p>
          <p className="mt-2 text-2xl font-semibold">{underPeerReview}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Awaiting author revision</p>
          <p className="mt-2 text-2xl font-semibold">{awaitingRevision}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Decided &amp; Closed</p>
          <p className="mt-2 text-2xl font-semibold">{closed}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total records</p>
          <p className="mt-2 text-2xl font-semibold">{total}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold">Manuscripts assigned to me</h3>
          <p className="mt-1 text-xs text-muted-foreground">Active submissions you are currently handling.</p>
          <div className="mt-4 space-y-3">
            {(mySubmissions ?? []).length ? (
              (mySubmissions ?? []).map((s) => {
                const j = Array.isArray(s.journals) ? s.journals[0] : s.journals;
                return (
                  <div key={s.id} className="rounded border p-3 flex flex-col justify-between sm:flex-row sm:items-center gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Status: <span className="font-semibold text-slate-700">{s.status}</span> · {j?.name ?? "Unknown journal"}
                      </p>
                    </div>
                    <Link
                      href={`/editor/submissions/${s.id}`}
                      className="shrink-0 text-xs font-semibold text-primary hover:underline"
                    >
                      Workflow →
                    </Link>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground italic p-4 border border-dashed rounded text-center">
                No active manuscripts currently assigned to you.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold">Recent decisions</h3>
          <p className="mt-1 text-xs text-muted-foreground">Latest actions and decisions recorded in the queue.</p>
          <div className="mt-4 space-y-3">
            {(decisions ?? []).length ? (
              (decisions ?? []).map((d) => {
                const s = Array.isArray(d.submissions) ? d.submissions[0] : d.submissions;
                return (
                  <div key={d.id} className="rounded border p-3 text-xs">
                    <p className="font-medium text-slate-800 leading-normal">
                      {d.decision}
                    </p>
                    <p className="text-slate-500 mt-1 truncate">
                      Submission: {s?.title ?? d.submission_id}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Editor: {d.actor_user_id}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground italic p-4 border border-dashed rounded text-center">
                No recent editorial decisions.
              </p>
            )}
          </div>
        </section>
      </div>

      <div>
        <Button asChild variant="outline">
          <Link href="/editor/queue">Open full editorial queue →</Link>
        </Button>
      </div>
    </div>
  );
}
