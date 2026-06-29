import Link from "next/link";
import { forAuthorsPolicyLinks } from "@/lib/for-authors-nav";

/**
 * Author-facing policies and APC links for a journal’s public home (global /for-authors routes).
 */
export function JournalForAuthorsPanel(props: { journalSlug: string; journalName: string }) {
  return (
    <section className="mx-auto min-w-0 max-w-5xl px-6" aria-labelledby="for-authors-heading">
      <h2 id="for-authors-heading" className="text-lg font-semibold tracking-tight text-foreground">
        For authors
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Policies and charges for publishing with {props.journalName} (and other journals on this platform). All pages are
        listed in the site footer and under <strong className="font-medium text-foreground">For authors</strong> in the
        main menu.
      </p>
      <ul className="mt-5 space-y-2 text-sm">
        <li>
          <Link
            href="/for-authors/submission-guidelines"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Submission guidelines
          </Link>
        </li>
        <li>
          <Link href="/for-authors/journal-policy" className="font-medium text-primary underline-offset-2 hover:underline">
            Journal policy overview
          </Link>
        </li>
        {forAuthorsPolicyLinks.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="font-medium text-primary underline-offset-2 hover:underline">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        <Link href={`${props.journalSlug}/aims-and-scope`} className="font-medium text-primary hover:underline">
          Aims &amp; scope
        </Link>{" "}
        ·{" "}
        <Link href={`${props.journalSlug}/editorial-board`} className="font-medium text-primary hover:underline">
          Editorial board
        </Link>{" "}
        ·{" "}
        <Link href="/for-authors/contact" className="font-medium text-primary hover:underline">
          Contact
        </Link>
      </p>
    </section>
  );
}
