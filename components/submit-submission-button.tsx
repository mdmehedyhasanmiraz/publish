"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitSubmissionAction } from "@/lib/actions/submission";

export function SubmitSubmissionButton(props: { submissionId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = props.currentStatus === "draft";

  return (
    <div className="grid gap-3">
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const res = await submitSubmissionAction({ submissionId: props.submissionId });
            setMessage(res.message ?? (res.ok ? "Submitted." : "Could not submit."));
            if (res.ok) {
              location.href = `/author/submissions/${props.submissionId}`;
            }
          });
        }}
        disabled={!canSubmit || isPending}
      >
        {isPending ? "Submitting…" : "Submit for review"}
      </Button>
      {!canSubmit && (
        <p className="text-sm text-muted-foreground">This submission is not in draft status.</p>
      )}
    </div>
  );
}

