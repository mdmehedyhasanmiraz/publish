/** Stored in `article_versions.extra_metadata`. */
export type ArticleReferenceRow = {
  /** Full reference line (paste from manuscript). */
  text: string;
  /** Optional DOI (with or without https://doi.org/). */
  doi?: string;
  /** Optional Google Scholar search or profile URL. */
  google_scholar_url?: string;
};

export type ArticleExtraMetadata = {
  acknowledgement?: string;
  competing_interests?: string;
  references?: ArticleReferenceRow[];
};

export function parseArticleExtraMetadata(raw: unknown): ArticleExtraMetadata {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const refs = Array.isArray(o.references)
    ? o.references
        .map((r): ArticleReferenceRow | null => {
          if (!r || typeof r !== "object") return null;
          const x = r as Record<string, unknown>;
          const text = typeof x.text === "string" ? x.text : "";
          if (!text.trim()) return null;
          const row: ArticleReferenceRow = { text };
          if (typeof x.doi === "string") row.doi = x.doi;
          if (typeof x.google_scholar_url === "string") row.google_scholar_url = x.google_scholar_url;
          return row;
        })
        .filter((x): x is ArticleReferenceRow => x != null)
    : undefined;
  return {
    acknowledgement: typeof o.acknowledgement === "string" ? o.acknowledgement : undefined,
    competing_interests: typeof o.competing_interests === "string" ? o.competing_interests : undefined,
    references: refs,
  };
}
