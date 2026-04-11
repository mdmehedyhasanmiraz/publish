/** Awaiting initial editorial handling (not yet in active peer review). */
export const AUTHOR_SUBMITTED_STATUSES = ["submitted", "admin_check"] as const;

export const AUTHOR_SUBMITTED_STATUS_SET = new Set<string>(AUTHOR_SUBMITTED_STATUSES);

/**
 * Handling editor assigned and/or peer review / revision cycle.
 * Excludes raw “submitted” — those are listed under Submitted.
 */
export const AUTHOR_IN_REVIEW_STATUSES = [
  "editor_assigned",
  "under_review",
  "revision_requested",
  "revised_submission",
] as const;

export const AUTHOR_IN_REVIEW_STATUS_SET = new Set<string>(AUTHOR_IN_REVIEW_STATUSES);

export type AuthorSubmissionListFilter =
  | "submitted"
  | "under-review"
  | "accepted"
  | "published"
  | "rejected";

export function parseAuthorSubmissionListFilter(
  value: string | null | undefined,
): AuthorSubmissionListFilter | null {
  if (!value) return null;
  if (
    value === "submitted" ||
    value === "under-review" ||
    value === "accepted" ||
    value === "published" ||
    value === "rejected"
  ) {
    return value;
  }
  return null;
}
