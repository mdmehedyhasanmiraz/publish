"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardSidebarFrame } from "@/components/dashboard-sidebar-frame";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Overview", href: "/production" },
  { label: "Pipeline", href: "/production/pipeline" },
];

export function ProductionSidebar() {
  const pathname = usePathname();
  return (
    <DashboardSidebarFrame eyebrow="Production" title="Publishing">
      {nav.map((item) => {
        const active =
          item.href === "/production"
            ? pathname === "/production"
            : pathname.startsWith(item.href);
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
