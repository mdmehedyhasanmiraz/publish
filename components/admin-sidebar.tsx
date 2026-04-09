import Link from "next/link";

const adminNav = [
  { label: "Overview", href: "/dashboard/admin" },
  { label: "Journals", href: "/dashboard/admin/journals" },
  { label: "Volumes", href: "/dashboard/admin/volumes" },
  { label: "Issues", href: "/dashboard/admin/issues" },
  { label: "Submissions", href: "/dashboard/admin/submissions" },
  { label: "Reviews", href: "/dashboard/admin/reviews" },
  { label: "Editorial", href: "/dashboard/admin/editorial" },
  { label: "Production", href: "/dashboard/admin/production" },
  { label: "Users & Roles", href: "/dashboard/admin/users" },
  { label: "Settings", href: "/dashboard/admin/settings" },
  { label: "Analytics", href: "/dashboard/admin/analytics" },
];

export function AdminSidebar() {
  return (
    <aside className="w-full border-r border-border bg-muted/20 md:w-72">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
          Admin Panel
        </p>
        <h2 className="mt-1 text-xl font-semibold">Publisher Control</h2>
      </div>
      <nav className="p-3">
        <ul className="space-y-1">
          {adminNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
