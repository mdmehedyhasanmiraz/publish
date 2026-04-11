import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[50vh] max-w-3xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">About</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sciencelet</h1>
        <div className="mt-8 space-y-5 text-muted-foreground">
          <p>
            Sciencelet is a multi-journal publishing platform built for rigorous peer review, transparent editorial
            workflows, and broad dissemination of research. We partner with editorial teams to host journals across
            disciplines while keeping policies, submissions, and production under one coherent system.
          </p>
          <p>
            Our mission is to accelerate high-quality publication: from manuscript intake and reviewer matching through
            decisions, copyediting, and final release—with clear roles for authors, reviewers, editors, and production
            staff.
          </p>
          <p>
            Whether you are submitting your first paper, handling reviews, or managing an entire portfolio, Sciencelet
            provides the tools and structure to do it consistently and at scale.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
