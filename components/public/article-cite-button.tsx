"use client";

import { useMemo, useState } from "react";
import { BookMarked, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CITATION_STYLE_IDS,
  CITATION_STYLE_LABELS,
  type CitationStyleId,
  type CitationWork,
  formatCitationBibtex,
  formatCitationForStyle,
  formatCitationPlain,
  formatCitationRis,
  plainToRtf,
} from "@/lib/articles/citation-formats";
import { cn } from "@/lib/utils";

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeFilenameSlug(slug: string): string {
  const s = slug.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return s || "article";
}

export function ArticleCiteButton(props: { work: CitationWork; citationDownloadBaseName: string; className?: string }) {
  const { work, citationDownloadBaseName, className } = props;
  const base = safeFilenameSlug(citationDownloadBaseName);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CitationStyleId>("apa");
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => formatCitationForStyle(work, style), [work, style]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn("shrink-0 gap-1.5", className)}>
          <BookMarked className="size-3.5 shrink-0" aria-hidden />
          Cite this article
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90vh,640px)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cite this article</DialogTitle>
          <DialogDescription>
            Choose a style, copy the text, or download BibTeX, RIS (EndNote / Zotero), or RTF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="citation-style">Citation style</Label>
            <select
              id="citation-style"
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
              value={style}
              onChange={(e) => setStyle(e.target.value as CitationStyleId)}
            >
              {CITATION_STYLE_IDS.map((id) => (
                <option key={id} value={id}>
                  {CITATION_STYLE_LABELS[id]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="citation-text">Citation</Label>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => void copy()}>
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Textarea
              id="citation-text"
              readOnly
              value={text}
              rows={style === "bibtex" ? 12 : 6}
              className="resize-y font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Download</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadText(`${base}.bib`, formatCitationBibtex(work), "application/x-bibtex;charset=utf-8")}
              >
                BibTeX (.bib)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadText(`${base}.ris`, formatCitationRis(work), "application/x-research-info-systems;charset=utf-8")
                }
              >
                RIS — EndNote / Zotero (.ris)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadText(
                    `${base}.rtf`,
                    plainToRtf(formatCitationPlain(work, style)),
                    "application/rtf;charset=utf-8",
                  )
                }
              >
                Rich Text (.rtf)
              </Button>
            </div>
            <p className="text-[0.7rem] text-muted-foreground">
              RTF uses the style selected above. BibTeX and RIS are fixed formats for reference managers.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
