import { createClient } from "@/lib/supabase/server";

export default async function AdminSubmissionsPage() {
  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, title, status, owner_user_id, journals(name, slug)")
    .order("id", { ascending: false })
    .limit(100);

  return (
    <div>
      <h2 className="text-xl font-semibold">Submissions</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Monitor all manuscript submissions across journals, statuses, and decisions.
      </p>
      <div className="mt-5 grid gap-3">
        {(submissions ?? []).length ? (
          (submissions ?? []).map((s) => {
            const j = Array.isArray(s.journals) ? s.journals[0] : s.journals;
            return (
              <div key={s.id} className="rounded border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm">
                    Status: <span className="font-medium">{s.status}</span>
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Journal: {j?.name ?? "—"} {j?.slug ? `(/j/${j.slug})` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Owner user: {s.owner_user_id}</p>
              </div>
            );
          })
        ) : (
          <div className="rounded border p-4 text-sm text-muted-foreground">
            No submissions yet.
          </div>
        )}
      </div>
    </div>
  );
}
