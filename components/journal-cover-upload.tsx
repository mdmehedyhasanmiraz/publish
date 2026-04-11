"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  fetchJournalCoverLibraryAction,
  removeJournalCoverAction,
  selectJournalCoverAction,
  uploadJournalCoverAction,
  type CoverUploadState,
  type JournalCoverLibraryItem,
} from "@/lib/actions/cover-uploads";
import { publicCoverUrl } from "@/lib/storage/covers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type { JournalCoverLibraryItem };

export function JournalCoverUpload(props: { journalId: string; coverImagePath: string | null }) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<JournalCoverLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadJournalCoverAction,
    undefined as CoverUploadState | undefined,
  );
  const [selectState, selectAction, selectPending] = useActionState(
    selectJournalCoverAction,
    undefined as CoverUploadState | undefined,
  );
  const [removing, startRemove] = useTransition();

  useEffect(() => {
    if (!pickerOpen) {
      setLibraryItems([]);
      setLibraryError(null);
      setLibraryLoading(false);
      return;
    }

    let cancelled = false;
    setLibraryLoading(true);
    setLibraryError(null);

    void (async () => {
      const res = await fetchJournalCoverLibraryAction(props.journalId);
      if (cancelled) return;
      setLibraryLoading(false);
      if (!res.ok) {
        setLibraryError(res.message);
        setLibraryItems([]);
        return;
      }
      setLibraryItems(res.items);
    })();

    return () => {
      cancelled = true;
    };
  }, [pickerOpen, props.journalId]);

  useEffect(() => {
    if (uploadState?.ok || selectState?.ok) {
      router.refresh();
    }
  }, [uploadState, selectState, router]);

  useEffect(() => {
    if (selectState?.ok) {
      setPickerOpen(false);
    }
  }, [selectState?.ok]);

  const url = publicCoverUrl(props.coverImagePath);
  const message = uploadState?.message ?? selectState?.message;
  const messageOk = uploadState?.ok ?? selectState?.ok;
  const busy = uploadPending || selectPending;

  return (
    <div className="max-w-2xl space-y-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <h3 className="text-sm font-semibold">Journal cover</h3>
      <p className="text-xs text-slate-500">
        Shown on the public journal home and as the fallback when an issue has no cover. JPEG, PNG, or WebP, up to 5MB.
        New uploads are stored in your journal&apos;s library so you can switch between them anytime.
      </p>

      {url ? (
        <div className="relative aspect-[3/4] w-44 overflow-hidden rounded border bg-white shadow-sm">
          <Image
            key={props.coverImagePath ?? "none"}
            src={url}
            alt="Current journal cover"
            fill
            className="object-cover"
            sizes="176px"
          />
        </div>
      ) : (
        <div className="flex h-52 w-40 items-center justify-center rounded border border-dashed bg-white text-center text-xs text-slate-400">
          No cover selected
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
          Choose from uploaded covers
        </Button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Uploaded covers</DialogTitle>
            <DialogDescription>
              Thumbnails load only while this dialog is open. Select one to set it as the active journal cover.
            </DialogDescription>
          </DialogHeader>

          {libraryLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading list…</p>
          ) : libraryError ? (
            <p className="py-4 text-sm text-red-600">{libraryError}</p>
          ) : libraryItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No image files found for this journal yet. Upload a cover first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {libraryItems.map((item) => {
                const thumb = publicCoverUrl(item.path);
                const isActive = item.path === props.coverImagePath;
                return (
                  <form key={item.path} action={selectAction} className="block">
                    <input type="hidden" name="journal_id" value={props.journalId} />
                    <input type="hidden" name="storage_path" value={item.path} />
                    <button
                      type="submit"
                      disabled={selectPending}
                      aria-label={`Use cover ${item.name}`}
                      className={cn(
                        "relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-white text-left shadow-sm transition ring-offset-2 hover:opacity-95 disabled:opacity-50",
                        isActive ? "ring-2 ring-teal-600" : "ring-transparent hover:ring-2 hover:ring-slate-300",
                      )}
                    >
                      {thumb ? (
                        <Image src={thumb} alt="" fill className="object-cover" sizes="150px" />
                      ) : (
                        <span className="flex h-full items-center justify-center p-1 text-center text-[10px] text-slate-400">
                          {item.name}
                        </span>
                      )}
                    </button>
                  </form>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <form action={uploadAction} className="space-y-2 border-t border-slate-200 pt-4">
        <input type="hidden" name="journal_id" value={props.journalId} />
        <div className="grid gap-2">
          <Label htmlFor="journal-cover-image">Upload a new cover</Label>
          <Input
            id="journal-cover-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
          />
        </div>
        <Button type="submit" disabled={busy} size="sm">
          {uploadPending ? "Uploading…" : "Upload & set as cover"}
        </Button>
      </form>

      {message ? (
        <p className={`text-sm ${messageOk ? "text-green-700" : "text-red-600"}`}>{message}</p>
      ) : null}

      {url ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={removing || busy}
          onClick={() =>
            startRemove(async () => {
              await removeJournalCoverAction(props.journalId);
              router.refresh();
            })
          }
        >
          {removing ? "Removing…" : "Remove current cover (clears public display)"}
        </Button>
      ) : null}
    </div>
  );
}
