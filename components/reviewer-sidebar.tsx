"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardSidebarFrame } from "@/components/dashboard-sidebar-frame";
import { cn } from "@/lib/utils";

const reviewerNav = [
  { label: "My reviews", href: "/reviewer" },
  { label: "Profile", href: "/profile" },
];

export function ReviewerSidebar() {
  const pathname = usePathname();

  return (
    <DashboardSidebarFrame eyebrow="Reviewer" title="Peer review">
      {reviewerNav.map((item) => {
        const active =
          item.href === "/reviewer"
            ? pathname === "/reviewer" || pathname.startsWith("/reviewer/")
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <li key={item.href}>
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
