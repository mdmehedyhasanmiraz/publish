import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArticlePreview } from "@/components/articles/article-preview";
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
import { buildCitationWork } from "@/lib/articles/citation-formats";
import { getPublicSiteUrl } from "@/lib/site-url";
import { normalizeManuscriptReferenceCodeParam, publicArticlePath } from "@/lib/articles/public-article-path";
import { jatsXmlToMarkdown } from "@/lib/articles/jats";

type Props = { params: Promise<{ journalSlug: string; articleCode: string }> };

type PublicJournalArticleHeader = {
  id: string;
  name: string | null;
  slug: string | null;
  cover_image_path: string | null;
  issn_print: string | null;
  issn_online: string | null;
};

const getArticleData = cache(async (journalSlug: string, articleCodeRaw: string) => {
  const articleCode = normalizeManuscriptReferenceCodeParam(articleCodeRaw);
  const supabase = await createClient();

  const { data: journalRaw } = await supabase
    .from("journals")
    .select("id, name, slug, cover_image_path, issn_print, issn_online")
    .eq("slug", journalSlug)
    .maybeSingle();
  if (!journalRaw?.id) return null;
  const journal = journalRaw as PublicJournalArticleHeader;

  const { data: article } = await supabase
    .from("articles")
    .select("*, issues(issue_slug, volumes(volume_slug))")
    .eq("journal_id", journal.id)
    .eq("manuscript_reference_code", articleCode)
    .eq("status", "published")
    .maybeSingle();
  if (!article?.current_version_id) return null;

  const { data: version } = await supabase
    .from("article_versions")
    .select("id, title, abstract, jats_xml, workflow_status")
    .eq("id", article.current_version_id as string)
    .eq("workflow_status", "published")
    .maybeSingle();
  if (!version) return null;

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

  const issueObj = (article as any).issues;
  const issue = Array.isArray(issueObj) ? issueObj[0] : issueObj;
  const volumeObj = issue?.volumes;
  const volume = Array.isArray(volumeObj) ? volumeObj[0] : volumeObj;
  
  const volumeSlug = volume?.volume_slug ? String(volume.volume_slug) : null;
  const issueSlug = issue?.issue_slug ? String(issue.issue_slug) : null;

  return {
    journal,
    article,
    version,
    assets: assets ?? [],
    authorAffiliations,
    volumeSlug,
    issueSlug,
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { journalSlug, articleCode: articleCodeRaw } = await params;
  const data = await getArticleData(journalSlug, articleCodeRaw);
  if (!data) {
    return { title: `${articleCodeRaw} | Sciencelet` };
  }

  const { journal, article, version, authorAffiliations } = data;
  const articleTitle = ((version.title as string) || (article.title as string)).trim();
  const articleAbstract = (version.abstract as string | null || article.abstract as string | null || "").trim();

  const keywordsArray = Array.isArray(article.keywords) ? (article.keywords as string[]) : [];
  const doiDisplay = (article.doi as string | null)?.trim() || null;
  const publishedAtStr = article.published_at as string | null;

  const formattedPublishDate = publishedAtStr
    ? new Date(publishedAtStr).toISOString().split('T')[0].replace(/-/g, '/')
    : "";

  const authorNames = authorAffiliations.map(author => {
    return [author.first_name, author.middle_name, author.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }).filter(Boolean);

  const canonicalPath = publicArticlePath(journalSlug, String(article.manuscript_reference_code || articleCodeRaw).trim());
  const articleUrl = `${getPublicSiteUrl()}${canonicalPath}`;

  const otherMeta: Record<string, string | string[]> = {
    // Dublin Core Metadata
    "dc.title": articleTitle,
    "dc.date": publishedAtStr ? publishedAtStr.split('T')[0] : "",
    "dc.relation": journal.name ?? journalSlug,
    "dc.language": "en",

    // Google Scholar / HighWire Press Metadata
    "citation_title": articleTitle,
    "citation_journal_title": journal.name ?? journalSlug,
    "citation_abstract_html_url": articleUrl,
  };

  if (authorNames.length > 0) {
    otherMeta["dc.creator"] = authorNames;
    otherMeta["citation_author"] = authorNames;
  }

  if (doiDisplay) {
    otherMeta["dc.identifier"] = `doi:${doiDisplay}`;
    otherMeta["citation_doi"] = doiDisplay;
  } else {
    otherMeta["dc.identifier"] = articleUrl;
  }

  if (articleAbstract) {
    otherMeta["dc.description"] = articleAbstract;
  }

  if (keywordsArray.length > 0) {
    otherMeta["dc.subject"] = keywordsArray.join("; ");
    otherMeta["citation_keywords"] = keywordsArray.join(", ");
  }

  if (formattedPublishDate) {
    otherMeta["citation_publication_date"] = formattedPublishDate;
  }

  if (journal.issn_print) {
    otherMeta["citation_issn"] = journal.issn_print;
  }
  if (journal.issn_online) {
    if (Array.isArray(otherMeta["citation_issn"])) {
      (otherMeta["citation_issn"] as string[]).push(journal.issn_online);
    } else if (typeof otherMeta["citation_issn"] === "string") {
      otherMeta["citation_issn"] = [otherMeta["citation_issn"], journal.issn_online];
    } else {
      otherMeta["citation_issn"] = journal.issn_online;
    }
  }

  return {
    title: `${articleTitle} | Sciencelet`,
    description: articleAbstract || undefined,
    keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
    other: otherMeta,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { journalSlug, articleCode: articleCodeRaw } = await params;
  const articleCode = normalizeManuscriptReferenceCodeParam(articleCodeRaw);
  const data = await getArticleData(journalSlug, articleCodeRaw);
  if (!data) notFound();

  const { journal, article, version, assets, authorAffiliations, volumeSlug, issueSlug } = data;
  const coverSrc = publicCoverUrl(journal.cover_image_path ?? null);

  const mdBody =
    typeof (version as { jats_xml?: unknown }).jats_xml === "string" && String((version as { jats_xml: string }).jats_xml).trim()
      ? jatsXmlToMarkdown(String((version as { jats_xml: string }).jats_xml))
      : "";
  const hasAbstractHeadingInBody = /(^|\n)#{1,3}\s*abstract\b/i.test(mdBody);

  const { html: bodyHtml, toc: bodyToc } = renderArticleMarkdownToHtmlWithToc(mdBody, (assets ?? []) as never, { superscriptCitations: false });

  /** Sidebar outline from article body headings (`##` + `###`). */
  const tocItems: ArticleTocItem[] = bodyToc.filter((item) => item.level === 2);

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
    <main className="mx-auto max-w-7xl px-6 py-6 sm:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 max-w-4xl flex-1 space-y-2.5">
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs leading-relaxed text-slate-500">
            {volumeSlug && (
              <div>
                <span className="font-medium text-foreground">Vol. {volumeSlug}</span>
              </div>
            )}
            {issueSlug && (
              <div>
                <span className="font-medium text-foreground">No. {issueSlug}</span>
              </div>
            )}
            {(volumeSlug || issueSlug) && doiDisplay ? (
              <span className="select-none text-slate-300" aria-hidden>·</span>
            ) : null}
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

            <JournalIssnDisplay issn_print={journal.issn_print} issn_online={journal.issn_online} variant="inline" />
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl mt-4">
            {(version.title as string) || (article.title as string)}
          </h1>
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
          className="aspect-[3/4] w-full max-w-[100px] shrink-0 self-start sm:max-w-[110px] md:max-w-[120px]"
          sizes="(max-width: 768px) 110px, 120px"
        />
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_min(240px,30%)] lg:items-start lg:gap-12">
        <div className="min-w-0 max-w-4xl space-y-6">
          <section className="bg-white py-6 pr-6">
            <ArticlePreview
              abstractMarkdown={hasAbstractHeadingInBody ? "" : (((version.abstract as string | null) ?? (article.abstract as string | null) ?? "") as string)}
              markdownBody={mdBody}
              bodyHtml={bodyHtml}
              assets={(assets ?? []) as never}
              paragraphFont="stix-two-text"
              superscriptCitations={false}
            />
          </section>

        </div>

        <ArticlePublicSidebar
          tocItems={tocItems}
          citationWork={citationWork}
          citationDownloadBaseName={refCode || articleCode}
        />
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
