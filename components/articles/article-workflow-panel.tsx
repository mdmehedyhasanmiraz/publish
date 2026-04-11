"use client";

import { useState, useTransition } from "react";
import {
  approveArticleVersionAction,
  publishArticleVersionAction,
  submitArticleForReviewAction,
  unpublishArticleAction,
} from "@/lib/actions/article";
import { Button } from "@/components/ui/button";

export function ArticleWorkflowPanel(props: {
  articleId: string;
  versionId: string;
  workflowStatus: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const res = await action();
      setMessage(res.message ?? (res.ok ? "Done." : "Action failed."));
      if (res.ok) location.reload();
    });
  }

  return (
    <section className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-semibold">Workflow</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Current status: <span className="font-medium text-foreground">{props.workflowStatus}</span>
        {props.workflowStatus === "published" ? (
          <span className="ml-2 rounded bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">Public</span>
        ) : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending || props.workflowStatus !== "draft"}
          onClick={() =>
            run(() => submitArticleForReviewAction({ articleId: props.articleId, versionId: props.versionId }))
          }
        >
          Submit for review
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || props.workflowStatus !== "in_review"}
          onClick={() => run(() => approveArticleVersionAction({ articleId: props.articleId, versionId: props.versionId }))}
        >
          Approve
        </Button>
        <Button
          size="sm"
          disabled={
            pending ||
            props.workflowStatus === "published" ||
            !["draft", "in_review", "approved"].includes(props.workflowStatus)
          }
          onClick={() => {
            if (
              !confirm(
                "Publish this article on the public journal site? It will be visible to anyone with the link.",
              )
            ) {
              return;
            }
            run(() => publishArticleVersionAction({ articleId: props.articleId, versionId: props.versionId }));
          }}
        >
          Publish publicly
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || props.workflowStatus !== "published"}
          onClick={() => run(() => unpublishArticleAction({ articleId: props.articleId, versionId: props.versionId }))}
        >
          Unpublish
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}

