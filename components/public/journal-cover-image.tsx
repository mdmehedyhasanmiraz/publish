import Image from "next/image";
import { cn } from "@/lib/utils";
import { JournalCoverPlaceholder } from "@/components/public/journal-cover-placeholder";

export function JournalCoverImage(props: {
  src: string | null;
  alt: string;
  /** Used when `src` is missing: logo + title on slate background. */
  journalName?: string | null;
  className?: string;
  sizes?: string;
}) {
  const label = props.journalName?.trim() || "";

  if (!props.src) {
    if (label) {
      return (
        <div
          className={cn(
            "relative overflow-hidden rounded-md border border-slate-700/90 shadow-sm",
            props.className,
          )}
        >
          <JournalCoverPlaceholder journalName={label} className="absolute inset-0" />
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-center text-xs text-muted-foreground",
          props.className,
        )}
      >
        No cover
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden rounded-md border bg-white shadow-sm", props.className)}>
      <Image
        src={props.src}
        alt={props.alt}
        fill
        className="object-cover"
        sizes={props.sizes ?? "240px"}
      />
    </div>
  );
}
