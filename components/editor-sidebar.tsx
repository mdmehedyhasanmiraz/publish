"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardSidebarFrame } from "@/components/dashboard-sidebar-frame";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Overview", href: "/editor" },
  { label: "Editorial queue", href: "/editor/queue" },
  { label: "Articles", href: "/editor/articles" },
];

export function EditorSidebar() {
  const pathname = usePathname();
  return (
    <DashboardSidebarFrame eyebrow="Editor" title="Editorial office">
      {nav.map((item) => {
        const active =
          item.href === "/editor" ? pathname === "/editor" : pathname.startsWith(item.href);
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
