"use server";

import { createClient } from "@/lib/supabase/server";
import { getVolumesForJournal } from "@/lib/db/journals";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export type ActionState = { ok: boolean; message?: string; id?: string };

export async function createVolumeAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const journalId = String(formData.get("journal_id") ?? "");
  const volumeNumber = Number(formData.get("volume_number"));
  const volumeSlugRaw = String(formData.get("volume_slug") ?? "").trim();
  const publishedYearRaw = String(formData.get("published_year") ?? "").trim();
  const publishedYear = publishedYearRaw ? Number(publishedYearRaw) : null;
  const volumeSlug = volumeSlugRaw ? slugify(volumeSlugRaw) : `vol-${volumeNumber}`;

  if (!journalId || !Number.isFinite(volumeNumber)) {
    return { ok: false, message: "Journal and volume number are required." };
  }

  const supabase = await createClient();
  const insertRow = {
    journal_id: journalId,
    volume_number: volumeNumber,
    volume_slug: volumeSlug,
    published_year: publishedYear,
  };

  const { data, error } = await supabase
    .from("volumes")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/volumes");
  return { ok: true, id: data.id, message: "Volume created." };
}

export async function createIssueAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const journalId = String(formData.get("journal_id") ?? "");
  const volumeId = String(formData.get("volume_id") ?? "");
  const issueNumberRaw = String(formData.get("issue_number") ?? "").trim();
  const issueNumber = issueNumberRaw === "" ? null : Number(issueNumberRaw);
  const issueSlugRaw = String(formData.get("issue_slug") ?? "").trim();
  const issueSlug = issueSlugRaw ? slugify(issueSlugRaw) : issueNumber != null ? `issue-${issueNumber}` : "";

  if (!journalId || !volumeId || !issueSlug) {
    return { ok: false, message: "Journal, volume, and issue slug (or number) are required." };
  }

  const supabase = await createClient();
  const insertRow = {
    journal_id: journalId,
    volume_id: volumeId,
    issue_number: issueNumber,
    issue_slug: issueSlug,
  };

  const { data, error } = await supabase
    .from("issues")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/issues");
  return { ok: true, id: data.id, message: "Issue created." };
}

export async function listVolumesForJournalAction(journalId: string) {
  if (!journalId) return [];
  return getVolumesForJournal(journalId);
}
