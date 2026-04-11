"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavJournal = { id: string; name: string; slug: string; coverSrc: string | null };

export function JournalsNavTrigger(props: {
  isOpen: boolean;
  onToggle: () => void;
  isScrolled: boolean;
}) {
  return (
    <button
      type="button"
      data-journals-nav-trigger
      onClick={props.onToggle}
      aria-expanded={props.isOpen}
      aria-haspopup="true"
      className={cn(
        "inline-flex items-center gap-0.5 border-0 bg-transparent font-semibold shadow-none outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        props.isOpen && "underline",
        props.isScrolled
          ? "text-white ring-offset-teal-600 hover:text-teal-100 focus-visible:ring-white"
          : "text-foreground hover:text-primary focus-visible:ring-primary",
        props.isOpen && !props.isScrolled && "text-primary",
        props.isOpen && props.isScrolled && "text-teal-100",
      )}
    >
      Journals
      <ChevronDown
        className={cn("h-3.5 w-3.5 shrink-0 opacity-80 transition-transform", props.isOpen && "rotate-180")}
        aria-hidden
      />
    </button>
  );
}

export function JournalsNavDropdownPanel(props: { open: boolean; onClose: () => void }) {
  const [journals, setJournals] = useState<NavJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/journals/nav", { credentials: "same-origin" });
        const json = (await res.json()) as { journals?: NavJournal[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load journals.");
        if (!cancelled) {
          setJournals(json.journals ?? []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load journals.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!props.open) return;
    function onPointerDown(e: MouseEvent | PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-journals-nav-trigger]")) return;
      if (!panelRef.current?.contains(t as Node)) props.onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [props.open, props.onClose]);

  useEffect(() => {
    if (!props.open) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute left-0 right-0 top-full z-[100] border-b border-border bg-white text-foreground shadow-lg"
      role="region"
      aria-label="Journals"
    >
      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading journals…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : journals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No journals are available yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {journals.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/j/${j.slug}`}
                  className="group flex flex-col items-center gap-3 text-center"
                  onClick={() => props.onClose()}
                >
                  <div className="relative aspect-[3/4] w-full max-w-[140px] overflow-hidden rounded-md border border-border bg-muted/30 shadow-sm transition group-hover:border-primary/40">
                    {j.coverSrc ? (
                      <Image
                        src={j.coverSrc}
                        alt={`${j.name} cover`}
                        fill
                        className="object-cover"
                        sizes="140px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-xs text-muted-foreground">
                        No cover
                      </div>
                    )}
                  </div>
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                    {j.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex justify-center border-t border-border pt-6">
          <Button asChild size="default" className="bg-teal-600 text-white hover:bg-teal-700">
            <Link href="/journals" onClick={() => props.onClose()}>
              View all journals
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
