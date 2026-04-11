import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[50vh] max-w-3xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">About</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Sciencelet</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A multi-journal publishing platform for rigorous peer review, transparent editorial workflows, and broad
          dissemination of research.
        </p>

        <div className="mt-10 space-y-12 text-muted-foreground">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Who we are</h2>
            <p>
              Sciencelet hosts scholarly journals under one coherent technical and editorial infrastructure. We work
              with editorial teams and societies to run submissions, peer review, decisions, and production in a single
              system—so policies stay consistent, roles are clear, and readers get reliable, well-presented work.
            </p>
            <p>
              The platform is designed for serious research: versioned manuscripts, structured reviewer workflows,
              auditable actions for staff, and public pages that showcase each journal&apos;s scope and published
              articles.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">What we offer</h2>
            <ul className="list-inside list-disc space-y-2 marker:text-primary">
              <li>
                <span className="text-foreground">End-to-end workflows</span> from intake and reviewer assignment
                through editorial decisions, revisions, and publication—including production-oriented tooling for
                figures, references, and issue scheduling where journals use it.
              </li>
              <li>
                <span className="text-foreground">Multi-journal operations</span> with per-journal branding, policies,
                and submission settings, while sharing a common author, reviewer, and staff experience.
              </li>
              <li>
                <span className="text-foreground">Open, readable outputs</span> including journal homepages, article
                pages with clear metadata and licensing, and discovery entry points such as{" "}
                <Link href="/latest-research" className="font-medium text-primary underline-offset-4 hover:underline">
                  latest research
                </Link>{" "}
                and{" "}
                <Link href="/journals" className="font-medium text-primary underline-offset-4 hover:underline">
                  journal listings
                </Link>
                .
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Principles</h2>
            <p>
              We prioritize editorial independence, confidentiality in review, and explicit conflict-of-interest
              handling. Journal-level policies—ethics, corrections, APCs where applicable, and author guidelines—are
              published alongside each journal so expectations are visible before submission.
            </p>
            <p>
              Authors can review{" "}
              <Link
                href="/for-authors/submission-guidelines"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                submission guidelines
              </Link>
              ,{" "}
              <Link href="/for-authors/journal-policy" className="font-medium text-primary underline-offset-4 hover:underline">
                journal policy
              </Link>
              , and related{" "}
              <Link href="/for-authors/ethics-statement" className="font-medium text-primary underline-offset-4 hover:underline">
                ethics
              </Link>{" "}
              and{" "}
              <Link
                href="/for-authors/plagiarism-policy"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                integrity
              </Link>{" "}
              statements as part of preparing a manuscript.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">For authors, reviewers, and editors</h2>
            <p>
              <span className="text-foreground">Authors</span> submit through guided flows, track status, upload
              revisions when requested, and see decision letters in one place.{" "}
              <span className="text-foreground">Reviewers</span> receive structured invitations and can complete reports
              within the reviewer workspace.{" "}
              <span className="text-foreground">Editors and production staff</span> use role-based dashboards for
              triage, assignments, and moving accepted work toward publication.
            </p>
            <p>
              If you are new to the platform, start from{" "}
              <Link href="/journals" className="font-medium text-primary underline-offset-4 hover:underline">
                Browse journals
              </Link>{" "}
              to find a venue, or use{" "}
              <Link href="/for-authors/contact" className="font-medium text-primary underline-offset-4 hover:underline">
                contact
              </Link>{" "}
              for journal-specific questions when contact details are listed there.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-muted/30 p-5 text-sm">
            <p className="font-medium text-foreground">Sciencelet vs. individual journals</p>
            <p className="mt-2">
              Sciencelet provides the software and operating layer; each journal retains its own scope, editorial
              board, and policy choices within that framework. When in doubt about suitability or timing, follow the
              journal&apos;s aims and instructions on its public pages.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
