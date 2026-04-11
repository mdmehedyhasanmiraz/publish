"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import {
  removeIssueCoverAction,
  uploadIssueCoverAction,
  type CoverUploadState,
} from "@/lib/actions/cover-uploads";
import { resolvedCoverUrl } from "@/lib/storage/covers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function IssueCoverUpload(props: {
  issueId: string;
  issueCoverPath: string | null;
  journalCoverPath: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(uploadIssueCoverAction, undefined as CoverUploadState | undefined);
  const [removing, startRemove] = useTransition();
  const effective = resolvedCoverUrl(props.issueCoverPath, props.journalCoverPath);
  const hasIssueSpecific = Boolean(props.issueCoverPath);

  return (
    <div className="max-w-lg space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <h3 className="text-sm font-semibold">Issue cover</h3>
      <p className="text-xs text-slate-500">
        Optional. When set, this image appears for this issue on the public archive instead of the journal cover. JPEG,
        WebP, up to 100KB.
      </p>
      {effective ? (
        <div className="space-y-1">
          <div className="relative aspect-[3/4] w-44 overflow-hidden rounded border bg-white shadow-sm">
            <Image src={effective} alt="Issue cover" fill className="object-cover" sizes="176px" />
          </div>
          <p className="text-xs text-slate-500">
            {hasIssueSpecific ? "Using this issue’s cover image." : "Using the journal default cover (no issue-specific image)."}
          </p>
        </div>
      ) : (
        <div className="flex h-52 w-40 items-center justify-center rounded border border-dashed bg-white text-center text-xs text-slate-400">
          No cover available
        </div>
      )}
      <form action={action} className="space-y-2">
        <input type="hidden" name="issue_id" value={props.issueId} />
        <div className="grid gap-2">
          <Label htmlFor="issue-cover-image">Upload or replace issue cover</Label>
          <Input id="issue-cover-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Uploading…" : "Save issue cover"}
        </Button>
        {state?.message ? (
          <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
        ) : null}
      </form>
      {hasIssueSpecific ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={removing}
          onClick={() =>
            startRemove(async () => {
              await removeIssueCoverAction(props.issueId);
              router.refresh();
            })
          }
        >
          {removing ? "Removing…" : "Remove issue cover (use journal default)"}
        </Button>
      ) : null}
    </div>
  );
}
