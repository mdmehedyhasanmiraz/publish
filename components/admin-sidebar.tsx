import Link from "next/link";
import { DashboardSidebarFrame } from "@/components/dashboard-sidebar-frame";

const adminNav = [
  { label: "Overview", href: "/admin" },
  { label: "Journals", href: "/admin/journals" },
  { label: "Volumes", href: "/admin/volumes" },
  { label: "Issues", href: "/admin/issues" },
  { label: "Articles", href: "/admin/articles" },
  { label: "Submissions", href: "/admin/submissions" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Editorial", href: "/admin/editorial" },
  { label: "Production", href: "/admin/production" },
  { label: "Users & Roles", href: "/admin/users" },
  { label: "Admin settings", href: "/admin/settings" },
  { label: "Analytics", href: "/admin/analytics" },
];

export function AdminSidebar() {
  return (
    <DashboardSidebarFrame eyebrow="Admin Panel" title="Publisher Control">
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
    </DashboardSidebarFrame>
  );
}
