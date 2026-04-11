import Image from "next/image";
import { cn } from "@/lib/utils";

export function JournalCoverImage(props: {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  if (!props.src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed bg-muted/40 text-center text-xs text-muted-foreground",
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
