import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** List image objects in `covers/journals/{journalId}/` for the admin picker. */
export async function listJournalCoverFiles(
  supabase: SupabaseClient,
  journalId: string,
): Promise<{ path: string; name: string }[]> {
  const folder = `journals/${journalId}`;
  const { data, error } = await supabase.storage.from("covers").list(folder, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error || !data?.length) return [];

  return data
    .filter((f) => f.name && !f.name.endsWith("/") && IMAGE_EXT.test(f.name))
    .map((f) => ({
      name: f.name,
      path: `${folder}/${f.name}`,
    }));
}
