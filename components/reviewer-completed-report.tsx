import {
  PEER_REVIEW_CHECKLIST_LABELS,
  PEER_REVIEW_SCALE,
  PEER_RECOMMENDATION,
  type PeerReviewChecklist,
} from "@/lib/peer-review/checklist";

function formatScale(v: string) {
  return v.replace(/_/g, " ");
}

function isScale(v: string): v is (typeof PEER_REVIEW_SCALE)[number] {
  return (PEER_REVIEW_SCALE as readonly string[]).includes(v);
}

function isRecommendation(v: string): v is (typeof PEER_RECOMMENDATION)[number] {
  return (PEER_RECOMMENDATION as readonly string[]).includes(v);
}

function coerceChecklist(raw: Record<string, unknown>): Partial<PeerReviewChecklist> {
  const out: Partial<PeerReviewChecklist> = {};
  for (const key of Object.keys(PEER_REVIEW_CHECKLIST_LABELS) as (keyof PeerReviewChecklist)[]) {
    const v = raw[key as string];
    if (key === "ethical_concerns_noted") {
      out[key] = Boolean(v) as PeerReviewChecklist["ethical_concerns_noted"];
      continue;
    }
    if (key === "recommendation" && typeof v === "string" && isRecommendation(v)) {
      out.recommendation = v;
      continue;
    }
    if (typeof v === "string" && isScale(v)) {
      (out as Record<string, unknown>)[key] = v;
    }
  }
  return out;
}

const SCALE_DISPLAY_KEYS = [
  "english_language_quality",
  "grammar_and_style",
  "scientific_rigor",
  "relevance_to_journal_scope",
  "relevance_to_manuscript_topic",
  "novelty_and_originality",
  "methodology_appropriate",
  "literature_and_citations",
  "clarity_of_figures_and_tables",
  "statistical_analysis_quality",
] as const satisfies readonly (keyof PeerReviewChecklist)[];

export function ReviewerCompletedReport(props: {
  submittedAt: string;
  commentsToAuthor: string;
  narrative: string;
  checklist: Record<string, unknown>;
}) {
  const c = coerceChecklist(props.checklist);

  return (
    <div className="mt-6 grid max-w-3xl gap-6">
      <p className="text-sm text-muted-foreground">
        Submitted on {new Date(props.submittedAt).toLocaleString()}
      </p>

      <section className="grid gap-2">
        <h3 className="text-sm font-semibold text-foreground">Ratings &amp; recommendation</h3>
        <dl className="grid gap-2 text-sm">
          {SCALE_DISPLAY_KEYS.map((key) => {
            const val = c[key];
            if (!val || typeof val !== "string") return null;
            return (
              <div key={key} className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-1.5">
                <dt className="text-muted-foreground">{PEER_REVIEW_CHECKLIST_LABELS[key]}</dt>
                <dd className="font-medium capitalize text-foreground">{formatScale(val)}</dd>
              </div>
            );
          })}
          {c.recommendation ? (
            <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-1.5">
              <dt className="text-muted-foreground">{PEER_REVIEW_CHECKLIST_LABELS.recommendation}</dt>
              <dd className="font-medium capitalize text-foreground">{formatScale(c.recommendation)}</dd>
            </div>
          ) : null}
          {c.ethical_concerns_noted ? (
            <p className="text-sm font-medium text-amber-800">
              {PEER_REVIEW_CHECKLIST_LABELS.ethical_concerns_noted}
            </p>
          ) : null}
        </dl>
      </section>

      {props.commentsToAuthor.trim() ? (
        <section className="grid gap-1">
          <h3 className="text-sm font-semibold text-foreground">Comments to the author(s)</h3>
          <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
            {props.commentsToAuthor}
          </div>
        </section>
      ) : null}

      <section className="grid gap-1">
        <h3 className="text-sm font-semibold text-foreground">Confidential comments to the editor</h3>
        <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{props.narrative}</div>
      </section>
    </div>
  );
}
