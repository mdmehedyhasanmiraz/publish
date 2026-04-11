import Link from "next/link";
import { ForAuthorsPageShell } from "@/components/for-authors-page-shell";

export default function PlagiarismPolicyPage() {
  return (
    <ForAuthorsPageShell
      title="Plagiarism policy"
      policyIndexExcept="/for-authors/plagiarism-policy"
      intro={
        <p>
          This policy supports originality and integrity in scholarly publishing. It is aligned with principles
          advocated by the{" "}
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
      <h2 className="text-lg font-semibold text-foreground">What we expect</h2>
      <p>
        Manuscripts must present the authors&apos; own work and ideas, with appropriate credit to prior work. Duplicate
        submission (submitting the same work to more than one journal at a time) and redundant publication (overlapping
        publication without clear cross-reference and justification) are not acceptable unless explicitly permitted under
        stated conditions (for example, preprints with disclosure).
      </p>
      <h2 className="text-lg font-semibold text-foreground">Screening</h2>
      <p>
        Submissions may be screened using plagiarism detection or similarity-checking tools. Editors may also assess
        overlap with the authors&apos; previous publications, conference abstracts, and thesis material. High similarity or
        unattributed overlap may lead to requests for revision, additional documentation, or rejection.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Text recycling and translations</h2>
      <p>
        Reuse of wording from your own prior work should be minimal, clearly signposted, and compliant with copyright.
        Translations or secondary publication must be disclosed and, where applicable, permission obtained; the original
        source should be cited.
      </p>
      <h2 className="text-lg font-semibold text-foreground">If concerns arise</h2>
      <p>
        If plagiarism, fabrication, or falsification is suspected before or after publication, the editorial office may
        investigate, contact authors for an explanation, and follow COPE-informed workflows. Outcomes may include
        correction, retraction, or notification of institutions, consistent with the seriousness of the case.
      </p>
      <p className="text-muted-foreground">
        For corrections and retractions, see our{" "}
        <Link href="/for-authors/retraction-correction-policy" className="font-medium text-primary hover:underline">
          retraction and correction policy
        </Link>
        .
      </p>
    </ForAuthorsPageShell>
  );
}
