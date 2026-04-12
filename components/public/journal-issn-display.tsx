import { cn } from "@/lib/utils";

type JournalIssnDisplayProps = {
  issn_print: string | null | undefined;
  issn_online: string | null | undefined;
  className?: string;
  /** Inline fits article metadata rows; stacked for journal overview pages. */
  variant?: "stacked" | "inline";
};

/** Renders nothing when neither print nor online ISSN is set. */
export function JournalIssnDisplay({
  issn_print,
  issn_online,
  className,
  variant = "stacked",
}: JournalIssnDisplayProps) {
  const p = (issn_print ?? "").trim();
  const o = (issn_online ?? "").trim();
  if (!p && !o) return null;

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
        {p ? (
          <span>
            <span className="font-medium text-foreground">ISSN (Print): </span>
            {p}
          </span>
        ) : null}
        {o ? (
          <span>
            <span className="font-medium text-foreground">ISSN (Online): </span>
            {o}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div className={cn("space-y-0.5 text-sm text-muted-foreground", className)} role="group" aria-label="ISSN">
      {p ? (
        <p>
          <span className="font-medium text-foreground/90">ISSN (Print): </span>
          {p}
        </p>
      ) : null}
      {o ? (
        <p>
          <span className="font-medium text-foreground/90">ISSN (Online): </span>
          {o}
        </p>
      ) : null}
    </div>
  );
}
