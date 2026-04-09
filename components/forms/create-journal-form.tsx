"use client";

import { createJournalAction, type ActionState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useActionState } from "react";

export function CreateJournalForm() {
  const [state, action, pending] = useActionState(createJournalAction, undefined as ActionState | undefined);

  return (
    <form action={action} className="max-w-lg space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Journal name</Label>
        <Input id="name" name="name" required placeholder="Journal of Example Studies" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="slug">URL slug</Label>
        <Input id="slug" name="slug" placeholder="journal-of-example-studies (optional)" />
        <p className="text-xs text-slate-500">Leave blank to derive from the name.</p>
      </div>
      {state?.message && (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create journal"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/admin/journals">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
