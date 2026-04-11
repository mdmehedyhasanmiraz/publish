import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArticlePreview } from "@/components/articles/article-preview";
import { ArticlePublicSidebar } from "@/components/public/article-public-sidebar";
import type { ArticleTocItem } from "@/lib/articles/markdown";
import { renderArticleMarkdownToHtmlWithToc } from "@/lib/articles/markdown";
import { parseArticleExtraMetadata } from "@/lib/articles/extra-metadata";

type Props = { params: Promise<{ journalSlug: string; articleSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { journalSlug, articleSlug } = await params;
  const supabase = await createClient();
  const { data: article } = await supabase
    .from("articles")
    .select("title")
    .eq("slug", articleSlug)
    .in("status", ["published"])
    .eq("journals.slug", journalSlug)
    .maybeSingle();
  return { title: `${article?.title ?? articleSlug} | Sciencelet` };
}

export default async function ArticlePage({ params }: Props) {
  const { journalSlug, articleSlug } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("id, title, slug, doi, abstract, keywords, published_at, status, current_version_id, journals(name, slug), submission_id")
    .eq("slug", articleSlug)
    .eq("status", "published")
    .eq("journals.slug", journalSlug)
    .maybeSingle();
  if (!article) notFound();

  const { data: version } = await supabase
    .from("article_versions")
    .select("id, title, abstract, markdown_body, workflow_status, extra_metadata")
    .eq("id", article.current_version_id)
    .eq("workflow_status", "published")
    .maybeSingle();
  if (!version) notFound();

  const extra = parseArticleExtraMetadata(version.extra_metadata);

  const [{ data: assets }, { data: submission }] = await Promise.all([
    supabase
      .from("article_assets")
      .select("id, asset_key, asset_type, caption, alt_text, table_markdown, storage_path, sort_order")
      .eq("article_id", article.id)
      .eq("version_id", version.id)
      .order("sort_order", { ascending: true }),
    article.submission_id
      ? supabase.from("submissions").select("author_affiliations").eq("id", article.submission_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const authorAffiliations = Array.isArray(submission?.author_affiliations)
    ? submission.author_affiliations
    : [];
  const journal = Array.isArray(article.journals) ? article.journals[0] : article.journals;

  const abstractMarkdown = (
    ((version.abstract as string | null) ?? (article.abstract as string | null) ?? "") as string
  ).trim();

  const { html: bodyHtml, toc: bodyToc } = renderArticleMarkdownToHtmlWithToc(
    (version.markdown_body as string) ?? "",
    (assets ?? []) as never,
  );

  /** Sidebar outline: only second-level (##) section headings from the article body. */
  const tocItems: ArticleTocItem[] = bodyToc.filter((item) => item.level === 2);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{journal?.name ?? journalSlug}</p>
      <h1 className="mt-2 text-3xl font-bold">{(version.title as string) || (article.title as string)}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {(article.published_at as string | null)
          ? `Published ${new Date(article.published_at as string).toLocaleDateString()}`
          : "Ahead of issue"}
      </p>
      <div className="mt-4 grid gap-2 rounded-lg border bg-white p-4 text-sm">
        <p>
          <span className="font-medium">DOI:</span> {(article.doi as string | null) ?? "Pending DOI"}
        </p>
        <p>
          <span className="font-medium">URL:</span> /j/{journal?.slug ?? journalSlug}/article/{article.slug as string}
        </p>
        {Array.isArray(article.keywords) && (article.keywords as string[]).length ? (
          <p>
            <span className="font-medium">Keywords:</span> {(article.keywords as string[]).join(", ")}
          </p>
        ) : null}
      </div>

      {authorAffiliations.length ? (
        <section className="mt-6 rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold">Authors and affiliations</h2>
          <div className="mt-3 grid gap-3">
            {authorAffiliations.map((a: any, idx: number) => (
              <div key={`${a.email ?? idx}`} className="rounded border p-3">
                <p className="font-medium">
                  {[a.salutation, a.first_name, a.middle_name, a.last_name, a.suffix].filter(Boolean).join(" ")}
                </p>
                <p className="text-sm text-muted-foreground">{a.email ?? "—"}</p>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  {Array.isArray(a.affiliations) && a.affiliations.length ? (
                    a.affiliations.map((af: any, i: number) => (
                      <p key={i}>
                        {(af.institution_name as string) ?? "Institution"} {af.department ? `· ${af.department}` : ""}
                      </p>
                    ))
                  ) : (
                    <p>No affiliations listed.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_min(240px,30%)] lg:items-start lg:gap-12">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border bg-white p-6">
            <ArticlePreview
              abstractMarkdown={
                ((version.abstract as string | null) ?? (article.abstract as string | null) ?? "") as string
              }
              markdownBody={(version.markdown_body as string) ?? ""}
              bodyHtml={bodyHtml}
              assets={(assets ?? []) as never}
              references={extra.references}
              paragraphFont="eb-garamond"
            />
          </section>

          {extra.acknowledgement?.trim() ? (
            <section className="rounded-lg border bg-white p-4">
              <h2 className="text-lg font-semibold">Acknowledgements</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{extra.acknowledgement}</p>
            </section>
          ) : null}

          {extra.competing_interests?.trim() ? (
            <section className="rounded-lg border bg-white p-4">
              <h2 className="text-lg font-semibold">Competing interests</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{extra.competing_interests}</p>
            </section>
          ) : null}
        </div>

        <ArticlePublicSidebar tocItems={tocItems} />
      </div>

      <footer className="mt-10 border-t border-border pt-6">
        <p className="max-w-prose text-xs text-muted-foreground">
          This work is licensed under a{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            className="font-medium text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="license noopener noreferrer"
          >
            Creative Commons Attribution 4.0 International License
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
