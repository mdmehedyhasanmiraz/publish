"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ensureArticleForSubmissionAction } from "@/lib/actions/article";
import { Button } from "@/components/ui/button";

export function CreateArticleFromSubmissionButton(props: { submissionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const r = await ensureArticleForSubmissionAction(props.submissionId);
            if (!r.ok) {
              setMessage(r.message ?? "Could not create article.");
              return;
            }
            router.push(`/admin/articles/${r.articleId}`);
            router.refresh();
          });
        }}
      >
        {pending ? "Creating…" : "Create article draft (JATS XML)"}
      </Button>
      {message ? <span className="text-sm text-destructive">{message}</span> : null}
    </div>
  );
}
