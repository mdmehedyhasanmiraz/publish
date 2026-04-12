import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminJournalsPage() {
  const supabase = await createClient();
  const { data: journals } = await supabase
    .from("journals")
    .select("id, name, slug, status, is_open_access")
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
          <Link href="/admin/journals/new">Create journal</Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3">
        {(journals ?? []).length ? (
          (journals ?? []).map((j) => (
            <div key={j.id} className="rounded border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{j.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">/j/{j.slug}</p>
                  {(j.status || j.is_open_access) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[j.status, j.is_open_access ? "Open access" : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/journals/${j.id}`}>Edit</Link>
                </Button>
              </div>
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
