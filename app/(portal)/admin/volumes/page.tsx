import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVolumesPage() {
  const supabase = await createClient();
  const { data: volumes } = await supabase
    .from("volumes")
    .select("id, volume_number, volume_slug, published_year, journals(name, slug)")
    .order("volume_number", { ascending: false });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Volumes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Define publication volumes per journal and set publication year.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/volumes/new">Create volume</Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-3">
        {(volumes ?? []).length ? (
          (volumes ?? []).map((v) => {
            const j = Array.isArray(v.journals) ? v.journals[0] : v.journals;
            return (
              <div key={v.id} className="rounded border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    Vol. {v.volume_number} {v.published_year ? `(${v.published_year})` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{v.volume_slug}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Journal: {j?.name ?? "—"} {j?.slug ? `(${j.slug})` : ""}
                </p>
              </div>
            );
          })
        ) : (
          <div className="rounded border p-4 text-sm text-muted-foreground">
            No volumes yet. Create one to start organizing issues.
          </div>
        )}
      </div>
    </div>
  );
}
