import Image from "next/image";
import Link from "next/link";
import { ClipboardList, FileText, Landmark, Scale, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CcByLicenseBadge, CC_BY_4_0_URL } from "@/components/public/cc-by-license-badge";
import { JournalCoverImage } from "@/components/public/journal-cover-image";
import { publicArticlePath } from "@/lib/articles/public-article-path";
import { getJournals } from "@/lib/db/journals";
import { publicCoverUrl } from "@/lib/storage/covers";
import { Button } from "@/components/ui/button";

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

const pillars = [
  {
    icon: Scale,
    title: "Rigorous peer review",
    body: "Invited reviewers, editorial oversight, and clear accountability from first submission through revision and final decision.",
  },
  {
    icon: Landmark,
    title: "Focused journals",
    body: "Each journal has its own scope, editorial board, and policies. Authors and reviewers follow familiar submission and review steps across our titles.",
  },
  {
    icon: FileText,
    title: "Clear publication record",
    body: "Journal homepages, article pages, and license information are public so readers can cite and reuse work according to stated terms.",
  },
] as const;

const audienceCards = [
  {
    title: "Authors",
    icon: FileText,
    links: [
      { href: "/author/submissions/new", label: "Submit a manuscript" },
      { href: "/for-authors/submission-guidelines", label: "Submission guidelines" },
      { href: "/journals", label: "Choose a journal" },
    ],
  },
  {
    title: "Reviewers",
    icon: Users,
    links: [
      { href: "/reviewer", label: "Reviewer portal" },
      { href: "/for-authors/ethics-statement", label: "Ethics & confidentiality" },
    ],
  },
  {
    title: "Editors & production",
    icon: ClipboardList,
    links: [
      { href: "/editor/queue", label: "Editorial office" },
      { href: "/production", label: "Production" },
    ],
  },
] as const;

async function fetchRecentPublished(limit: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, abstract, published_at, manuscript_reference_code, journals(name, slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return data ?? [];
}

export async function HomePageContent() {
  const [articles, journals] = await Promise.all([fetchRecentPublished(6), getJournals()]);

  return (
    <main className="min-w-0">
      {/* Hero */}
      <section
        className="relative flex min-h-[36rem] flex-col overflow-hidden border-b border-slate-800 bg-slate-950 md:min-h-[42rem] lg:min-h-[min(82vh,46rem)]"
        aria-labelledby="home-hero-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute -right-[18%] top-[8%] h-[min(110vw,38rem)] w-[min(110vw,38rem)] rounded-full bg-teal-500/35 blur-[120px] motion-reduce:animate-none motion-safe:animate-hero-orb"
          />
          <div
            className="absolute -right-[8%] bottom-[0%] h-[min(95vw,30rem)] w-[min(95vw,30rem)] rounded-full bg-cyan-400/[0.18] blur-[100px] motion-reduce:animate-none motion-safe:animate-hero-orb-soft motion-safe:[animation-delay:4s]"
          />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 py-16 md:py-20 lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/90">
            STM publisher · open access
          </p>
          <h1
            id="home-hero-heading"
            className="mt-4 max-w-3xl font-serif text-4xl font-medium tracking-tight text-slate-50 md:text-5xl"
          >
            Sciencelet publishes <em className="italic">peer-reviewed</em>, <em className="italic">open access</em>{" "}
            <em className="italic">research</em>
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-slate-400">
            Our journals cover artificial intelligence, biotechnology and biosciences, genetics, pharmaceutical science,
            and related areas of science and technology. Every title is edited for integrity, clarity, and fit to scope.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="border-0 bg-white text-slate-900 hover:bg-slate-100"
            >
              <Link href="/journals">Browse journals</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/author/submissions/new">Submit a manuscript</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Open access + licensing */}
      <section className="border-b border-border bg-white" aria-labelledby="home-oa-heading">
        <div className="mx-auto max-w-7xl px-6 py-10 md:py-12">
          <h2 id="home-oa-heading" className="sr-only">
            Open access and licensing
          </h2>
          <div className="flex flex-col gap-8 rounded-2xl border border-border bg-muted/20 p-6 md:flex-row md:items-center md:justify-between md:gap-10 md:p-8">
            <div className="min-w-0 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
              <div className="shrink-0">
                <Image
                  src="/logos/logo-openaccess.svg"
                  alt="Open access"
                  width={200}
                  height={76}
                  className="h-12 w-auto sm:h-14"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold text-foreground">Open access publishing</p>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Our journals aim to make accepted research freely readable online. Individual journals may specify
                  licensing and any charges on their own policy pages; where articles are published under Creative Commons,
                  terms follow the chosen license (commonly{" "}
                  <a
                    href={CC_BY_4_0_URL}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY 4.0
                  </a>
                  ).
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 border-t border-border pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <CcByLicenseBadge showCaption className="md:text-right" />
              <p className="max-w-[14rem] text-xs text-muted-foreground md:ml-auto md:text-right">
                License buttons link to the official Creative Commons deed for attribution (CC BY) use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {journals.length > 0 ? (
        <section className="border-b border-border bg-background" aria-labelledby="home-journals-heading">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Portfolio</p>
              <h2 id="home-journals-heading" className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Our journals
              </h2>
              <p className="mt-2 text-muted-foreground">
                Browse our titles—each journal has its own scope, editorial board, and policies.
              </p>
            </div>
            <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {journals.map((j) => {
                const cover = publicCoverUrl(j.cover_image_path);
                return (
                  <li key={j.id}>
                    <Link
                      href={`/j/${j.slug}`}
                      className="group flex flex-col items-center gap-3 text-center"
                    >
                      <JournalCoverImage
                        src={cover}
                        alt={`${j.name} cover`}
                        journalName={j.name}
                        className="aspect-[3/4] w-full max-w-[160px]"
                        sizes="(max-width: 1024px) 25vw, 160px"
                      />
                      <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                        {j.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-10 flex justify-center">
              <Button asChild variant="outline">
                <Link href="/journals">View all journals</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Pillars */}
      <section className="border-b border-border bg-background" aria-labelledby="home-pillars-heading">
        <div className="mx-auto max-w-7xl px-6 py-14 md:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Our publishing</p>
            <h2 id="home-pillars-heading" className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Editorial standards you can rely on
            </h2>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <Icon className="h-8 w-8 text-teal-700" strokeWidth={1.5} aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Audiences */}
      <section className="bg-muted/30" aria-labelledby="home-audiences-heading">
        <div className="mx-auto max-w-7xl px-6 py-14 md:py-16">
          <h2 id="home-audiences-heading" className="text-2xl font-semibold tracking-tight text-foreground">
            Authors, reviewers, and editors
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Straightforward routes into submission, review, and editorial handling for our journals.
          </p>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {audienceCards.map(({ title, icon: Icon, links }) => (
              <li key={title} className="flex flex-col rounded-xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-teal-700" strokeWidth={1.75} aria-hidden />
                  <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                </div>
                <ul className="mt-4 flex flex-col gap-2">
                  {links.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {articles.length > 0 ? (
        <section className="border-t border-border bg-background" aria-labelledby="home-latest-heading">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Research</p>
                <h2 id="home-latest-heading" className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Latest from our journals
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Recently published articles across our portfolio. Open an item to read the full text.
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0 self-start sm:self-auto">
                <Link href="/latest-research">View all research</Link>
              </Button>
            </div>

            <ul className="mt-10 divide-y divide-border rounded-xl border border-border bg-white">
              {articles.map((a) => {
                const j = journalFromRow(a.journals);
                const manuscriptCode =
                  typeof a.manuscript_reference_code === "string" ? a.manuscript_reference_code.trim() : "";
                const href = j?.slug && manuscriptCode ? publicArticlePath(j.slug, manuscriptCode) : null;
                const date =
                  a.published_at && !Number.isNaN(new Date(a.published_at as string).getTime())
                    ? new Date(a.published_at as string).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : null;
                const abstract =
                  typeof a.abstract === "string" && a.abstract.trim()
                    ? a.abstract.trim().slice(0, 220) + (a.abstract.trim().length > 220 ? "…" : "")
                    : null;
                return (
                  <li key={a.id} className="p-5 md:p-6">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-6">
                      <div className="min-w-0">
                        {href ? (
                          <Link href={href} className="text-lg font-semibold text-foreground hover:text-primary hover:underline">
                            {String(a.title ?? "Untitled")}
                          </Link>
                        ) : (
                          <p className="text-lg font-semibold text-foreground">{String(a.title ?? "Untitled")}</p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                          {j?.name ? (
                            <>
                              <Link href={`/j/${j.slug}`} className="font-medium text-foreground hover:underline">
                                {j.name}
                              </Link>
                              {date ? <span aria-hidden> · </span> : null}
                            </>
                          ) : null}
                          {date ? <span>{date}</span> : null}
                        </p>
                        {abstract ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{abstract}</p> : null}
                      </div>
                      {href ? (
                        <Link
                          href={href}
                          className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline md:pt-1"
                        >
                          Read article
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Closing CTA */}
      <section className="border-t border-border bg-muted/25">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between md:gap-8 md:py-14">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Explore policies &amp; contact</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Ethics, conflicts of interest, corrections, and how to contact Sciencelet are set out for authors and
              readers.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 md:mt-0">
            <Button asChild variant="outline" className="bg-white">
              <Link href="/for-authors/journal-policy">Journal policies</Link>
            </Button>
            <Button asChild variant="outline" className="bg-white">
              <Link href="/for-authors/contact">Contact</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
