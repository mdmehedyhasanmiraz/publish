import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const TOC = [
  { id: "general", label: "1. General" },
  { id: "document-format", label: "2. Document format & typography" },
  { id: "heading-hierarchy", label: "3. Heading hierarchy" },
  { id: "title-page", label: "4. Title page" },
  { id: "abstract", label: "5. Abstract" },
  { id: "keywords", label: "6. Keywords" },
  { id: "main-text", label: "7. Main text" },
  { id: "figures", label: "8. Figures" },
  { id: "tables", label: "9. Tables" },
  { id: "citations-references", label: "10. Citations & references" },
  { id: "authorship", label: "11. Authorship" },
  { id: "acknowledgements", label: "12. Acknowledgements" },
  { id: "competing-interests", label: "13. Competing interests" },
  { id: "funding", label: "14. Funding" },
  { id: "ethics-compliance", label: "15. Ethics & compliance" },
  { id: "preprints", label: "16. Preprints & prior dissemination" },
  { id: "submitting", label: "17. Submitting your manuscript" },
] as const;

function TocNav() {
  return (
    <nav aria-label="Page outline" className="rounded-lg border border-border bg-muted/30 p-4 lg:border-0 lg:bg-transparent lg:p-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
      <ul className="mt-3 max-h-[min(70vh,32rem)] space-y-1.5 overflow-y-auto text-sm lg:max-h-[calc(100vh-8rem)]">
        {TOC.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block rounded-md py-1 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground lg:py-0.5 lg:hover:bg-transparent lg:hover:text-primary"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function SubmissionGuidelinesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[50vh] max-w-7xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">For authors</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Submission guidelines</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Manuscript preparation, formatting, and ethical requirements for Sciencelet journals. Individual journals may
          publish additional requirements on their own pages; where they conflict, the journal-specific policy prevails.
        </p>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:gap-12 xl:gap-16">
          <aside className="shrink-0 lg:sticky lg:top-28 lg:w-56 lg:self-start xl:w-64">
            <TocNav />
          </aside>

          <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-foreground">
            <section id="general" className="scroll-mt-28 space-y-4 border-b border-border pb-10">
              <h2 className="text-xl font-semibold text-foreground">1. General</h2>
              <p className="text-muted-foreground">
                Submissions must be original, not under consideration elsewhere, and prepared in clear English (or the
                language accepted by the target journal). Authors are responsible for accuracy, permissions for
                third-party material, and compliance with these guidelines before upload through the author portal.
              </p>
            </section>

            <section id="document-format" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">2. Document format &amp; typography</h2>
              <p className="text-muted-foreground">
                Prepare the main manuscript as an editable file (Microsoft Word{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.docx</code> preferred). PDF may be requested at
                revision or proof stages but is not sufficient for the initial submission text unless the journal
                explicitly allows it.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Font:</strong> Times New Roman throughout the manuscript body.
                </li>
                <li>
                  <strong className="text-foreground">Body size:</strong> 12 pt for all main text (abstract, main text,
                  references, figure captions when included in the same file).
                </li>
                <li>
                  <strong className="text-foreground">Line spacing:</strong> Double (2.0) for the main document, including
                  the abstract and references list unless your journal specifies otherwise.
                </li>
                <li>
                  <strong className="text-foreground">Margins:</strong> At least 2.5 cm (1 in) on all sides.
                </li>
                <li>
                  <strong className="text-foreground">Alignment &amp; paragraphs:</strong> Left-aligned text; first-line
                  indent 0.5 in (1.27 cm) for new paragraphs, or a blank line between paragraphs—choose one style and apply
                  consistently.
                </li>
                <li>
                  <strong className="text-foreground">Page numbers:</strong> Continuous numbering in the footer, starting
                  from the title page or abstract as instructed by the submission system.
                </li>
              </ul>
            </section>

            <section id="heading-hierarchy" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">3. Heading hierarchy</h2>
              <p className="text-muted-foreground">
                Use Word heading styles so structure is preserved for production and accessibility. Do not format
                headings only with bold or larger font without applying the correct style.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Heading 1:</strong> The manuscript title only (once on the first
                  page of the main document, or as required by the journal template).
                </li>
                <li>
                  <strong className="text-foreground">Heading 2:</strong> Major sections (e.g. Introduction, Methods,
                  Results, Discussion, Conclusion, References).
                </li>
                <li>
                  <strong className="text-foreground">Heading 3 &amp; Heading 4:</strong> Subsections and sub-subsections
                  as needed. Avoid deeper than four levels; restructure if more nesting is required.
                </li>
              </ul>
            </section>

            <section id="title-page" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">4. Title page</h2>
              <p className="text-muted-foreground">Include at minimum:</p>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>Full title of the article (sentence or title case per journal preference).</li>
                <li>
                  All author names and institutional affiliations (department, institution, city, country). Use superscript
                  symbols to link authors to affiliations where multiple affiliations apply.
                </li>
                <li>
                  <strong className="text-foreground">Corresponding author(s):</strong> Clearly mark each corresponding
                  author (name, email, ORCID if available). There may be more than one corresponding author. Routine
                  submission-related correspondence (system notifications, revisions, proofs) is sent to the{" "}
                  <strong className="text-foreground">submitting author</strong> unless the journal specifies otherwise;
                  ensure that account email is monitored.
                </li>
                <li>Optional: running short title, word counts, article type.</li>
              </ul>
            </section>

            <section id="abstract" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">5. Abstract</h2>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  The abstract must be a <strong className="text-foreground">single continuous passage</strong>. Do not
                  divide it into labelled sections (e.g. &ldquo;Background / Methods / Results&rdquo;).
                </li>
                <li>
                  <strong className="text-foreground">Maximum length: 300 words.</strong>
                </li>
                <li>
                  Do not cite references or include figures, tables, or equations in the abstract unless the journal
                  explicitly allows structured abstracts for specific article types.
                </li>
              </ul>
            </section>

            <section id="keywords" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">6. Keywords</h2>
              <p className="text-muted-foreground">
                Provide <strong className="text-foreground">at least four</strong> relevant keywords or short phrases
                (additional keywords are welcome). Use for indexing; avoid the same words as the title only. Separate with
                commas or semicolons as requested in the submission form.
              </p>
            </section>

            <section id="main-text" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">7. Main text</h2>
              <p className="text-muted-foreground">
                Organise the body with clear H2 sections (and H3/H4 as needed). Reporting should follow field-appropriate
                standards (e.g. CONSORT, PRISMA, ARRIVE) where applicable; state this in the Methods if you used a
                checklist.
              </p>
              <p className="text-muted-foreground">
                Define abbreviations at first use in the abstract and again in the main text if needed. Use SI units unless
                discipline-specific conventions require otherwise.
              </p>
            </section>

            <section id="figures" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">8. Figures</h2>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  Submit figures as separate high-resolution files (e.g.{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.tif</code>,{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.eps</code>,{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.pdf</code> for line art;{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.png</code> or lossless formats for raster
                  images).
                </li>
                <li>
                  <strong className="text-foreground">Resolution:</strong> At least 300 dpi at final published width for
                  photographs and micrographs; 600–1200 dpi for line art and graphs where possible.
                </li>
                <li>
                  Number figures in the order cited (Figure 1, Figure 2, …). Include a short caption for each (below the
                  figure in the manuscript file or in a separate list if the journal requests).
                </li>
                <li>
                  Ensure text within figures is legible (preferably ≥8 pt after reduction). Use consistent fonts (Arial or
                  similar sans-serif is acceptable inside figures even when the main text is Times New Roman).
                </li>
                <li>
                  Obtain written permission for any adapted or reproduced material and credit the source in the caption.
                </li>
              </ul>
            </section>

            <section id="tables" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">9. Tables</h2>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>Build tables in Word using the table tool—not as images—so they can be edited during production.</li>
                <li>Number in order of citation (Table 1, Table 2, …). Place the caption above the table.</li>
                <li>
                  Avoid vertical rules unless necessary; keep footnotes concise and use symbols in a standard order (*, †,
                  ‡, …).
                </li>
              </ul>
            </section>

            <section id="citations-references" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">10. Citations &amp; references</h2>
              <p className="text-muted-foreground">
                Sciencelet uses a <strong className="text-foreground">numeric (Vancouver-style)</strong> system for{" "}
                <strong className="text-foreground">in-text citations and the bibliography</strong>: cite sources with
                numbers in square brackets in the order they first appear in the text [1], [2], or as superscript numbers
                if your journal specifies—be consistent. The reference list is numbered to match (not alphabetical).
              </p>
              <p className="text-muted-foreground">
                Each bibliographic entry should be composed using <strong className="text-foreground">APA 7th edition</strong>{" "}
                rules for element order, punctuation, italics, and use of DOIs—adapted to a numbered list. Examples:
              </p>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  Journal: author(s), year, article title, <em>journal title in italics</em>, volume(issue), pages. Include
                  DOI when available.
                </li>
                <li>
                  Book: author(s), year, <em>title</em>, publisher. Chapter in edited volume: follow APA chapter format.
                </li>
              </ul>
              <p className="text-muted-foreground">
                List only works cited in the text. Verify all DOIs and URLs before submission. Unpublished meetings, personal
                communications, and datasets should be cited in text with sufficient detail and included in the reference
                list only if retrievable.
              </p>
            </section>

            <section id="authorship" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">11. Authorship</h2>
              <p className="text-muted-foreground">
                Authorship should follow the ICMJE recommendations (or your discipline&apos;s equivalent): substantial
                contribution to conception or design, or acquisition, analysis, or interpretation of data; drafting or
                critical revision; final approval of the version to be published; and agreement to be accountable for all
                aspects of the work. Anyone who meets these criteria should be listed as an author; contributors who do not
                meet all criteria should be named in Acknowledgements with their contribution described.
              </p>
              <p className="text-muted-foreground">
                The submitting author is responsible for ensuring that all co-authors have seen and approved the manuscript
                and author list and that conflicts of interest are disclosed.
              </p>
            </section>

            <section id="acknowledgements" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">12. Acknowledgements</h2>
              <p className="text-muted-foreground">
                Briefly thank people who provided help that does not meet authorship (technical support, writing assistance,
                language editing), funding sources (if not covered under a separate Funding section), and grant numbers.
                Written permission is required for acknowledgements of individuals who might be identifiable.
              </p>
            </section>

            <section id="competing-interests" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">13. Competing interests</h2>
              <p className="text-muted-foreground">
                Disclose any financial or non-financial competing interests that could influence the work or its
                interpretation: employment, consultancies, stock ownership, honoraria, patents, personal relationships, etc.
                If none exist, state explicitly: &ldquo;The authors declare no competing interests.&rdquo;
              </p>
            </section>

            <section id="funding" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">14. Funding</h2>
              <p className="text-muted-foreground">
                List all funding sources for the work, including grant numbers and a brief description of each funder&apos;s
                role (if any) in design, data collection, analysis, decision to publish, or manuscript preparation.
              </p>
            </section>

            <section id="ethics-compliance" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">15. Ethics &amp; compliance</h2>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Human participants:</strong> State ethics committee or IRB approval
                  (name, approval number) and that the study followed the Declaration of Helsinki or comparable framework.
                  Informed consent must be obtained unless a waiver was granted—state this clearly.
                </li>
                <li>
                  <strong className="text-foreground">Animals:</strong> State ethics approval, species, and measures to
                  minimise suffering in line with institutional and national guidelines.
                </li>
                <li>
                  <strong className="text-foreground">Clinical trials:</strong> Register before recruitment where
                  required; report the registry name and identifier in the manuscript.
                </li>
                <li>
                  <strong className="text-foreground">Data &amp; code:</strong> State where data (and code, if applicable)
                  can be accessed, including repository name, accession or DOI, and any access conditions.
                </li>
              </ul>
            </section>

            <section id="preprints" className="scroll-mt-28 space-y-4 border-b border-border py-10">
              <h2 className="text-xl font-semibold text-foreground">16. Preprints &amp; prior dissemination</h2>
              <p className="text-muted-foreground">
                If a preprint or conference abstract exists, disclose it with title, repository or venue, and date. Posting
                a preprint after submission may breach embargo policies—check with the journal before doing so.
              </p>
            </section>

            <section id="submitting" className="scroll-mt-28 space-y-4 py-10">
              <h2 className="text-xl font-semibold text-foreground">17. Submitting your manuscript</h2>
              <p className="text-muted-foreground">
                Upload your files through the author portal, complete all metadata, and respond promptly to editorial and
                peer-review requests. For new submissions:
              </p>
              <p>
                <Link href="/author/submissions/new" className="font-medium text-primary underline underline-offset-4">
                  Start a new submission
                </Link>
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
