"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FileDown } from "lucide-react";
import type { ArticleTocItem } from "@/lib/articles/markdown";
import { CC_BY_4_0_URL, CcByLicenseBadge } from "@/components/public/cc-by-license-badge";
import { ArticleCiteButton } from "@/components/public/article-cite-button";
import type { CitationWork } from "@/lib/articles/citation-formats";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ArticlePublicSidebar(props: {
  tocItems: ArticleTocItem[];
  citationWork: CitationWork;
  citationDownloadBaseName: string;
  pdfUrl?: string | null;
}) {
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  return (
    <aside className="space-y-8 border-t border-border pt-8 lg:sticky lg:top-24 lg:self-start lg:border-t-0 lg:pt-0">
      <div className="flex flex-col gap-2.5">
        {props.pdfUrl ? (
          <Button asChild className="w-full gap-2">
            <a href={props.pdfUrl} target="_blank" rel="noopener noreferrer">
              <FileDown className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        ) : (
          <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" className="w-full gap-2">
                <FileDown className="h-4 w-4" />
                Download PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Download PDF</DialogTitle>
                <DialogDescription className="pt-2 text-sm text-foreground">
                  PDF is unavailable for this article right now.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}

        <ArticleCiteButton
          work={props.citationWork}
          citationDownloadBaseName={props.citationDownloadBaseName}
          className="w-full justify-center py-2"
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
        {props.tocItems.length > 0 ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {props.tocItems.map((item) => (
              <li key={`${item.id}-${item.text}`}>
                <a
                  href={`#${item.id}`}
                  className="block text-muted-foreground transition-colors hover:text-foreground [overflow-wrap:anywhere]"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No section headings.</p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">License</p>
        <div className="mt-2">
          <CcByLicenseBadge />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          <Link href={CC_BY_4_0_URL} className="font-medium text-primary underline-offset-2 hover:underline" target="_blank" rel="license noopener noreferrer">
            Creative Commons Attribution 4.0 International
          </Link>
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
          Access type
        </p>
        <Image
          src="/logos/logo-openaccess.svg"
          alt="Open access"
          width={70}
          height={27}
          className="mt-1 h-auto w-full max-w-[100px]"
        />
      </div>
    </aside>
  );
}
