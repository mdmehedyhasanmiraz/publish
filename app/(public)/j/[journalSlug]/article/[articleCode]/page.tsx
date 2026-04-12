import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArticlePreview } from "@/components/articles/article-preview";
import { ArticleReferencesSection } from "@/components/articles/article-references-section";
import { ArticlePublicSidebar } from "@/components/public/article-public-sidebar";
import { ArticlePublicByline } from "@/components/public/article-public-byline";
import { ArticlePublicationTimeline } from "@/components/public/article-publication-timeline";
import { JournalCoverImage } from "@/components/public/journal-cover-image";
import { JournalIssnDisplay } from "@/components/public/journal-issn-display";
import { submissionTypeDisplay } from "@/lib/articles/submission-type-label";
import type { PublicArticleAuthorRow } from "@/lib/articles/public-article-authors";
import { publicCoverUrl } from "@/lib/storage/covers";
import type { ArticleTocItem } from "@/lib/articles/markdown";
import { renderArticleMarkdownToHtmlWithToc } from "@/lib/articles/markdown";
import { parseArticleExtraMetadata } from "@/lib/articles/extra-metadata";
import { buildCitationWork } from "@/lib/articles/citation-formats";
import { getPublicSiteUrl } from "@/lib/site-url";
import { ArticleCiteButton } from "@/components/public/article-cite-button";
import { normalizeManuscriptReferenceCodeParam, publicArticlePath } from "@/lib/articles/public-article-path";

type Props = { params: Promise<{ journalSlug: string; articleCode: string }> };

type PublicJournalArticleHeader = {
  id: string;
  name: string | null;
  slug: string | null;
  cover_image_path: string | null;
  issn_print: string | null;
  issn_online: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { journalSlug, articleCode: articleCodeRaw } = await params;
  const articleCode = normalizeManuscriptReferenceCodeParam(articleCodeRaw);
  const supabase = await createClient();

  const { data: journal } = await supabase.from("journals").select("id").eq("slug", journalSlug).maybeSingle();
  if (!journal?.id) {
    return { title: `${articleCodeRaw} | Sciencelet` };
  }

  const { data: article } = await supabase
    .from("articles")
    .select("title")
    .eq("journal_id", journal.id)
    .eq("manuscript_reference_code", articleCode)
    .eq("status", "published")
    .maybeSingle();

  return { title: `${(article?.title as string) ?? articleCodeRaw} | Sciencelet` };
}

export default async function ArticlePage({ params }: Props) {
  const { journalSlug, articleCode: articleCodeRaw } = await params;
  const articleCode = normalizeManuscriptReferenceCodeParam(articleCodeRaw);
  const supabase = await createClient();

  const { data: journalRaw } = await supabase
    .from("journals")
    .select("id, name, slug, cover_image_path, issn_print, issn_online")
    .eq("slug", journalSlug)
    .maybeSingle();
  if (!journalRaw?.id) notFound();
  const journal = journalRaw as PublicJournalArticleHeader;

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("journal_id", journal.id)
    .eq("manuscript_reference_code", articleCode)
    .eq("status", "published")
    .maybeSingle();
  if (!article?.current_version_id) notFound();

  const { data: version } = await supabase
    .from("article_versions")
    .select("id, title, abstract, markdown_body, workflow_status, extra_metadata")
    .eq("id", article.current_version_id as string)
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

  const authorAffiliations: PublicArticleAuthorRow[] = Array.isArray(submission?.author_affiliations)
    ? (submission.author_affiliations as PublicArticleAuthorRow[])
    : [];
  const coverSrc = publicCoverUrl(journal.cover_image_path ?? null);

  const { html: bodyHtml, toc: bodyToc } = renderArticleMarkdownToHtmlWithToc(
    (version.markdown_body as string) ?? "",
    (assets ?? []) as never,
  );

  /** Sidebar outline: ## headings from the body, plus References when present. */
  const tocItems: ArticleTocItem[] = [
    ...bodyToc.filter((item) => item.level === 2),
    ...(extra.references && extra.references.length > 0
      ? ([{ level: 2, id: "references", text: "References" }] satisfies ArticleTocItem[])
      : []),
  ];

  const doiDisplay = (article.doi as string | null)?.trim() || null;
  const doiLink =
    doiDisplay && !/^https?:\/\//i.test(doiDisplay)
      ? `https://doi.org/${doiDisplay.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`
      : doiDisplay;

  const articleTypeLabel = submissionTypeDisplay(article.public_submission_type as string | null | undefined);

  const articleTitle = ((version.title as string) || (article.title as string)).trim();
  const refCode = String(article.manuscript_reference_code ?? "").trim();
  const canonicalPath = publicArticlePath(journalSlug, refCode || articleCode);

  const citationWork = buildCitationWork({
    title: articleTitle,
    journalName: journal.name || journalSlug,
    publishedAt: article.published_at as string | null,
    doi: doiDisplay,
    articleUrl: `${getPublicSiteUrl()}${canonicalPath}`,
    authors: authorAffiliations,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 max-w-3xl flex-1 space-y-3">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.65rem] text-muted-foreground">
            <span className="font-semibold uppercase tracking-[0.16em]">{journal.name ?? journalSlug}</span>
            {articleTypeLabel ? (
              <>
                <span className="select-none font-semibold text-muted-foreground/80" aria-hidden>
                  ·
                </span>
                <span className="font-medium normal-case tracking-normal">{articleTypeLabel}</span>
              </>
            ) : null}
          </p>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {(version.title as string) || (article.title as string)}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs leading-relaxed">
            {doiDisplay ? (
              <div>
                <span className="font-medium text-foreground">DOI: </span>
                {doiLink && /^https?:\/\//i.test(doiLink) ? (
                  <a href={doiLink} className="text-primary underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                    {doiDisplay}
                  </a>
                ) : (
                  <span>{doiDisplay}</span>
                )}
              </div>
            ) : null}
            {refCode ? (
              <div>
                <span className="font-medium text-foreground">Manuscript ID: </span>
                <span className="font-mono">{refCode}</span>
              </div>
            ) : null}
            <JournalIssnDisplay issn_print={journal.issn_print} issn_online={journal.issn_online} variant="inline" />
            <ArticleCiteButton work={citationWork} citationDownloadBaseName={refCode || articleCode} />
          </div>
          {authorAffiliations.length > 0 ? <ArticlePublicByline authors={authorAffiliations} /> : null}
          <ArticlePublicationTimeline
            submittedAt={article.public_submitted_at as string | null | undefined}
            revisedAt={article.public_revised_at as string | null | undefined}
            acceptedAt={article.public_accepted_at as string | null | undefined}
            publishedAt={article.published_at as string | null | undefined}
          />
          {Array.isArray(article.keywords) && (article.keywords as string[]).length ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Keywords: </span>
              {(article.keywords as string[]).join(", ")}
            </p>
          ) : null}
        </div>
        <JournalCoverImage
          src={coverSrc}
          alt={`${journal.name ?? journalSlug} cover`}
          journalName={journal.name ?? journalSlug}
          className="aspect-[3/4] w-full max-w-[140px] shrink-0 self-start sm:max-w-[168px] md:max-w-[192px]"
          sizes="(max-width: 768px) 168px, 192px"
        />
      </div>

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
              paragraphFont="stix-two-text"
            />
          </section>

          {extra.references && extra.references.length > 0 ? (
            <section className="rounded-lg border bg-white p-6">
              <ArticleReferencesSection
                references={extra.references}
                paragraphFont="stix-two-text"
                className="border-0 pt-0"
              />
            </section>
          ) : null}

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

        <ArticlePublicSidebar tocItems={tocItems} manuscriptReferenceCode={refCode || null} />
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
