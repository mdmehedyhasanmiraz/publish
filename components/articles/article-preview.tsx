import type { ArticleReferenceRow } from "@/lib/articles/extra-metadata";
import {
  crossrefSearchUrl,
  doiHref,
  extractDoiFromText,
  googleScholarSearchUrlFromReferenceText,
  normalizeDoi,
} from "@/lib/articles/reference-links";
import { renderArticleMarkdownToHtml } from "@/lib/articles/markdown";
import { ebGaramond } from "@/lib/fonts/eb-garamond";
import { cn } from "@/lib/utils";

function crossrefQueryForRef(r: ArticleReferenceRow): string {
  const d = r.doi?.trim() ? normalizeDoi(r.doi) : extractDoiFromText(r.text);
  return d || r.text.trim().slice(0, 400);
}

function scholarUrlForRef(r: ArticleReferenceRow): string {
  const u = r.google_scholar_url?.trim();
  if (u) return u;
  return googleScholarSearchUrlFromReferenceText(r.text);
}

type ArticleAsset = {
  id: string;
  asset_key: string;
  asset_type: "figure" | "table";
  caption: string | null;
  alt_text: string | null;
  table_markdown: string | null;
  storage_path: string | null;
  sort_order: number;
};

export function ArticlePreview({
  markdownBody,
  bodyHtml,
  assets,
  abstractMarkdown,
  references,
  paragraphFont = "inherit",
}: {
  markdownBody: string;
  /** When set, used as the article body HTML instead of rendering `markdownBody` (e.g. pre-built with heading ids). */
  bodyHtml?: string;
  assets: ArticleAsset[];
  /** Optional abstract shown above the body (Markdown + [n] citations). */
  abstractMarkdown?: string;
  references?: ArticleReferenceRow[];
  /** `eb-garamond`: body paragraphs only; headings keep the site default font. */
  paragraphFont?: "inherit" | "eb-garamond";
}) {
  const sorted = [...assets].sort((a, b) => a.sort_order - b.sort_order);
  const abstractHtml = abstractMarkdown?.trim()
    ? renderArticleMarkdownToHtml(abstractMarkdown, [])
    : "";
  const html = bodyHtml ?? renderArticleMarkdownToHtml(markdownBody, sorted);
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none [&_p]:text-[18px] [&_p]:leading-8",
        paragraphFont === "eb-garamond" && ebGaramond.variable,
        paragraphFont === "eb-garamond" &&
          "[&_p]:[font-family:var(--font-eb-garamond),Georgia,serif]",
      )}
    >
      {abstractHtml ? (
        <div className="mb-8 border-b pb-6">
          <h2 className="text-lg font-semibold text-foreground">Abstract</h2>
          <div dangerouslySetInnerHTML={{ __html: abstractHtml }} />
        </div>
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {references && references.length > 0 ? (
        <section id="references" className="mt-10 scroll-mt-24 border-t pt-6 not-prose">
          <h2 className="text-lg font-semibold text-foreground">References</h2>
          <ol className="mt-3 list-decimal space-y-4 pl-6 text-[16px] leading-7 text-slate-800">
            {references.map((r, i) => {
              const n = i + 1;
              const doiForLink = r.doi?.trim() ? normalizeDoi(r.doi) : extractDoiFromText(r.text);
              return (
                <li key={i} id={`reference-${n}`} className="break-words pl-1 marker:font-medium">
                  <p className="whitespace-pre-wrap text-[18px] leading-8">{r.text}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs">
                    {doiForLink ? (
                      <a
                        href={doiHref(doiForLink)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        DOI
                      </a>
                    ) : null}
                    <a
                      href={crossrefSearchUrl(crossrefQueryForRef(r))}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      Crossref
                    </a>
                    <a
                      href={scholarUrlForRef(r)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      Google Scholar
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

