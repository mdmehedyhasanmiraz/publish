import Link from "next/link";

const cards = [
  ["Admin Panel", "/dashboard/admin"],
  ["Submissions", "/dashboard/submissions"],
  ["Reviews", "/dashboard/reviews"],
  ["Editorial", "/dashboard/editorial"],
  ["Production", "/dashboard/production"],
  ["Settings", "/dashboard/settings"],
] as const;

export default function DashboardHomePage() {
  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {cards.map(([label, href]) => (
          <Link key={href} href={href} className="rounded border p-4 hover:bg-accent">
            {label}
          </Link>
        ))}
      </div>
    </main>
  );
}
