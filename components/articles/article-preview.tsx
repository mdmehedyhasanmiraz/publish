import type { ArticleReferenceRow } from "@/lib/articles/extra-metadata";
import { ArticleReferencesSection } from "@/components/articles/article-references-section";
import { renderArticleMarkdownToHtml } from "@/lib/articles/markdown";
import { ebGaramond } from "@/lib/fonts/eb-garamond";
import { stixTwoText } from "@/lib/fonts/stix-two-text";
import { cn } from "@/lib/utils";

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
  superscriptCitations = true,
}: {
  markdownBody: string;
  /** When set, used as the article body HTML instead of rendering `markdownBody` (e.g. pre-built with heading ids). */
  bodyHtml?: string;
  assets: ArticleAsset[];
  /** Optional abstract shown above the body (Markdown + [n] citations). */
  abstractMarkdown?: string;
  references?: ArticleReferenceRow[];
  /** Body paragraphs only; headings keep the site default font. */
  paragraphFont?: "inherit" | "eb-garamond" | "stix-two-text";
  superscriptCitations?: boolean;
}) {
  const sorted = [...assets].sort((a, b) => a.sort_order - b.sort_order);
  const abstractHtml = abstractMarkdown?.trim()
    ? renderArticleMarkdownToHtml(abstractMarkdown, [], { superscriptCitations })
    : "";
  const html = bodyHtml ?? renderArticleMarkdownToHtml(markdownBody, sorted, { superscriptCitations });
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none [&_p]:text-[18px] [&_p]:leading-8",
        paragraphFont === "eb-garamond" && ebGaramond.variable,
        paragraphFont === "eb-garamond" &&
          "[&_p]:[font-family:var(--font-eb-garamond),Georgia,serif]",
        paragraphFont === "stix-two-text" && stixTwoText.variable,
        paragraphFont === "stix-two-text" &&
          "[&_p]:[font-family:var(--font-stix-two-text),Georgia,serif]",
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
        <div className="mt-10">
          <ArticleReferencesSection references={references} paragraphFont={paragraphFont} />
        </div>
      ) : null}
    </div>
  );
}
