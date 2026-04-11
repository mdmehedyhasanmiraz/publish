import Link from "next/link";

const actions = [
  { label: "Create Journal", href: "/admin/journals/new" },
  { label: "Create Volume", href: "/admin/volumes/new" },
  { label: "Create Issue", href: "/admin/issues/new" },
  { label: "Manage Submissions", href: "/admin/submissions" },
  { label: "Manage Reviews", href: "/admin/reviews" },
  { label: "Configure Roles", href: "/admin/users" },
];

export default function AdminOverviewPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Overview</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Use this panel to control the full publishing lifecycle from journal setup to final publication.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="rounded border p-4 text-sm font-medium hover:bg-accent">
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
