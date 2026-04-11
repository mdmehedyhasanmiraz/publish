/** Path stored in journals.cover_image_path / issues.cover_image_path (no leading slash). */
export function publicCoverUrl(path: string | null | undefined): string | null {
  const p = path?.trim();
  if (!p) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  const clean = p.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/covers/${clean}`;
}

/** Issue listing / cards: use issue cover when set, otherwise the journal default. */
export function resolvedCoverUrl(
  issueCoverPath: string | null | undefined,
  journalCoverPath: string | null | undefined,
): string | null {
  return publicCoverUrl(issueCoverPath ?? journalCoverPath ?? null);
}
