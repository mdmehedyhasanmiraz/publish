import Link from "next/link";
import { ForAuthorsPageShell } from "@/components/for-authors-page-shell";

export default function ArticleProcessingChargesPage() {
  return (
    <ForAuthorsPageShell
      title="Article processing charges (APC)"
      policyIndexExcept="/for-authors/article-processing-charges"
      intro={
        <p>
          We are committed to transparent, upfront information about any fees associated with publishing. There are{" "}
          <strong>no article processing charges (APCs)</strong> for manuscripts accepted in journals on this platform at
          present.
        </p>
      }
    >
      <section className="space-y-4 rounded-lg border border-teal-200 bg-teal-50/50 p-5">
        <h2 className="text-base font-semibold text-foreground">Current charges</h2>
        <ul className="list-disc space-y-2 pl-5 text-foreground">
          <li>
            <strong>No APC</strong> — you are not charged a fee for publication if your manuscript is accepted.
          </li>
          <li>
            <strong>No submission fee</strong> — submitting a manuscript does not incur a charge.
          </li>
          <li>
            <strong>No hidden charges</strong> — we do not bill for colour figures, page length, or supplementary files
            as a condition of publication under the current policy.
          </li>
        </ul>
      </section>
      <p className="text-muted-foreground">
        If our fee policy changes in the future, it will be updated on this page and in the relevant journal
        information <em>before</em> it applies to new submissions, so authors can make an informed choice.
      </p>
      <p className="text-muted-foreground">
        Other costs unrelated to this journal (for example, institutional open-access agreements, third-party language
        editing, or printing if you choose optional print services) are outside the journal&apos;s APC policy.
      </p>
      <p>
        See also our{" "}
        <Link href="/for-authors/journal-policy" className="font-medium text-primary hover:underline">
          journal policy overview
        </Link>{" "}
        and{" "}
        <Link href="/for-authors/submission-guidelines" className="font-medium text-primary hover:underline">
          submission guidelines
        </Link>
        .
      </p>
    </ForAuthorsPageShell>
  );
}
