import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function DashboardSidebarFrame({ eyebrow, title, children }: Props) {
  return (
    <aside className="w-full border-r border-border bg-muted/20 md:w-72">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      </div>
      <nav className="p-3">
        <ul className="space-y-1">{children}</ul>
      </nav>
    </aside>
  );
}
