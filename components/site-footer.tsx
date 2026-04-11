import Link from "next/link";
import Image from "next/image";
import { forAuthorsPolicyLinks } from "@/lib/for-authors-nav";

const footerLink =
  "block text-sm text-white/80 transition-colors hover:text-white [overflow-wrap:anywhere]";

const publicationPolicyLinks = [
  { href: "/for-authors/journal-policy", label: "Journal policy overview" },
  ...forAuthorsPolicyLinks,
  { href: "/for-authors/submission-guidelines", label: "Submission guidelines" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 max-w-full overflow-x-hidden border-t border-black bg-black text-white">
      <div className="mx-auto min-w-0 max-w-7xl px-6 py-12">
        {/* One grid: top and bottom rows share the same xl:6-column track for alignment */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* —— Row 1 —— */}
          <div className="min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <Link href="/" className="inline-block">
              <Image
                src="/logos/logo-sciencelet-w.svg"
                alt="Sciencelet"
                width={120}
                height={28}
                className="h-7 w-auto"
              />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
              Multi-journal publishing platform for peer review, editorial workflow, and public dissemination of
              research.
            </p>
          </div>

          <div className="min-w-0 xl:col-span-1">
            <h4 className="text-sm font-semibold tracking-wide text-white">Explore</h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/journals" className={footerLink}>
                  All journals
                </Link>
              </li>
              <li>
                <Link href="/latest-research" className={footerLink}>
                  Latest research
                </Link>
              </li>
              <li>
                <Link href="/search" className={footerLink}>
                  Search
                </Link>
              </li>
              <li>
                <Link href="/about" className={footerLink}>
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div className="min-w-0 xl:col-span-1">
            <h4 className="text-sm font-semibold tracking-wide text-white">For authors</h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/for-authors/submission-guidelines" className={footerLink}>
                  Submission guidelines
                </Link>
              </li>
              <li>
                <Link href="/for-authors/journal-policy" className={footerLink}>
                  Journal policy overview
                </Link>
              </li>
              <li>
                <Link href="/for-authors/contact" className={footerLink}>
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/author/submissions/new" className={footerLink}>
                  Submit a manuscript
                </Link>
              </li>
              <li>
                <Link href="/author/submissions" className={footerLink}>
                  Author dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div className="min-w-0 xl:col-span-1">
            <h4 className="text-sm font-semibold tracking-wide text-white">Review &amp; editorial</h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/reviewer" className={footerLink}>
                  Reviewer portal
                </Link>
              </li>
              <li>
                <Link href="/editor/queue" className={footerLink}>
                  Editorial office
                </Link>
              </li>
              <li>
                <Link href="/production" className={footerLink}>
                  Production
                </Link>
              </li>
            </ul>
          </div>

          <div className="min-w-0 xl:col-span-1">
            <h4 className="text-sm font-semibold tracking-wide text-white">Account</h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/auth/login" className={footerLink}>
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/auth/sign-up" className={footerLink}>
                  Create an account
                </Link>
              </li>
            </ul>
          </div>

          {/* —— Row 2 (xl: aligns under brand | explore+for-authors | review | account) —— */}
          <div className="hidden min-w-0 xl:col-span-2 xl:block" aria-hidden />
          <div className="min-w-0 max-xl:border-t max-xl:border-white/15 max-xl:pt-10 sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <h4 className="text-sm font-semibold tracking-wide text-white">Publication Policies</h4>
            <ul className="mt-3 space-y-2.5">
              {publicationPolicyLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 max-xl:border-t max-xl:border-white/15 max-xl:pt-10 sm:col-span-2 lg:col-span-3 xl:col-span-1">
            <h4 className="text-sm font-semibold tracking-wide text-white">Legal</h4>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link href="/privacy" className={footerLink}>
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={footerLink}>
                  Terms of use
                </Link>
              </li>
              <li>
                <Link href="/cookies" className={footerLink}>
                  Cookie policy
                </Link>
              </li>
            </ul>
          </div>
          <div className="hidden min-w-0 xl:col-span-1 xl:block" aria-hidden />
        </div>

        <div className="mt-10 border-t border-white/15 pt-8">
          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} Sciencelet. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
