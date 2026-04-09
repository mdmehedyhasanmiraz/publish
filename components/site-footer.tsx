import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-black bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-4">
        <div>
          <h3 className="text-sm font-semibold">PublisherOS</h3>
          <p className="mt-3 text-sm text-white/80">
            Multi-journal publishing platform for peer review, editorial workflow, and public dissemination.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Journals</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>
              <Link href="/j/demo-journal" className="hover:text-white">
                Demo Journal
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-white">
                Browse by Subject
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Authors & Reviewers</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>
              <Link href="/dashboard/submissions" className="hover:text-white">
                Submit Manuscript
              </Link>
            </li>
            <li>
              <Link href="/dashboard/reviews" className="hover:text-white">
                Reviewer Portal
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Policies</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>
              <Link href="#" className="hover:text-white">
                Ethics & Integrity
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-white">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/20 px-6 py-4 text-center text-xs text-white/70">
        © {new Date().getFullYear()} PublisherOS. All rights reserved.
      </div>
    </footer>
  );
}
