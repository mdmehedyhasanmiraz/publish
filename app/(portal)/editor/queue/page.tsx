import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function EditorQueuePage() {
  const supabase = await createClient();

  const [{ data: editorialQueue }, { data: decisions }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, title, status, journals(name, slug)")
      .in("status", ["submitted", "admin_check", "editor_assigned", "under_review", "revision_requested", "revised_submission"])
      .order("id", { ascending: false })
      .limit(100),
    supabase
      .from("editor_decisions")
      .select("id, submission_id, actor_user_id, decision, submissions(title)")
      .order("id", { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <h2 className="text-xl font-semibold">Editorial queue</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Manuscripts in editorial stages and recent decisions. Full admin tools remain under Admin when you have access.
      </p>

      <div className="mt-5 rounded border bg-white p-4">
        <h3 className="text-sm font-semibold">Queue</h3>
        <div className="mt-3 grid gap-2">
          {(editorialQueue ?? []).length ? (
            (editorialQueue ?? []).map((s) => {
              const j = Array.isArray(s.journals) ? s.journals[0] : s.journals;
              return (
                <div key={s.id} className="rounded border p-3">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.status} · {j?.name ?? "Unknown journal"}
                  </p>
                  <Link
                    href={`/editor/submissions/${s.id}`}
                    className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Workflow →
                  </Link>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No submissions currently in editorial stages.</p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded border bg-white p-4">
        <h3 className="text-sm font-semibold">Recent decisions</h3>
        <div className="mt-3 grid gap-2">
          {(decisions ?? []).length ? (
            (decisions ?? []).map((d) => {
              const s = Array.isArray(d.submissions) ? d.submissions[0] : d.submissions;
              return (
                <div key={d.id} className="rounded border p-3 text-sm">
                  <p>
                    <span className="font-medium">{d.decision}</span> · {s?.title ?? d.submission_id}
                  </p>
                  <p className="text-xs text-muted-foreground">Actor: {d.actor_user_id}</p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No editorial decisions recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
