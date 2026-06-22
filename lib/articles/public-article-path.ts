/**
 * Public article URLs use the manuscript reference code (e.g. IJBMR-2026-000042), not the article slug.
 */
export function normalizeManuscriptReferenceCodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw).trim().toUpperCase();
  } catch {
    return raw.trim().toUpperCase();
  }
}

export function publicArticlePath(journalSlug: string, manuscriptReferenceCode: string): string {
  const code = manuscriptReferenceCode.trim();
  return `${journalSlug}/article/${encodeURIComponent(code)}`;
}
