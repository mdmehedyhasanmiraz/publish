import Link from "next/link";
import { ForAuthorsPageShell } from "@/components/for-authors-page-shell";

export default function ConflictOfInterestPolicyPage() {
  return (
    <ForAuthorsPageShell
      title="Conflict of interest policy"
      policyIndexExcept="/for-authors/conflict-of-interest-policy"
      intro={
        <p>
          Transparency about competing interests helps readers judge research fairly. This policy reflects common
          scholarly standards and{" "}
          <a
            href="https://publicationethics.org/"
            className="font-medium text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            COPE
          </a>{" "}
          guidance.
        </p>
      }
    >
      <h2 className="text-lg font-semibold text-foreground">What to disclose</h2>
      <p>Authors should disclose financial and non-financial relationships that could reasonably be perceived to influence the work, including for example:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Employment, consultancies, stock or patent interests, honoraria, and paid expert roles</li>
        <li>Grants and other funding supporting the work (also summarise in the acknowledgements or funding section as required)</li>
        <li>Personal, political, or ideological interests relevant to the topic</li>
        <li>Relationships with organisations or advocacy groups that may be affected by the publication</li>
      </ul>
      <h2 className="text-lg font-semibold text-foreground">When and how</h2>
      <p>
        Disclosures should be provided at submission and updated if circumstances change. If there are no competing
        interests to declare, authors should state this explicitly (for example, &quot;The authors declare no competing
        interests&quot;) where the journal&apos;s instructions require it.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Reviewers and editors</h2>
      <p>
        Reviewers must decline invitations where they cannot evaluate work impartially and should disclose any
        potential bias. Editors and editorial staff manage manuscripts in which they have a direct competing interest,
        and may recuse themselves from decisions on those manuscripts.
      </p>
      <h2 className="text-lg font-semibold text-foreground">Undisclosed interests</h2>
      <p>
        If a competing interest is identified after publication, the editorial office may publish an update or
        correction to the declarations associated with the article.
      </p>
      <p>
        See also our{" "}
        <Link href="/for-authors/ethics-statement" className="font-medium text-primary hover:underline">
          ethics statement
        </Link>
        .
      </p>
    </ForAuthorsPageShell>
  );
}
