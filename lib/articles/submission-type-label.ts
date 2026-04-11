/** Human-readable label for `submissions.submission_type` / `articles.public_submission_type`. */
export function submissionTypeDisplay(slug: string | null | undefined): string | null {
  const raw = slug?.trim();
  if (!raw) return null;
  const k = raw.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    original_research: "Original research",
    review: "Review",
    review_article: "Review article",
    systematic_review: "Systematic review",
    meta_analysis: "Meta-analysis",
    case_report: "Case report",
    letter: "Letter",
    editorial: "Editorial",
    methodology: "Methodology",
    short_communication: "Short communication",
    commentary: "Commentary",
    perspective: "Perspective",
    book_review: "Book review",
    other: "Other",
  };
  if (map[k]) return map[k];
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPublicationDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
