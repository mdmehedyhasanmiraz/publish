import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateArticleDraftForm } from "@/components/articles/create-article-draft-form";

export const dynamic = "force-dynamic";

export default async function EditorArticlesPage() {
  const supabase = await createClient();
  const [{ data: journals }, { data: articles }] = await Promise.all([
    supabase.from("journals").select("id, name").order("name"),
    supabase
      .from("articles")
      .select("id, title, slug, status, doi, manuscript_reference_code, journals(name, slug), current_version_id, submission_id")
      .order("id", { ascending: false })
      .limit(200),
  ]);

  return (
    <div>
      <h2 className="text-xl font-semibold">Article desk</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Draft, review, and publish article content ready for public site.
      </p>

      <div className="mt-5">
        <CreateArticleDraftForm journals={(journals ?? []) as { id: string; name: string }[]} targetPrefix="/editor/articles" />
      </div>

      <div className="mt-5 rounded border bg-white p-4">
        <h3 className="text-sm font-semibold">All articles</h3>
        <div className="mt-3 grid gap-2">
          {(articles ?? []).length ? (
            (articles ?? []).map((a) => {
              const j = Array.isArray(a.journals) ? a.journals[0] : a.journals;
              const js = (j as { slug?: string } | undefined)?.slug;
              const code = (a as { manuscript_reference_code?: string | null }).manuscript_reference_code?.trim();
              const publicPath =
                js && code ? `/j/${js}/article/${encodeURIComponent(code)}` : null;
              return (
                <Link key={a.id} href={`/editor/articles/${a.id}`} className="rounded border p-3 hover:bg-muted/20">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {j?.name ?? "Unknown journal"}
                    {publicPath ? ` · ${publicPath}` : " · (no public manuscript ID yet)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    status: {a.status} · {a.doi ? `DOI: ${a.doi}` : "No DOI"} · {a.current_version_id ? "versioned" : "no version"}
                    {a.submission_id ? " · from submission" : ""}
                  </p>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No articles found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

