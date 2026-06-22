import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JournalCoverImage } from "@/components/public/journal-cover-image";
import { JournalIssnDisplay } from "@/components/public/journal-issn-display";
import { getJournalBySlug } from "@/lib/db/journals";
import { resolvedCoverUrl } from "@/lib/storage/covers";

type Props = { params: Promise<{ journalSlug: string }> };

type VolumeEmbed = {
  volume_number: number;
  volume_slug: string;
  published_year: number | null;
};

type IssueRow = {
  id: string;
  issue_number: number | null;
  issue_slug: string;
  cover_image_path: string | null;
  volumes: VolumeEmbed | VolumeEmbed[] | null;
};

function volumeOf(issue: IssueRow): VolumeEmbed | null {
  const v = issue.volumes;
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function ArchivePage({ params }: Props) {
  const { journalSlug } = await params;
  const journal = await getJournalBySlug(journalSlug);
  if (!journal) notFound();

  const supabase = await createClient();
  const { data: issues } = await supabase
    .from("issues")
    .select("id, issue_number, issue_slug, cover_image_path, volumes(volume_number, volume_slug, published_year)")
    .eq("journal_id", journal.id);

  const rows = [...((issues ?? []) as IssueRow[])].sort((a, b) => {
    const va = volumeOf(a)?.volume_number ?? 0;
    const vb = volumeOf(b)?.volume_number ?? 0;
    if (vb !== va) return vb - va;
    return (b.issue_number ?? 0) - (a.issue_number ?? 0);
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm text-muted-foreground">
        <Link href={`${journal.slug}`} className="font-medium text-primary hover:underline">
          ← {journal.name}
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Archive</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Issues are listed with their cover when available; otherwise the journal&apos;s default cover is shown.
      </p>
      <JournalIssnDisplay issn_print={journal.issn_print} issn_online={journal.issn_online} className="mt-3" />

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No issues have been published yet.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((issue) => {
            const v = volumeOf(issue);
            const url = resolvedCoverUrl(issue.cover_image_path, journal.cover_image_path);
            const label = issue.issue_number != null ? `Issue ${issue.issue_number}` : "Issue";
            return (
              <li key={issue.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <JournalCoverImage
                  src={url}
                  alt={`${journal.name} · ${issue.issue_slug} cover`}
                  journalName={journal.name}
                  className="aspect-[3/4] w-full max-w-[200px] mx-auto"
                  sizes="(max-width: 640px) 50vw, 200px"
                />
                <p className="mt-3 font-semibold">
                  {label}: {issue.issue_slug}
                </p>
                <p className="text-sm text-muted-foreground">
                  Volume {v?.volume_number ?? "—"}
                  {v?.published_year != null ? ` · ${v.published_year}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
