/** Raw rows from `submissions.author_affiliations` (wizard step 3). */
export type PublicArticleAuthorRow = {
  salutation?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  orcid_id?: string;
  is_corresponding_author?: boolean;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_region?: string;
  postal_code?: string;
  country_code?: string;
  credit_roles?: string[];
  affiliations?: Array<{
    institution_name?: string;
    department?: string;
    city?: string;
    country_code?: string;
  }>;
};

export type AffiliationFootnote = { n: number; text: string };

export type AuthorBylineSegment = {
  displayName: string;
  affiliationSuperscripts: number[];
  isCorresponding: boolean;
  orcidHref: string | null;
  author: PublicArticleAuthorRow;
};

function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function affiliationKey(af: NonNullable<PublicArticleAuthorRow["affiliations"]>[number], author: PublicArticleAuthorRow): string {
  return [
    norm(af.department),
    norm(af.institution_name),
    norm(author.address_line1),
    norm(author.address_line2),
    norm(af.city || author.city),
    norm(author.state_region),
    norm(author.postal_code),
    norm(af.country_code || author.country_code),
  ].join("|");
}

/** Department, organization, address lines, postal code, country — comma-separated. */
export function formatAffiliationFootnoteText(
  af: NonNullable<PublicArticleAuthorRow["affiliations"]>[number],
  author: PublicArticleAuthorRow,
): string {
  const parts = [
    typeof af.department === "string" ? af.department.trim() : "",
    typeof af.institution_name === "string" ? af.institution_name.trim() : "",
    typeof author.address_line1 === "string" ? author.address_line1.trim() : "",
    typeof author.address_line2 === "string" ? author.address_line2.trim() : "",
    String(af.city || author.city || "").trim(),
    typeof author.state_region === "string" ? author.state_region.trim() : "",
    typeof author.postal_code === "string" ? author.postal_code.trim() : "",
    String(af.country_code || author.country_code || "").trim(),
  ].filter((x) => x.length > 0);
  return parts.join(", ");
}

export function orcidProfileHref(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const id = t.replace(/^https?:\/\/(www\.)?orcid\.org\//i, "").replace(/^\/+/, "").trim();
  if (!id) return null;
  return `https://orcid.org/${id}`;
}

export function buildPublicArticleAuthorByline(authors: PublicArticleAuthorRow[]): {
  segments: AuthorBylineSegment[];
  footnotes: AffiliationFootnote[];
} {
  const footnotes: AffiliationFootnote[] = [];
  const indexByKey = new Map<string, number>();

  for (const author of authors) {
    const list = Array.isArray(author.affiliations) ? author.affiliations : [];
    for (const af of list) {
      const key = affiliationKey(af, author);
      const text = formatAffiliationFootnoteText(af, author);
      if (!text) continue;
      if (!indexByKey.has(key)) {
        indexByKey.set(key, footnotes.length + 1);
        footnotes.push({ n: footnotes.length + 1, text });
      }
    }
  }

  const segments: AuthorBylineSegment[] = authors.map((author) => {
    const displayName = [author.first_name, author.middle_name, author.last_name, author.suffix]
      .filter((x) => x && String(x).trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const affList = Array.isArray(author.affiliations) ? author.affiliations : [];
    const supers: number[] = [];
    for (const af of affList) {
      const key = affiliationKey(af, author);
      const text = formatAffiliationFootnoteText(af, author);
      if (!text) continue;
      const idx = indexByKey.get(key);
      if (idx != null && !supers.includes(idx)) supers.push(idx);
    }
    supers.sort((a, b) => a - b);
    return {
      displayName: displayName || "Author",
      affiliationSuperscripts: supers,
      isCorresponding: Boolean(author.is_corresponding_author),
      orcidHref: orcidProfileHref(author.orcid_id),
      author,
    };
  });

  return { segments, footnotes };
}
