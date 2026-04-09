import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-5 rounded border border-border bg-white px-5 py-4">
        <h1 className="text-2xl font-bold">Publisher Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Central control for journals, publication pipeline, submissions, reviews, and roles.
        </p>
      </div>
      <div className="flex flex-col overflow-hidden rounded border border-border bg-white md:flex-row">
        <AdminSidebar />
        <section className="min-h-[70vh] flex-1 p-5 md:p-7">{children}</section>
      </div>
    </main>
  );
}
