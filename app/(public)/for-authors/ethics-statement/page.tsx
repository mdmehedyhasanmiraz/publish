import Link from "next/link";
import { ForAuthorsPageShell } from "@/components/for-authors-page-shell";

export default function EthicsStatementPage() {
  return (
    <ForAuthorsPageShell
      title="Ethics statement"
      policyIndexExcept="/for-authors/ethics-statement"
      intro={
        <p>
          Journals on this platform are committed to ethical publishing. Our expectations follow widely accepted
          standards, including guidance from the{" "}
          <a
            href="https://publicationethics.org/"
            className="font-medium text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Committee on Publication Ethics (COPE)
          </a>
          .
        </p>
      }
    >
      <h2 className="text-lg font-semibold text-foreground">Research integrity</h2>
      <p>
        Authors must report their methods and results honestly. Fabrication, falsification, and image manipulation that
        misrepresents findings are prohibited. Underlying data should be available when required by the journal or
        discipline, or retained and provided upon reasonable request where ethical and legal constraints allow.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Human participants</h2>
      <p>
        Research involving human participants must comply with applicable regulations and ethical review requirements.
        Authors should state that appropriate approvals were obtained (or explain why they were not required), and
        describe informed consent procedures. Identifying information should not be included unless essential and
        explicitly consented.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Animal research</h2>
      <p>
        Studies involving animals must comply with institutional and national standards for humane care and use.
        Relevant ethics or oversight approvals should be described in the manuscript.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Hazardous or dual-use content</h2>
      <p>
        Authors should consider risks of misuse of research and comply with journal and funder requirements for
        responsible reporting.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Editorial and peer review</h2>
      <p>
        Editors and reviewers are expected to handle manuscripts confidentially, declare conflicts of interest, and not
        use unpublished material for their own advantage. Authors may appeal editorial decisions through routes
        described by the journal.
      </p>
      <p>
        Conflicts of interest and competing interests are covered in our{" "}
        <Link href="/for-authors/conflict-of-interest-policy" className="font-medium text-primary hover:underline">
          conflict of interest policy
        </Link>
        .
      </p>
    </ForAuthorsPageShell>
  );
}
