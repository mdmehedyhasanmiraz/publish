import { createClient } from "@/lib/supabase/server";

export type PublisherOption = { id: string; name: string; slug: string };

export async function getSessionUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Single-publisher model.
 * Returns the single publisher id when the table exists, otherwise null.
 * This prevents hard crashes in environments where migrations are incomplete.
 */
export async function getPublisherId(): Promise<string | null> {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("publishers")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return null;
  }

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("publishers")
    .insert({ name: "PublisherOS", slug: "publisheros" })
    .select("id")
    .single();

  if (error || !created) return null;

  return created.id as string;
}

export async function getJournalsForPublisher() {
  const publisherId = await getPublisherId();
  const supabase = await createClient();
  const query = supabase.from("journals").select("id, name, slug").order("name");
  const { data } = publisherId ? await query.eq("publisher_id", publisherId) : await query;
  return data ?? [];
}

export async function getVolumesForJournal(journalId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("volumes")
    .select("id, volume_number, volume_slug, published_year, journal_id")
    .eq("journal_id", journalId)
    .order("volume_number", { ascending: false });
  return data ?? [];
}

/** All journals the current user may submit to (single publisher = all journals). */
export async function getJournalsForSubmission() {
  return getJournalsForPublisher();
}
