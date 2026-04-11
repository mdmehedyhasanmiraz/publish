import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function ForAuthorsContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[50vh] max-w-3xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">For authors</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contact us</h1>
        <div className="mt-8 space-y-5 text-muted-foreground">
          <p>
            For questions about submissions, peer review, or technical issues with the author portal, please contact
            the editorial office of the journal you wish to publish in. Journal-specific contact details appear on each
            journal&apos;s homepage.
          </p>
          <p>
            For platform or account issues that are not journal-specific (e.g. login problems), use the same channels
            listed on your target journal, or reach out through your institutional liaison if one has been assigned.
          </p>
          <p className="text-sm text-muted-foreground/90">
            <span className="font-medium text-foreground">Note:</span> Replace this section with your official support
            email, phone, or ticketing link when available.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
