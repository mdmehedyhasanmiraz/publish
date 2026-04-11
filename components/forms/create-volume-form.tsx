"use client";

import { createVolumeAction, type ActionState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useActionState, useState } from "react";

type Journal = { id: string; name: string; slug: string };

export function CreateVolumeForm({ journals }: { journals: Journal[] }) {
  const [state, action, pending] = useActionState(createVolumeAction, undefined as ActionState | undefined);
  const [journalId, setJournalId] = useState(journals[0]?.id ?? "");

  if (!journals.length) {
    return (
      <p className="text-sm text-slate-500">
        Create a journal first before adding volumes.
      </p>
    );
  }

  return (
    <form action={action} className="max-w-lg space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="journal_id">Journal</Label>
        <select
          id="journal_id"
          name="journal_id"
          required
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          value={journalId}
          onChange={(e) => setJournalId(e.target.value)}
        >
          {journals.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name} ({j.slug})
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="volume_number">Volume number</Label>
        <Input id="volume_number" name="volume_number" type="number" required min={1} placeholder="42" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="volume_slug">Volume slug</Label>
        <Input id="volume_slug" name="volume_slug" placeholder="vol-42 (optional)" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="published_year">Year (optional)</Label>
        <Input id="published_year" name="published_year" type="number" min={1900} max={2100} placeholder="2026" />
      </div>
      {state?.message && (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create volume"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/volumes">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
