import Link from "next/link";
import { ForAuthorsPageShell } from "@/components/for-authors-page-shell";
import { forAuthorsPolicyLinks } from "@/lib/for-authors-nav";

export default function JournalPolicyPage() {
  return (
    <ForAuthorsPageShell
      title="Journal policy"
      policyIndexExcept="/for-authors/journal-policy"
      intro={
        <p>
          Sciencelet-hosted journals operate under clear editorial policies. The dedicated pages below expand on
          plagiarism, ethics, corrections and retractions, competing interests, and charges. They are written to align
          with widely accepted practice and{" "}
          <a
            href="https://publicationethics.org/"
            className="font-medium text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            COPE
          </a>{" "}
          guidance; the journal you submit to remains the authoritative source for any journal-specific rules.
        </p>
      }
    >
      <h2 className="text-lg font-semibold text-foreground">Policy pages</h2>
      <ul className="list-disc space-y-2 pl-5">
        {forAuthorsPolicyLinks.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="font-medium text-primary hover:underline">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="pt-2 text-lg font-semibold text-foreground">Overview</h2>
      <p className="text-muted-foreground">
        Peer review is managed by the journal&apos;s editors; decisions are based on scientific merit and fit. Authors
        are expected to disclose conflicts of interest and funding as required. Corrections, retractions, and appeals
        follow the procedures described in the policies linked above. Data sharing, ethics approvals, and human or
        animal research standards must be met before acceptance.
      </p>
      <p className="text-muted-foreground">
        Individual journals may publish supplementary information (open access, licensing, preprints, etc.) on their
        public pages—always refer to the journal you submit to when in doubt.
      </p>
    </ForAuthorsPageShell>
  );
}
