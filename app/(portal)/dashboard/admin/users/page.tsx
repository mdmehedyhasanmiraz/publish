import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, role, first_name, last_name, display_name, email")
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("memberships")
      .select("id, user_id, role, status, journal_id, publisher_id")
      .order("id", { ascending: false })
      .limit(200),
  ]);

  return (
    <div>
      <h2 className="text-xl font-semibold">Users & Roles</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Invite staff and configure publisher- and journal-scoped permissions.
      </p>

      <div className="mt-5 rounded border bg-white p-4">
        <h3 className="text-sm font-semibold">Profiles</h3>
        <div className="mt-3 grid gap-2">
          {(profiles ?? []).length ? (
            (profiles ?? []).map((p) => (
              <div key={p.user_id} className="rounded border p-3 text-sm">
                <p className="font-medium">
                  {p.display_name || `${p.first_name} ${p.last_name}`.trim() || p.user_id}
                </p>
                <p className="text-muted-foreground">
                  {p.email || "No email"} · Role: <span className="font-medium">{p.role}</span>
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No profiles found.</p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded border bg-white p-4">
        <h3 className="text-sm font-semibold">Memberships</h3>
        <div className="mt-3 grid gap-2">
          {(memberships ?? []).length ? (
            (memberships ?? []).map((m) => (
              <div key={m.id} className="rounded border p-3 text-sm">
                <p>
                  <span className="font-medium">{m.role}</span> · {m.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  user={m.user_id} · publisher={m.publisher_id} {m.journal_id ? `· journal=${m.journal_id}` : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No memberships found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
