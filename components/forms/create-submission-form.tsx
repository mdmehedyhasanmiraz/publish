"use client";

import { createSubmissionAction, type SubmissionActionState } from "@/lib/actions/submission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useActionState } from "react";

type Journal = { id: string; name: string; slug: string };

export function CreateSubmissionForm({ journals }: { journals: Journal[] }) {
  const [state, action, pending] = useActionState(
    createSubmissionAction,
    undefined as SubmissionActionState | undefined,
  );

  if (!journals.length) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">No journals available</p>
        <p className="mt-1 text-muted-foreground">
          Your account needs an active membership with access to a publisher or journal. Contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="max-w-2xl space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="journal_id">Journal</Label>
        <select
          id="journal_id"
          name="journal_id"
          required
          className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          defaultValue={journals[0]?.id}
        >
          {journals.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="Full manuscript title" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="abstract">Abstract</Label>
        <textarea
          id="abstract"
          name="abstract"
          rows={8}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          placeholder="Paste your abstract here"
        />
      </div>
      {state?.message && (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      {state?.ok && state.submissionId && (
        <p className="text-sm text-muted-foreground">
          Submission ID: <code className="rounded bg-muted px-1">{state.submissionId}</code>
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/author/submissions">Back to submissions</Link>
        </Button>
      </div>
    </form>
  );
}
