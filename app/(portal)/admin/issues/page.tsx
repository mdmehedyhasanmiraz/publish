import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AdminIssuesPage() {
  const supabase = await createClient();
  const { data: issues } = await supabase
    .from("issues")
    .select("id, issue_number, issue_slug, volumes(volume_number, volume_slug), journals(name, slug)")
    .order("issue_slug", { ascending: true });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Issues</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create issues under a volume and assign accepted articles when ready.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/issues/new">Create issue</Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-3">
        {(issues ?? []).length ? (
          (issues ?? []).map((i) => {
            const v = Array.isArray(i.volumes) ? i.volumes[0] : i.volumes;
            const j = Array.isArray(i.journals) ? i.journals[0] : i.journals;
            return (
              <div key={i.id} className="rounded border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    <Link href={`/admin/issues/${i.id}`} className="hover:text-primary hover:underline">
                      {i.issue_number ? `Issue ${i.issue_number}` : "Issue"} - {i.issue_slug}
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Volume: {v?.volume_number ?? "—"} ({v?.volume_slug ?? "—"})
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Journal: {j?.name ?? "—"} {j?.slug ? `(${j.slug})` : ""}
                </p>
              </div>
            );
          })
        ) : (
          <div className="rounded border p-4 text-sm text-muted-foreground">
            No issues yet. Create a volume first, then create issues under it.
          </div>
        )}
      </div>
    </div>
  );
}
