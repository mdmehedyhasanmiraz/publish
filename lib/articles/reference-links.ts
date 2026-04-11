/** DOI without URL prefix (trimmed). */
export function normalizeDoi(raw: string): string {
  let t = raw.trim();
  if (!t) return "";
  t = t.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  return t;
}

export function doiHref(doi: string): string {
  const t = normalizeDoi(doi);
  if (!t) return "#";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://doi.org/${t}`;
}

/** Crossref public search (works with DOI or free text). */
export function crossrefSearchUrl(query: string): string {
  const q = query.trim().slice(0, 500);
  return `https://search.crossref.org/?q=${encodeURIComponent(q)}`;
}

export function googleScholarSearchUrlFromReferenceText(text: string): string {
  const stripped = text
    .replace(/https?:\/\/(?:dx\.)?doi\.org\/[^\s]+/gi, " ")
    .replace(/\b10\.\d{4,9}\/[^\s,;)\]]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 450);
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(stripped || text.trim().slice(0, 450))}`;
}

export function extractDoiFromText(text: string): string | undefined {
  const m = text.match(/\b(10\.\d{4,9}\/[^\s<>"',;)]+)/i);
  if (!m?.[1]) return undefined;
  return normalizeDoi(m[1].replace(/[.,;)\]]+$/, ""));
}
