"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitPeerReviewReportAction } from "@/lib/actions/peer-review";
import {
  defaultPeerReviewChecklist,
  PEER_RECOMMENDATION,
  PEER_REVIEW_CHECKLIST_LABELS,
  PEER_REVIEW_SCALE,
  PEER_REVIEW_SCALE_HELP,
  PEER_REVIEW_SCALE_KEYS,
  type PeerReviewChecklist,
} from "@/lib/peer-review/checklist";

export function PeerReviewReportForm({
  invitationId,
  journalSlug,
}: {
  invitationId: string;
  /** Public site slug; used to link aim-and-scope for the journal-fit criterion. */
  journalSlug?: string | null;
}) {
  const router = useRouter();
  const [checklist, setChecklist] = useState<PeerReviewChecklist>(defaultPeerReviewChecklist());
  const [commentsToAuthor, setCommentsToAuthor] = useState("");
  const [narrative, setNarrative] = useState("");
  const [noCompeting, setNoCompeting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setScale<K extends keyof PeerReviewChecklist>(key: K, value: string) {
    setChecklist((c) => ({ ...c, [key]: value }));
  }

  return (
    <form
      className="mt-6 grid max-w-3xl gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void (async () => {
          setBusy(true);
          setMsg(null);
          try {
            const r = await submitPeerReviewReportAction({
              invitationId,
              commentsToAuthor,
              narrative,
              noCompetingInterests: noCompeting,
              checklist,
            });
            if (r.ok) {
              router.refresh();
            } else {
              setMsg(r.error);
            }
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Could not submit review.");
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <div className="grid gap-4">
        {PEER_REVIEW_SCALE_KEYS.map((key) => (
          <div key={key} className="grid gap-1.5">
            <Label className="text-sm">{PEER_REVIEW_CHECKLIST_LABELS[key]}</Label>
            <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
              {PEER_REVIEW_SCALE_HELP[key].map((line, lineIdx) => (
                <p key={lineIdx}>{line}</p>
              ))}
              {key === "relevance_to_journal_scope" && journalSlug ? (
                <p>
                  <Link
                    href={`${journalSlug}/aims-and-scope`}
                    className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Aim and scope
                  </Link>
                  <span> — official page for this journal.</span>
                </p>
              ) : null}
            </div>
            <select
              className="h-9 max-w-xs rounded-md border border-input bg-transparent px-2 text-sm"
              value={checklist[key] as string}
              onChange={(e) => setScale(key, e.target.value)}
            >
              {PEER_REVIEW_SCALE.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="grid gap-1">
          <Label className="text-sm">{PEER_REVIEW_CHECKLIST_LABELS.recommendation}</Label>
          <select
            className="h-9 max-w-md rounded-md border border-input bg-transparent px-2 text-sm"
            value={checklist.recommendation}
            onChange={(e) =>
              setChecklist((c) => ({
                ...c,
                recommendation: e.target.value as PeerReviewChecklist["recommendation"],
              }))
            }
          >
            {PEER_RECOMMENDATION.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={checklist.ethical_concerns_noted}
            onCheckedChange={(v) =>
              setChecklist((c) => ({ ...c, ethical_concerns_noted: !!v }))
            }
            className="mt-0.5"
          />
          <span>{PEER_REVIEW_CHECKLIST_LABELS.ethical_concerns_noted}</span>
        </label>
      </div>

      <div className="grid gap-1">
        <Label>Comments to the author(s)</Label>
        <p className="text-xs text-muted-foreground">
          Constructive feedback the editor may share with the author (often anonymized). Avoid identifying yourself
          if the journal uses blind review.
        </p>
        <Textarea
          rows={10}
          value={commentsToAuthor}
          onChange={(e) => setCommentsToAuthor(e.target.value)}
          placeholder="Strengths, requested revisions, and clarifications suitable for the author(s)."
          required
        />
      </div>

      <div className="grid gap-1">
        <Label>Confidential comments to the editor (narrative)</Label>
        <p className="text-xs text-muted-foreground">For the editorial team only — not shared with the author.</p>
        <Textarea
          rows={12}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Summarize strengths, weaknesses, and any points for the editor only."
          required
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={noCompeting} onCheckedChange={(v) => setNoCompeting(!!v)} className="mt-0.5" />
        <span>
          I declare that I have no competing interests with respect to this manuscript (or I have disclosed
          them separately to the editor).
        </span>
      </label>

      <Button type="submit" disabled={busy}>
        {busy ? "Submitting…" : "Submit review"}
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}
