"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthorSidebar } from "@/components/author-sidebar";
import { DashboardPanelLayout } from "@/components/dashboard-panel-layout";

export function AuthorLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideSidebar =
    pathname === "/author/submissions/new" ||
    /^\/author\/submissions\/[^/]+$/.test(pathname);

  if (hideSidebar) {
    return <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-6">{children}</div>;
  }

  return <DashboardPanelLayout sidebar={<AuthorSidebar />}>{children}</DashboardPanelLayout>;
}

