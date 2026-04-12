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
    issn_print: string | null;
    issn_online: string | null;
    status: string | null;
    is_open_access: boolean;
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="issn_print">ISSN (Print)</Label>
          <Input
            id="issn_print"
            name="issn_print"
            defaultValue={journal?.issn_print ?? ""}
            placeholder="e.g. 1234-5678"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="issn_online">ISSN (Online)</Label>
          <Input
            id="issn_online"
            name="issn_online"
            defaultValue={journal?.issn_online ?? ""}
            placeholder="e.g. 1234-567X"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="status">Status</Label>
        <Input
          id="status"
          name="status"
          list="journal-status-suggestions"
          defaultValue={journal?.status ?? ""}
          placeholder="e.g. publishing, upcoming, discontinued"
        />
        <datalist id="journal-status-suggestions">
          <option value="upcoming" />
          <option value="publishing" />
          <option value="discontinued" />
          <option value="transferred" />
        </datalist>
        <p className="text-xs text-slate-500">Any label you use in the product; stored as plain text.</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="is_open_access"
          name="is_open_access"
          type="checkbox"
          value="on"
          defaultChecked={journal?.is_open_access ?? false}
          className="h-4 w-4 rounded border border-input text-primary accent-primary"
        />
        <Label htmlFor="is_open_access" className="cursor-pointer font-normal leading-none">
          Open access
        </Label>
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
