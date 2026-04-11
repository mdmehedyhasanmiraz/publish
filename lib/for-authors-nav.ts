/** Shared labels and paths for author-facing policy pages (header, footer, journal home). */

export const forAuthorsCoreLinks = [
  { href: "/for-authors/submission-guidelines", label: "Submission guidelines" },
  { href: "/for-authors/contact", label: "Contact us" },
  { href: "/for-authors/journal-policy", label: "Journal policy (overview)" },
] as const;

export const forAuthorsPolicyLinks = [
  {
    href: "/for-authors/article-processing-charges",
    label: "Article processing charges (APC)",
  },
  { href: "/for-authors/plagiarism-policy", label: "Plagiarism policy" },
  { href: "/for-authors/ethics-statement", label: "Ethics statement" },
  {
    href: "/for-authors/retraction-correction-policy",
    label: "Retraction & correction policy",
  },
  {
    href: "/for-authors/conflict-of-interest-policy",
    label: "Conflict of interest policy",
  },
] as const;
