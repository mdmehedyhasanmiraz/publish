import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateArticleDraftForm } from "@/components/articles/create-article-draft-form";
import { CreateArticleFromSubmissionButton } from "@/components/articles/create-article-from-submission-button";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const supabase = await createClient();
  const [{ data: journals }, { data: articles }, { data: acceptedSubs }, { data: linkedArticleRows }] =
    await Promise.all([
      supabase.from("journals").select("id, name").order("name"),
      supabase
        .from("articles")
        .select("id, title, slug, status, doi, manuscript_reference_code, journals(name, slug), current_version_id, submission_id")
        .order("id", { ascending: false })
        .limit(200),
      supabase
        .from("submissions")
        .select("id, title, journal_id, journals(name)")
        .eq("status", "accepted")
        .order("id", { ascending: false })
        .limit(100),
      supabase.from("articles").select("submission_id").not("submission_id", "is", null),
    ]);

  const linkedSubmissionIds = new Set(
    (linkedArticleRows ?? []).map((r) => r.submission_id as string).filter(Boolean),
  );
  const acceptedWithoutArticle = (acceptedSubs ?? []).filter((s) => !linkedSubmissionIds.has(s.id));

  const fromSubmissionArticles = (articles ?? []).filter((a) => a.submission_id != null);
  const otherArticles = (articles ?? []).filter((a) => a.submission_id == null);

  return (
    <div>
      <h2 className="text-xl font-semibold">Articles</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Accepted manuscripts appear here for JATS XML production. Create drafts from accepted submissions or open an
        existing article to edit the publishable XML body.
      </p>

      {acceptedWithoutArticle.length ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
          <h3 className="text-sm font-semibold text-amber-950">Accepted — article draft not created yet</h3>
          <p className="mt-1 text-sm text-amber-950/90">
            These manuscripts are accepted but do not have an article row yet. Create a draft to edit JATS XML and
            figures for publication.
          </p>
          <ul className="mt-3 grid gap-3">
            {acceptedWithoutArticle.map((s) => {
              const j = Array.isArray(s.journals) ? s.journals[0] : s.journals;
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded-md border border-amber-200/80 bg-white/90 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{j?.name ?? "Journal"}</p>
                    <Link
                      href={`/admin/submissions/${s.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open submission workflow →
                    </Link>
                  </div>
                  <CreateArticleFromSubmissionButton submissionId={s.id} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <CreateArticleDraftForm journals={(journals ?? []) as { id: string; name: string }[]} targetPrefix="/admin/articles" />
      </div>

      {fromSubmissionArticles.length ? (
        <div className="mt-5 rounded border bg-white p-4">
          <h3 className="text-sm font-semibold">From accepted submissions (JATS XML production)</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Article drafts linked to a manuscript. Edit the JATS XML body, references, and assets before publishing.
          </p>
          <div className="mt-3 grid gap-2">
            {fromSubmissionArticles.map((a) => {
              const j = Array.isArray(a.journals) ? a.journals[0] : a.journals;
              const js = (j as { slug?: string } | undefined)?.slug;
              const code = (a as { manuscript_reference_code?: string | null }).manuscript_reference_code?.trim();
              const publicPath =
                js && code ? `${js}/article/${encodeURIComponent(code)}` : null;
              return (
                <Link key={a.id} href={`/admin/articles/${a.id}`} className="rounded border p-3 hover:bg-muted/20">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {j?.name ?? "Unknown journal"}
                    {publicPath ? ` · ${publicPath}` : " · (no public manuscript ID yet)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    status: {a.status} · {a.doi ? `DOI: ${a.doi}` : "No DOI"} ·{" "}
                    {a.current_version_id ? "versioned" : "no version"} · submission-linked
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded border bg-white p-4">
        <h3 className="text-sm font-semibold">All other article drafts</h3>
        <p className="mt-1 text-sm text-muted-foreground">Articles created manually (not tied to a submission).</p>
        <div className="mt-3 grid gap-2">
          {otherArticles.length ? (
            otherArticles.map((a) => {
              const j = Array.isArray(a.journals) ? a.journals[0] : a.journals;
              const js = (j as { slug?: string } | undefined)?.slug;
              const code = (a as { manuscript_reference_code?: string | null }).manuscript_reference_code?.trim();
              const publicPath =
                js && code ? `${js}/article/${encodeURIComponent(code)}` : null;
              return (
                <Link key={a.id} href={`/admin/articles/${a.id}`} className="rounded border p-3 hover:bg-muted/20">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {j?.name ?? "Unknown journal"}
                    {publicPath ? ` · ${publicPath}` : " · (no public manuscript ID yet)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    status: {a.status} · {a.doi ? `DOI: ${a.doi}` : "No DOI"} ·{" "}
                    {a.current_version_id ? "versioned" : "no version"}
                  </p>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No standalone drafts.</p>
          )}
        </div>
      </div>
    </div>
  );
}
