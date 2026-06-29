import { EditorialBoardManagement } from "@/components/forms/editorial-board-management";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function AdminJournalEditorialBoardPage({
  params,
}: {
  params: Promise<{ journalId: string }>;
}) {
  const { journalId } = await params;
  const supabase = await createClient();

  // Get the journal
  const { data: journal } = await supabase
    .from("journals")
    .select("id, name")
    .eq("id", journalId)
    .maybeSingle();

  if (!journal) notFound();

  // Fetch editorial board members
  const { data: members } = await supabase
    .from("editorial_board_members")
    .select("id, journal_id, name, email, affiliation, position, photo_path, orcid, profile_url, sort_order, google_scholar_url, researchgate_url, scopus_url, loop_url")
    .eq("journal_id", journalId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <EditorialBoardManagement
      journalId={journal.id}
      journalName={journal.name}
      initialMembers={members ?? []}
    />
  );
}
