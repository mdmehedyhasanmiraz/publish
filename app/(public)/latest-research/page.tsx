import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { publicArticlePath } from "@/lib/articles/public-article-path";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 12;

type JournalEmbed = { name: string; slug: string } | null;

function journalFromRow(journals: unknown): JournalEmbed {
  if (journals == null) return null;
  if (Array.isArray(journals)) {
    const j = journals[0];
    if (j && typeof j === "object" && "slug" in j && "name" in j) {
      return { name: String((j as { name: string }).name), slug: String((j as { slug: string }).slug) };
    }
    return null;
  }
  if (typeof journals === "object" && "slug" in journals && "name" in journals) {
    return { name: String((journals as { name: string }).name), slug: String((journals as { slug: string }).slug) };
  }
  return null;
}

export default async function LatestResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  const { count: totalCount } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  const count = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  let page = Number.parseInt(sp.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, slug, abstract, published_at, manuscript_reference_code, journals(name, slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  const rows = articles ?? [];
  const fromLabel = count === 0 ? 0 : from + 1;
  const toLabel = Math.min(to + 1, count);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[50vh] max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Latest research</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Recently published articles across all journals. Open any item to read the full text.
        </p>

        <div className="mt-10 space-y-6">
          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
              No published articles yet. Check back soon or browse our{" "}
              <Link href="/journals" className="font-medium text-primary underline underline-offset-4">
                journals
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border bg-white">
              {rows.map((a) => {
                const j = journalFromRow(a.journals);
                const manuscriptCode =
                  typeof (a as { manuscript_reference_code?: string | null }).manuscript_reference_code === "string"
                    ? (a as { manuscript_reference_code: string }).manuscript_reference_code.trim()
                    : "";
                const publicHref =
                  j?.slug && manuscriptCode ? publicArticlePath(j.slug, manuscriptCode) : null;
                const date =
                  a.published_at && !Number.isNaN(new Date(a.published_at as string).getTime())
                    ? new Date(a.published_at as string).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Ahead of issue";
                const abstract =
                  typeof a.abstract === "string" && a.abstract.trim()
                    ? a.abstract.trim()
                    : null;
                const inner = (
                  <>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {j?.name ?? "Journal"}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">{a.title as string}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{date}</p>
                    {abstract ? (
                      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{abstract}</p>
                    ) : null}
                  </>
                );
                return (
                  <li key={a.id as string}>
                    {publicHref ? (
                      <Link
                        href={publicHref}
                        className="block px-4 py-5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="px-4 py-5 text-muted-foreground">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {count > 0 ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {fromLabel}–{toLabel} of {count}
            </p>
            <div className="flex items-center gap-2">
              {page <= 1 ? (
                <Button variant="outline" size="sm" disabled type="button">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/latest-research?page=${page - 1}`}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Link>
                </Button>
              )}
              <span className="text-sm tabular-nums text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page >= totalPages ? (
                <Button variant="outline" size="sm" disabled type="button">
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/latest-research?page=${page + 1}`}>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
