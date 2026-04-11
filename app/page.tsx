import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PublisherHomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
        <section className="grid gap-10 border-b border-border pb-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              Featured
            </p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight">
              Accelerating High-Quality Research Publication Across Multiple Journals
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              PublisherOS supports manuscript submission, peer review, editorial decisions, and publication
              workflows with a professional, policy-driven infrastructure.
            </p>
          </div>
          <aside className="rounded border border-border bg-muted/40 p-5">
            <h3 className="text-base font-semibold">Quick Access</h3>
            <div className="mt-4 grid gap-3">
              <Link href="/journals" className="rounded border bg-white p-3 text-sm hover:bg-accent">
                Browse journals
              </Link>
              <Link href="/author/submissions" className="rounded border bg-white p-3 text-sm hover:bg-accent">
                Submit a Manuscript
              </Link>
              <Link href="/editor/queue" className="rounded border bg-white p-3 text-sm hover:bg-accent">
                Editorial Office
              </Link>
            </div>
          </aside>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            "Rigorous peer review workflow",
            "Configurable multi-journal editorial policies",
            "Production-ready publishing pipelines",
          ].map((item) => (
            <article key={item} className="rounded border border-border p-5">
              <h3 className="text-lg font-semibold">{item}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Built for professional scholarly publishers with secure permissions and auditable actions.
              </p>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
