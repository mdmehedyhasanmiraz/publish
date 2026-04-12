import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { JournalCoverImage } from "@/components/public/journal-cover-image";
import { getJournals } from "@/lib/db/journals";
import { publicCoverUrl } from "@/lib/storage/covers";

export default async function JournalsPage() {
  const journals = await getJournals();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[50vh] max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Journals</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Browse our portfolio of open journals. Select a journal to view its homepage, aims &amp; scope, and published
          content.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journals.length === 0 ? (
            <li className="col-span-full rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No journals are available yet.
            </li>
          ) : (
            journals.map((j) => {
              const cover = publicCoverUrl(j.cover_image_path);
              return (
                <li key={j.id}>
                  <Link
                    href={`/j/${j.slug}`}
                    className="flex h-full flex-col rounded-lg border border-border bg-white p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
                  >
                    <JournalCoverImage
                      src={cover}
                      alt={`${j.name} cover`}
                      journalName={j.name}
                      className="mb-3 aspect-[3/4] w-full max-w-[140px]"
                      sizes="140px"
                    />
                    <span className="text-lg font-semibold">{j.name}</span>
                    {j.submission_areas && j.submission_areas.length > 0 ? (
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {j.submission_areas.slice(0, 4).join(" · ")}
                        {j.submission_areas.length > 4 ? "…" : ""}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">View journal homepage and archives.</p>
                    )}
                    <span className="mt-4 text-sm font-medium text-primary">Open journal →</span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
