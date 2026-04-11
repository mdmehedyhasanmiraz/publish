"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createArticleDraftAction } from "@/lib/actions/article";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateArticleDraftForm({
  journals,
  targetPrefix,
}: {
  journals: Array<{ id: string; name: string }>;
  targetPrefix: "/admin/articles" | "/editor/articles";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [journalId, setJournalId] = useState(journals[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-semibold">Create article draft</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Journal</Label>
          <select
            value={journalId}
            onChange={(e) => setJournalId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          >
            {journals.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Slug (optional)</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button
          disabled={pending || !journalId || !title.trim()}
          onClick={() =>
            startTransition(async () => {
              const res = await createArticleDraftAction({ journalId, title, slug });
              if (!res.ok) {
                setMessage(res.message ?? "Could not create draft.");
                return;
              }
              router.push(`${targetPrefix}/${res.articleId}`);
              router.refresh();
            })
          }
        >
          {pending ? "Creating..." : "Create draft"}
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

