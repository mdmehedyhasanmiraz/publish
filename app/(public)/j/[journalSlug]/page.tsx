import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JournalCoverImage } from "@/components/public/journal-cover-image";
import { JournalIssnDisplay } from "@/components/public/journal-issn-display";
import { JournalForAuthorsPanel } from "@/components/public/journal-for-authors-panel";
import { CcByLicenseBadge } from "@/components/public/cc-by-license-badge";
import { getJournalBySlug } from "@/lib/db/journals";
import { publicCoverUrl } from "@/lib/storage/covers";

type Props = { params: Promise<{ journalSlug: string }> };

export default async function JournalHomePage({ params }: Props) {
  const { journalSlug } = await params;
  const journal = await getJournalBySlug(journalSlug);
  if (!journal) notFound();

  const coverUrl = publicCoverUrl(journal.cover_image_path);

  return (
    <main className="min-w-0 overflow-x-clip pb-10">
      {/* Teal strip ≈77% of cover height (70% × 1.1); clip prevents horizontal scroll from 100vw breakout */}
      <section
        className="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] overflow-x-clip py-4"
        aria-label="Journal overview"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[calc(1rem+.9*(4/3)*min(260px,calc(100vw-3rem)))] bg-teal-200 md:h-[calc(1.25rem+0.9*(4/3)*min(260px,calc(100vw-3rem)))]"
          aria-hidden
        />
        <div
          className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pt-4 pb-[calc(0.3*(4/3)*min(260px,calc(100vw-3rem)))] md:flex-row md:items-start md:gap-8 md:pt-5"
        >
          <JournalCoverImage
            src={coverUrl}
            alt={`${journal.name} cover`}
            journalName={journal.name}
            className="aspect-[3/4] w-full max-w-[260px] shrink-0"
            sizes="260px"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Journal</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">{journal.name}</h1>
                {journal.submission_areas && journal.submission_areas.length ? (
                  <p className="mt-3 text-sm text-muted-foreground">{journal.submission_areas.join(" · ")}</p>
                ) : null}
                <JournalIssnDisplay
                  issn_print={journal.issn_print}
                  issn_online={journal.issn_online}
                  className={journal.submission_areas && journal.submission_areas.length ? "mt-2" : "mt-3"}
                />
              </div>
              <Image
                src="/logos/logo-openaccess.svg"
                alt="Open access"
                width={140}
                height={53}
                className="h-9 w-auto shrink-0 sm:h-10"
                priority
              />
            </div>
            <div className="mt-8 flex flex-wrap items-end gap-4">
              <div className="flex flex-wrap gap-3">
                <Link
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
                  href={`/j/${journal.slug}/archive`}
                >
                  Archive
                </Link>
                <Link
                  className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  href={`/j/${journal.slug}/aims-and-scope`}
                >
                  Aims &amp; scope
                </Link>
              </div>
              <CcByLicenseBadge className="ml-auto sm:ml-0" />
            </div>
          </div>
        </div>
      </section>
      <JournalForAuthorsPanel journalSlug={journal.slug} journalName={journal.name} />
    </main>
  );
}
