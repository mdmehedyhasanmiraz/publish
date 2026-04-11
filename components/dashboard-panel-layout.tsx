import type { ReactNode } from "react";

type DashboardPanelLayoutProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

export function DashboardPanelLayout({ sidebar, children }: DashboardPanelLayoutProps) {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-6">
      <div className="flex flex-col overflow-hidden rounded border border-border bg-white md:flex-row">
        {sidebar}
        <main className="min-h-[70vh] flex-1 p-5 md:p-7">{children}</main>
      </div>
    </div>
  );
}
