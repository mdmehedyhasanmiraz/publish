"use client";

import {
  createIssueAction,
  listVolumesForJournalAction,
  type ActionState,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

type Journal = { id: string; name: string; slug: string };

type VolumeRow = {
  id: string;
  volume_number: number;
  volume_slug: string;
  published_year: number | null;
};

export function CreateIssueForm({ journals }: { journals: Journal[] }) {
  const [state, action, pending] = useActionState(createIssueAction, undefined as ActionState | undefined);
  const [journalId, setJournalId] = useState(journals[0]?.id ?? "");
  const [volumes, setVolumes] = useState<VolumeRow[]>([]);
  const [volumeId, setVolumeId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!journalId) {
        setVolumes([]);
        setVolumeId("");
        return;
      }
      const rows = await listVolumesForJournalAction(journalId);
      if (cancelled) return;
      setVolumes(rows as VolumeRow[]);
      setVolumeId((rows as VolumeRow[])[0]?.id ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [journalId]);

  if (!journals.length) {
    return (
      <p className="text-sm text-slate-500">
        Create a journal and at least one volume before creating an issue.
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
        <Label htmlFor="volume_id">Volume</Label>
        <select
          id="volume_id"
          name="volume_id"
          required
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          value={volumeId}
          onChange={(e) => setVolumeId(e.target.value)}
        >
          {volumes.length === 0 ? (
            <option value="">No volumes yet — create a volume first</option>
          ) : (
            volumes.map((v) => (
              <option key={v.id} value={v.id}>
                Vol. {v.volume_number} ({v.volume_slug})
              </option>
            ))
          )}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issue_number">Issue number (optional)</Label>
        <Input id="issue_number" name="issue_number" type="number" min={1} placeholder="3" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="issue_slug">Issue slug</Label>
        <Input id="issue_slug" name="issue_slug" placeholder="issue-3 or spring-2026 (optional)" />
        <p className="text-xs text-slate-500">If empty, a slug is derived from the issue number.</p>
      </div>
      {state?.message && (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !volumeId}>
          {pending ? "Creating…" : "Create issue"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/issues">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
