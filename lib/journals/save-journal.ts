import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export type JournalSaveResult = { ok: boolean; message?: string; id?: string };

function parseCsvArray(value: FormDataEntryValue | null): string[] {
  const raw = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(raw));
}

function optionalTrimmedText(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

/** Shared by API route (avoids flaky Next.js server-action RPC in dev). */
export async function saveJournalFromFormData(formData: FormData): Promise<JournalSaveResult> {
  try {
    const journalId = String(formData.get("journal_id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const slugRaw = String(formData.get("slug") ?? "").trim();
    const slug = slugRaw ? slugify(slugRaw) : slugify(name);
    const submissionAreas = parseCsvArray(formData.get("submission_areas"));
    const submissionTypes = parseCsvArray(formData.get("submission_types"));
    const issnPrint = optionalTrimmedText(formData.get("issn_print"));
    const issnOnline = optionalTrimmedText(formData.get("issn_online"));
    const status = optionalTrimmedText(formData.get("status"));
    const isOpenAccess = formData.get("is_open_access") === "on";

    if (!name || !slug) {
      return { ok: false, message: "Name and slug are required." };
    }

    const supabase = await createClient();

    if (journalId) {
      const { data, error } = await supabase
        .from("journals")
        .update({
          name,
          slug,
          submission_areas: submissionAreas,
          submission_types: submissionTypes,
          issn_print: issnPrint,
          issn_online: issnOnline,
          status,
          is_open_access: isOpenAccess,
        })
        .eq("id", journalId)
        .select("id")
        .maybeSingle();

      if (error) return { ok: false, message: error.message };
      if (!data) {
        return {
          ok: false,
          message:
            "Could not update this journal. You may not have permission, or the journal no longer exists.",
        };
      }

      revalidatePath("/admin/journals");
      revalidatePath(`/admin/journals/${journalId}`);
      revalidatePath("/journals");
      revalidatePath(`/j/${slug}`);
      revalidatePath(`/j/${slug}/archive`);
      return { ok: true, id: journalId, message: "Journal updated." };
    }

    const { data, error } = await supabase
      .from("journals")
      .insert({
        name,
        slug,
        submission_areas: submissionAreas,
        submission_types: submissionTypes,
        issn_print: issnPrint,
        issn_online: issnOnline,
        status,
        is_open_access: isOpenAccess,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/journals");
    revalidatePath("/journals");
    revalidatePath(`/j/${slug}`);
    revalidatePath(`/j/${slug}/archive`);
    return { ok: true, id: data.id, message: "Journal created." };
  } catch (e: unknown) {
    console.error("saveJournalFromFormData", e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Something went wrong while saving the journal.",
    };
  }
}
