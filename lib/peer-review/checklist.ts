export const PEER_REVIEW_SCALE = ["excellent", "good", "fair", "poor"] as const;
export type PeerReviewScale = (typeof PEER_REVIEW_SCALE)[number];

export const PEER_RECOMMENDATION = [
  "accept",
  "minor_revision",
  "major_revision",
  "reject",
] as const;
export type PeerRecommendation = (typeof PEER_RECOMMENDATION)[number];

export type PeerReviewChecklist = {
  english_language_quality: PeerReviewScale;
  grammar_and_style: PeerReviewScale;
  scientific_rigor: PeerReviewScale;
  relevance_to_journal_scope: PeerReviewScale;
  relevance_to_manuscript_topic: PeerReviewScale;
  novelty_and_originality: PeerReviewScale;
  methodology_appropriate: PeerReviewScale;
  literature_and_citations: PeerReviewScale;
  clarity_of_figures_and_tables: PeerReviewScale;
  statistical_analysis_quality: PeerReviewScale;
  ethical_concerns_noted: boolean;
  recommendation: PeerRecommendation;
};

/** Ordered rating fields (scales) shown on the peer-review form. */
export const PEER_REVIEW_SCALE_KEYS = [
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

export type PeerReviewScaleKey = (typeof PEER_REVIEW_SCALE_KEYS)[number];

/**
 * Short guidance under each rating label (1–3 lines per item).
 * For journal scope, the UI may append a link to the public aim-and-scope page when a slug is known.
 */
export const PEER_REVIEW_SCALE_HELP: Record<PeerReviewScaleKey, readonly string[]> = {
  english_language_quality: [
    "How clear, fluent, and idiomatic is the English for an international audience?",
    "Minor slips are less important than whether the prose would block a reader’s understanding.",
  ],
  grammar_and_style: [
    "Grammar, spelling, punctuation, and consistency of style (headings, units, terminology).",
    "Consider whether issues would distract reviewers or copy-editors beyond ordinary cleanup.",
  ],
  scientific_rigor: [
    "Soundness of reasoning, interpretation of results, and alignment between conclusions and evidence.",
    "Flag overstated claims, missing controls, or gaps that would undermine trust in the findings.",
  ],
  relevance_to_journal_scope: [
    "Does this work match the topics, article types, and boundaries this journal is meant to publish?",
    "When in doubt, compare against the official aim and scope rather than personal interest alone.",
  ],
  relevance_to_manuscript_topic: [
    "Is the manuscript focused and coherent relative to its own stated aims, questions, or hypotheses?",
    "Note tangents, mismatches between title/abstract and body, or unclear contribution.",
  ],
  novelty_and_originality: [
    "How new is the contribution—conceptually, empirically, or in synthesis—relative to existing work?",
    "Incremental but solid work may still be valuable; judge degree of advance honestly.",
  ],
  methodology_appropriate: [
    "Are design, materials, protocols, and analyses appropriate to the research questions?",
    "Consider reproducibility: enough detail for an expert to assess or replicate the approach?",
  ],
  literature_and_citations: [
    "Adequacy and balance of references: key prior work, positioning, and acknowledgment of related studies.",
    "Note missing landmarks, biased citation, or reliance on outdated or irrelevant sources.",
  ],
  clarity_of_figures_and_tables: [
    "Legibility, labeling, consistency, and whether visuals support the narrative without confusion.",
    "Poor graphics that obscure the message should lower this score even if raw data are strong.",
  ],
  statistical_analysis_quality: [
    "If statistics are central: appropriateness of tests, assumptions, reporting, and effect interpretation.",
    "If statistics are minimal or absent, judge whether that matches the study design—and say so in comments.",
  ],
};

export const PEER_REVIEW_CHECKLIST_LABELS: Record<keyof PeerReviewChecklist, string> = {
  english_language_quality: "English language quality",
  grammar_and_style: "Grammar, spelling, and style",
  scientific_rigor: "Scientific rigor and soundness of conclusions",
  relevance_to_journal_scope: "Fit with the journal’s stated scope",
  relevance_to_manuscript_topic: "Coherence and focus relative to the manuscript’s topic",
  novelty_and_originality: "Novelty and originality of the contribution",
  methodology_appropriate: "Appropriateness of methods and analysis",
  literature_and_citations: "Use of literature and citations",
  clarity_of_figures_and_tables: "Clarity of figures, tables, and data presentation",
  statistical_analysis_quality: "Quality of statistical analysis (if applicable)",
  ethical_concerns_noted: "I am flagging potential ethical or integrity concerns",
  recommendation: "Overall recommendation",
};

export function defaultPeerReviewChecklist(): PeerReviewChecklist {
  return {
    english_language_quality: "good",
    grammar_and_style: "good",
    scientific_rigor: "good",
    relevance_to_journal_scope: "good",
    relevance_to_manuscript_topic: "good",
    novelty_and_originality: "good",
    methodology_appropriate: "good",
    literature_and_citations: "good",
    clarity_of_figures_and_tables: "good",
    statistical_analysis_quality: "good",
    ethical_concerns_noted: false,
    recommendation: "minor_revision",
  };
}
