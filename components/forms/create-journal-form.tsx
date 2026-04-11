"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type JournalSaveResult = { ok: boolean; message?: string; id?: string };

type CreateJournalFormProps = {
  journal?: {
    id: string;
    name: string;
    slug: string;
    submission_areas: string[] | null;
    submission_types: string[] | null;
  };
};

export function CreateJournalForm({ journal }: CreateJournalFormProps) {
  const isEdit = Boolean(journal);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<JournalSaveResult | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setState(null);
    const form = e.currentTarget;
    try {
      const res = await fetch("/api/admin/journals/save", {
        method: "POST",
        body: new FormData(form),
      });
      let json: JournalSaveResult;
      try {
        json = (await res.json()) as JournalSaveResult;
      } catch {
        setState({ ok: false, message: "Invalid response from server." });
        return;
      }
      setState(json);
      if (json.ok) {
        router.refresh();
        if (!isEdit && json.id) {
          router.push(`/admin/journals/${json.id}`);
        }
      }
    } catch {
      setState({ ok: false, message: "Network error. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form method="post" action="/api/admin/journals/save" onSubmit={onSubmit} className="max-w-lg space-y-4">
      <input type="hidden" name="journal_id" value={journal?.id ?? ""} />
      <div className="grid gap-2">
        <Label htmlFor="name">Journal name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={journal?.name ?? ""}
          placeholder="Journal of Example Studies"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="slug">URL slug</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={journal?.slug ?? ""}
          placeholder="journal-of-example-studies (optional)"
        />
        <p className="text-xs text-slate-500">Leave blank to derive from the name.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="submission_areas">Submission areas</Label>
        <Input
          id="submission_areas"
          name="submission_areas"
          defaultValue={(journal?.submission_areas ?? []).join(", ")}
          placeholder="Physics, Chemistry, Biology"
        />
        <p className="text-xs text-slate-500">Comma-separated values.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="submission_types">Submission types</Label>
        <Input
          id="submission_types"
          name="submission_types"
          defaultValue={(journal?.submission_types ?? []).join(", ")}
          placeholder="Research Article, Review, Short Communication"
        />
        <p className="text-xs text-slate-500">Comma-separated values.</p>
      </div>
      {state?.message && (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save journal" : "Create journal"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/journals">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
