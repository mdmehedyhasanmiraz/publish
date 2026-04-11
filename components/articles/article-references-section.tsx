import type { ArticleReferenceRow } from "@/lib/articles/extra-metadata";
import {
  crossrefSearchUrl,
  doiHref,
  extractDoiFromText,
  googleScholarSearchUrlFromReferenceText,
  normalizeDoi,
} from "@/lib/articles/reference-links";
import { ebGaramond } from "@/lib/fonts/eb-garamond";
import { stixTwoText } from "@/lib/fonts/stix-two-text";
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

export function ArticleReferencesSection(props: {
  references: ArticleReferenceRow[];
  /** Match public article typography */
  paragraphFont?: "inherit" | "eb-garamond" | "stix-two-text";
  className?: string;
}) {
  const { references, paragraphFont = "inherit", className } = props;
  if (!references.length) return null;

  return (
    <section
      id="references"
      className={cn(
        "scroll-mt-24 not-prose border-t border-border pt-8",
        paragraphFont === "eb-garamond" && ebGaramond.variable,
        paragraphFont === "stix-two-text" && stixTwoText.variable,
        className,
      )}
    >
      <h2 className="text-xl font-semibold text-foreground">References</h2>
      <ol
        className={cn(
          "mt-4 list-decimal space-y-5 pl-6 text-slate-800",
          paragraphFont === "eb-garamond" &&
            "[&_p]:[font-family:var(--font-eb-garamond),Georgia,serif]",
          paragraphFont === "stix-two-text" &&
            "[&_p]:[font-family:var(--font-stix-two-text),Georgia,serif]",
        )}
      >
        {references.map((r, i) => {
          const n = i + 1;
          const doiForLink = r.doi?.trim() ? normalizeDoi(r.doi) : extractDoiFromText(r.text);
          return (
            <li key={i} id={`reference-${n}`} className="break-words pl-1 marker:font-medium">
              <p className="whitespace-pre-wrap text-[18px] leading-8">{r.text}</p>
              <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
                {doiForLink ? (
                  <a
                    href={doiHref(doiForLink)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline"
                  >
                    DOI
                  </a>
                ) : null}
                <a
                  href={crossrefSearchUrl(crossrefQueryForRef(r))}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline"
                >
                  Crossref
                </a>
                <a
                  href={scholarUrlForRef(r)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline"
                >
                  Google Scholar
                </a>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
