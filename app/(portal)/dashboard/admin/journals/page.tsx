import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminJournalsPage() {
  const supabase = await createClient();
  const { data: journals } = await supabase
    .from("journals")
    .select("id, name, slug")
    .order("name");

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Journals</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create and manage journals, branding, scope pages, and review policies.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/journals/new">Create journal</Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3">
        {(journals ?? []).length ? (
          (journals ?? []).map((j) => (
            <div key={j.id} className="rounded border bg-white p-4">
              <p className="font-medium">{j.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">/j/{j.slug}</p>
            </div>
          ))
        ) : (
          <div className="rounded border p-4 text-sm text-muted-foreground">
            No journals yet. Use <strong>Create journal</strong> to add your first one.
          </div>
        )}
      </div>
    </div>
  );
}
