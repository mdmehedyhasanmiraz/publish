import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logos/logo-sciencelet-w.svg";

/**
 * Fallback when a journal (or issue) has no cover image: Sciencelet wordmark + journal title on a dark slate panel.
 */
export function JournalCoverPlaceholder(props: {
  journalName: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col items-center justify-center gap-2.5 bg-slate-900 px-2 py-4 text-center",
        props.className,
      )}
    >
      <Image src={LOGO_SRC} alt="Sciencelet" width={120} height={28} className="h-6 w-auto shrink-0 opacity-95" />
      <p className="line-clamp-4 w-full text-xs font-medium leading-snug text-slate-100">{props.journalName}</p>
    </div>
  );
}
