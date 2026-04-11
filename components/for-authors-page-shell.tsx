import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { forAuthorsPolicyLinks } from "@/lib/for-authors-nav";

export function ForAuthorsPageShell(props: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  /** When set, show other policy/APC pages at the bottom (excludes this path). */
  policyIndexExcept?: string;
}) {
  const related = [
    { href: "/for-authors/journal-policy", label: "Journal policy overview" },
    ...forAuthorsPolicyLinks,
  ].filter((item) => item.href !== props.policyIndexExcept);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[50vh] max-w-3xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">For authors</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{props.title}</h1>
        {props.intro ? <div className="mt-3 text-sm text-muted-foreground">{props.intro}</div> : null}
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-foreground">{props.children}</div>
        {props.policyIndexExcept !== undefined ? (
          <nav aria-label="Related policies" className="mt-12 border-t border-border pt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related pages</p>
            <ul className="mt-3 space-y-2 text-sm">
              {related.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-primary hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
