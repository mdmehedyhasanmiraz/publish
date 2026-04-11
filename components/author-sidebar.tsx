"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DashboardSidebarFrame } from "@/components/dashboard-sidebar-frame";
import type { AuthorSubmissionListFilter } from "@/lib/submissions/author-filters";
import { cn } from "@/lib/utils";

type NavItem =
  | { label: string; href: string; kind: "simple"; match: (pathname: string) => boolean }
  | {
      label: string;
      href: string;
      kind: "submissions-list";
      listFilter: AuthorSubmissionListFilter | null;
    }
  | { label: string; href: string; kind: "new-submission" };

const authorNav: NavItem[] = [
  { label: "Overview", href: "/author", kind: "simple", match: (p) => p === "/author" },
  {
    label: "Submissions",
    href: "/author/submissions",
    kind: "submissions-list",
    listFilter: null,
  },
  {
    label: "Submitted",
    href: "/author/submissions?filter=submitted",
    kind: "submissions-list",
    listFilter: "submitted",
  },
  {
    label: "Under Review",
    href: "/author/submissions?filter=under-review",
    kind: "submissions-list",
    listFilter: "under-review",
  },
  {
    label: "Revision required",
    href: "/author/revision-required",
    kind: "simple",
    match: (p) => p === "/author/revision-required",
  },
  {
    label: "Accepted",
    href: "/author/submissions?filter=accepted",
    kind: "submissions-list",
    listFilter: "accepted",
  },
  {
    label: "Published",
    href: "/author/submissions?filter=published",
    kind: "submissions-list",
    listFilter: "published",
  },
  {
    label: "Rejected",
    href: "/author/submissions?filter=rejected",
    kind: "submissions-list",
    listFilter: "rejected",
  },
  {
    label: "New submission",
    href: "/author/submissions/new",
    kind: "new-submission",
  },
];

function isActive(pathname: string, searchParams: URLSearchParams, item: NavItem): boolean {
  if (item.kind === "simple") {
    return item.match(pathname);
  }
  if (item.kind === "new-submission") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  const filter = searchParams.get("filter");
  if (item.listFilter === null) {
    const onListRoot = pathname === "/author/submissions" && !filter;
    const onSubmissionDetail =
      pathname.startsWith("/author/submissions/") && !pathname.startsWith("/author/submissions/new");
    return onListRoot || onSubmissionDetail;
  }
  return pathname === "/author/submissions" && filter === item.listFilter;
}

export function AuthorSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <DashboardSidebarFrame eyebrow="Author" title="My publishing">
      {authorNav.map((item) => {
        const active = isActive(pathname, searchParams, item);
        return (
          <li key={item.kind === "submissions-list" ? `${item.href}-${item.listFilter ?? "all"}` : item.href}>
            <Link
              href={item.href}
              className={cn(
                "block rounded px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                active && "bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </DashboardSidebarFrame>
  );
}
