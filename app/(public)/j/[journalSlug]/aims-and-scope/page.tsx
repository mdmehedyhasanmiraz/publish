import Link from "next/link";
import { notFound } from "next/navigation";
import { JournalIssnDisplay } from "@/components/public/journal-issn-display";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ journalSlug: string }> };

export default async function JournalAimsAndScopePage({ params }: Props) {
  const { journalSlug } = await params;
  const supabase = await createClient();
  const { data: journal, error } = await supabase
    .from("journals")
    .select("name, slug, issn_print, issn_online")
    .eq("slug", journalSlug)
    .maybeSingle();

  if (error || !journal) notFound();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <p className="text-sm text-muted-foreground">
        <Link href={`/j/${journal.slug}`} className="font-medium text-primary hover:underline">
          ← {journal.name}
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Aim and scope</h1>
      <p className="mt-2 text-lg text-muted-foreground">{journal.name}</p>
      <JournalIssnDisplay issn_print={journal.issn_print} issn_online={journal.issn_online} className="mt-2" />
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          This page is the public reference for what this journal publishes. Reviewers should use it when judging
          whether a submission fits the journal&apos;s stated scope.
        </p>
        <p className="text-muted-foreground">
          Detailed editorial copy can be maintained by the publisher. Until custom text is configured here, treat
          the journal home and submission guidelines (when available) as complementary sources.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap gap-4 text-sm">
        <Link
          className="rounded-md border border-border bg-background px-4 py-2 font-medium hover:bg-muted/60"
          href={`/j/${journal.slug}`}
        >
          Journal home
        </Link>
        <Link
          className="rounded-md border border-border bg-background px-4 py-2 font-medium hover:bg-muted/60"
          href={`/j/${journal.slug}/archive`}
        >
          Archive
        </Link>
      </div>
    </main>
  );
}
