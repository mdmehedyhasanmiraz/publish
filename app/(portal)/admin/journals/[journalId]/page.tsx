import { JournalEditorPage } from "@/components/forms/journal-editor-page";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditJournalPage({
  params,
}: {
  params: Promise<{ journalId: string }>;
}) {
  const { journalId } = await params;
  const supabase = await createClient();
  const { data: journal, error } = await supabase
    .from("journals")
    .select(
      "id, name, slug, submission_areas, submission_types, cover_image_path, issn_print, issn_online, status, is_open_access",
    )
    .eq("id", journalId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching journal:", error);
  }

  if (!journal) notFound();

  return <JournalEditorPage mode="edit" journal={journal} />;
}
