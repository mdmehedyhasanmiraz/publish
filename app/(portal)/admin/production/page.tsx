import { createClient } from "@/lib/supabase/server";

export default async function AdminProductionPage() {
  const supabase = await createClient();

  const [{ data: pipeline }, { data: articles }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, title, status, journals(name)")
      .in("status", ["accepted", "production", "scheduled", "published"])
      .order("id", { ascending: false })
      .limit(100),
    supabase
      .from("articles")
      .select("id, title, slug, status, manuscript_reference_code, journals(name, slug), issues(issue_slug)")
      .order("id", { ascending: false })
      .limit(100),
  ]);

  return (
    <div>
      <h2 className="text-xl font-semibold">Production</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage copyedit, typesetting, proofing, and publication scheduling.
      </p>

      <div className="mt-5 rounded border bg-white p-4">
        <h3 className="text-sm font-semibold">Submission Pipeline</h3>
        <div className="mt-3 grid gap-2">
          {(pipeline ?? []).length ? (
            (pipeline ?? []).map((s) => {
              const j = Array.isArray(s.journals) ? s.journals[0] : s.journals;
              return (
                <div key={s.id} className="rounded border p-3">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.status} · {j?.name ?? "Unknown journal"}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No submissions in production pipeline.</p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded border bg-white p-4">
        <h3 className="text-sm font-semibold">Published/Ahead Articles</h3>
        <div className="mt-3 grid gap-2">
          {(articles ?? []).length ? (
            (articles ?? []).map((a) => {
              const j = Array.isArray(a.journals) ? a.journals[0] : a.journals;
              const js = (j as { slug?: string } | undefined)?.slug;
              const code = (a as { manuscript_reference_code?: string | null }).manuscript_reference_code?.trim();
              const publicPath =
                js && code ? `${js}/article/${encodeURIComponent(code)}` : null;
              const i = Array.isArray(a.issues) ? a.issues[0] : a.issues;
              return (
                <div key={a.id} className="rounded border p-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {publicPath ?? "(no public manuscript ID)"} · {a.status}{" "}
                    {i?.issue_slug ? `· ${i.issue_slug}` : ""}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No articles yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
