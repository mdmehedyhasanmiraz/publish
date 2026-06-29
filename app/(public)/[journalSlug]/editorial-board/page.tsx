import Link from "next/link";
import { notFound } from "next/navigation";
import { JournalIssnDisplay } from "@/components/public/journal-issn-display";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ journalSlug: string }> };

const POSITION_ORDER = [
  "Editor-in-Chief",
  "Deputy Editor-in-Chief",
  "Managing Editor",
  "Associate Editor",
  "Section Editor",
  "Academic Editor",
  "Editorial Board Member",
  "Advisory Board Member",
];

function getPositionWeight(pos: string): number {
  const index = POSITION_ORDER.indexOf(pos);
  return index === -1 ? 999 : index;
}

export default async function JournalEditorialBoardPage({ params }: Props) {
  const { journalSlug } = await params;
  const supabase = await createClient();

  // Get the journal details
  const { data: journal, error: journalError } = await supabase
    .from("journals")
    .select("id, name, slug, issn_print, issn_online")
    .eq("slug", journalSlug)
    .maybeSingle();

  if (journalError || !journal) notFound();

  // Get all editorial board members
  const { data: members } = await supabase
    .from("editorial_board_members")
    .select("id, name, email, affiliation, position, photo_path, orcid, profile_url, sort_order, google_scholar_url, researchgate_url, scopus_url, loop_url")
    .eq("journal_id", journal.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  type BoardMember = {
    id: string;
    name: string;
    email: string | null;
    affiliation: string;
    position: string;
    photo_path: string | null;
    orcid: string | null;
    profile_url: string | null;
    sort_order: number;
    google_scholar_url: string | null;
    researchgate_url: string | null;
    scopus_url: string | null;
    loop_url: string | null;
  };

  const boardMembers = (members ?? []) as BoardMember[];
  const hasMembers = boardMembers.length > 0;

  // Group members by position
  const groupedMembers: { [position: string]: BoardMember[] } = {};
  if (hasMembers) {
    for (const member of boardMembers) {
      if (!groupedMembers[member.position]) {
        groupedMembers[member.position] = [];
      }
      groupedMembers[member.position].push(member);
    }
  }

  // Sort the positions based on custom hierarchy
  const sortedPositions = Object.keys(groupedMembers).sort((a, b) => {
    const weightA = getPositionWeight(a);
    const weightB = getPositionWeight(b);
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    return a.localeCompare(b);
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-16">
      <p className="text-sm text-muted-foreground">
        <Link href={`/${journal.slug}`} className="font-medium text-teal-600 hover:underline">
          ← {journal.name}
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Editorial Board</h1>
      <p className="mt-2 text-lg text-muted-foreground">{journal.name}</p>
      <JournalIssnDisplay issn_print={journal.issn_print} issn_online={journal.issn_online} className="mt-2" />

      <div className="mt-12 space-y-12">
        {hasMembers ? (
          sortedPositions.map((position) => (
            <section key={position} className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-1.5">
                {position}
              </h2>
              <div className="divide-y divide-slate-100">
                {groupedMembers[position].map((member) => (
                  <div
                    key={member.id}
                    className="py-3 flex flex-col gap-1 text-sm"
                  >
                    <div className="font-semibold text-slate-900">{member.name}</div>
                    <div className="text-slate-600 font-normal">{member.affiliation}</div>
                    
                    {member.orcid && (
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="text-green-600 font-semibold">ORCID:</span>
                        <a
                          href={`https://orcid.org/${member.orcid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-teal-600 hover:underline text-teal-600"
                        >
                          {member.orcid}
                        </a>
                      </div>
                    )}
                    
                    {(member.email || member.profile_url || member.google_scholar_url || member.researchgate_url || member.scopus_url || member.loop_url) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-0.5">
                        {member.email && (
                          <a href={`mailto:${member.email}`} className="hover:text-teal-600 hover:underline">
                            Email
                          </a>
                        )}
                        {member.profile_url && (
                          <a
                            href={member.profile_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-teal-600 hover:underline font-medium"
                          >
                            Web Profile
                          </a>
                        )}
                        {member.google_scholar_url && (
                          <a
                            href={member.google_scholar_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-teal-600 hover:underline"
                          >
                            Google Scholar
                          </a>
                        )}
                        {member.researchgate_url && (
                          <a
                            href={member.researchgate_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-teal-600 hover:underline"
                          >
                            ResearchGate
                          </a>
                        )}
                        {member.scopus_url && (
                          <a
                            href={member.scopus_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-teal-600 hover:underline"
                          >
                            Scopus
                          </a>
                        )}
                        {member.loop_url && (
                          <a
                            href={member.loop_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-teal-600 hover:underline"
                          >
                            Loop
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
            <p className="text-sm text-muted-foreground">
              The editorial board list for this journal is currently being updated. Please check back later.
            </p>
          </div>
        )}
      </div>

      <div className="mt-16 flex flex-wrap gap-4 text-sm border-t border-slate-100 pt-8">
        <Link
          className="rounded-md border border-border bg-background px-4 py-2 font-medium hover:bg-muted/60"
          href={`/${journal.slug}`}
        >
          Journal home
        </Link>
        <Link
          className="rounded-md border border-border bg-background px-4 py-2 font-medium hover:bg-muted/60"
          href={`/${journal.slug}/aims-and-scope`}
        >
          Aims &amp; scope
        </Link>
        <Link
          className="rounded-md border border-border bg-background px-4 py-2 font-medium hover:bg-muted/60"
          href={`/${journal.slug}/archive`}
        >
          Archive
        </Link>
      </div>
    </main>
  );
}
