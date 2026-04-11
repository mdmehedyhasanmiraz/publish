import Image from "next/image";
import Link from "next/link";
import type { ArticleTocItem } from "@/lib/articles/markdown";
import { CC_BY_4_0_URL, CcByLicenseBadge } from "@/components/public/cc-by-license-badge";

export function ArticlePublicSidebar(props: {
  tocItems: ArticleTocItem[];
  manuscriptReferenceCode?: string | null;
}) {
  return (
    <aside className="space-y-8 border-t border-border pt-8 lg:sticky lg:top-24 lg:self-start lg:border-t-0 lg:pt-0">
      {props.manuscriptReferenceCode ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manuscript ID</p>
          <p className="mt-2 font-mono text-sm text-foreground [overflow-wrap:anywhere]">{props.manuscriptReferenceCode}</p>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
        {props.tocItems.length > 0 ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {props.tocItems.map((item) => (
              <li key={`${item.id}-${item.text}`}>
                <a
                  href={`#${item.id}`}
                  className="text-muted-foreground transition-colors hover:text-foreground [overflow-wrap:anywhere]"
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
