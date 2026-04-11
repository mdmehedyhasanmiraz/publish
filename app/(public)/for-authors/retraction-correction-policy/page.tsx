import Link from "next/link";
import { ForAuthorsPageShell } from "@/components/for-authors-page-shell";

export default function RetractionCorrectionPolicyPage() {
  return (
    <ForAuthorsPageShell
      title="Retraction and correction policy"
      policyIndexExcept="/for-authors/retraction-correction-policy"
      intro={
        <p>
          Published articles should remain a reliable record. When errors or serious issues are identified, we issue
          corrections or retractions in line with{" "}
          <a
            href="https://publicationethics.org/"
            className="font-medium text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            COPE
          </a>{" "}
          principles and best practice.
        </p>
      }
    >
      <h2 className="text-lg font-semibold text-foreground">Corrections (errata and corrigenda)</h2>
      <p>
        Minor errors that do not affect the conclusions may be corrected via an erratum or corrigendum, clearly linked
        from the original article. Authors should notify the editorial office promptly if they discover an error in a
        published work.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Expressions of concern</h2>
      <p>
        In some cases, when an investigation is ongoing, the journal may publish an expression of concern to alert
        readers while facts are established.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Retractions</h2>
      <p>
        A retraction may be considered when, for example: there is clear evidence of unreliable findings due to
        misconduct or honest error; results have previously been published elsewhere without disclosure; there is
        plagiarism or other ethical breach; or authorship is disputed in ways that undermine confidence in the work.
        Retraction notices state the reason, are linked to the original article, and remain part of the public record.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Roles and process</h2>
      <p>
        Editors, in consultation with publishers where applicable, decide on corrections and retractions based on
        evidence and fairness. Authors and institutions may be contacted; outcomes are not determined solely by
        third-party allegations without appropriate review.
      </p>
      <p className="text-muted-foreground">
        For plagiarism and research-integrity concerns, see our{" "}
        <Link href="/for-authors/plagiarism-policy" className="font-medium text-primary hover:underline">
          plagiarism policy
        </Link>{" "}
        and{" "}
        <Link href="/for-authors/ethics-statement" className="font-medium text-primary hover:underline">
          ethics statement
        </Link>
        .
      </p>
    </ForAuthorsPageShell>
  );
}
