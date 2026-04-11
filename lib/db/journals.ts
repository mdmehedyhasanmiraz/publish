import { createClient } from "@/lib/supabase/server";

export type JournalOption = {
  id: string;
  name: string;
  slug: string;
  submission_areas: string[] | null;
  submission_types: string[] | null;
  cover_image_path: string | null;
};

export async function getJournals(): Promise<JournalOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journals")
    .select("id, name, slug, submission_areas, submission_types, cover_image_path")
    .order("name");
  return (data ?? []) as JournalOption[];
}

/** Most recently created journals (UUID order) for nav mega-menu. */
export async function getLatestJournalsForNav(limit = 6): Promise<JournalOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journals")
    .select("id, name, slug, submission_areas, submission_types, cover_image_path")
    .order("id", { ascending: false })
    .limit(limit);
  return (data ?? []) as JournalOption[];
}

export async function getJournalBySlug(slug: string): Promise<JournalOption | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journals")
    .select("id, name, slug, submission_areas, submission_types, cover_image_path")
    .eq("slug", slug)
    .maybeSingle();
  return (data ?? null) as JournalOption | null;
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

