import { createClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const [{ data: emailEvents }, { data: openalexMatches }, { data: auditLogs }] = await Promise.all([
    supabase.from("email_events").select("id, event_type, recipient, provider, status").order("id", { ascending: false }).limit(20),
    supabase.from("openalex_matches").select("id, entity_type, openalex_id, journal_id").order("id", { ascending: false }).limit(20),
    supabase.from("audit_logs").select("id, actor_user_id, entity_type, entity_id, action").order("id", { ascending: false }).limit(20),
  ]);

  return (
    <div>
      <h2 className="text-xl font-semibold">Admin Settings</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Configure platform-wide settings such as workflows, branding defaults, and integrations.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded border bg-white p-4">
          <h3 className="text-sm font-semibold">Recent Email Events</h3>
          <div className="mt-3 grid gap-2">
            {(emailEvents ?? []).length ? (
              (emailEvents ?? []).map((e) => (
                <div key={e.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{e.event_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.recipient} · {e.provider} · {e.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No email events.</p>
            )}
          </div>
        </section>

        <section className="rounded border bg-white p-4">
          <h3 className="text-sm font-semibold">Recent OpenAlex Matches</h3>
          <div className="mt-3 grid gap-2">
            {(openalexMatches ?? []).length ? (
              (openalexMatches ?? []).map((m) => (
                <div key={m.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{m.entity_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.openalex_id} {m.journal_id ? `· journal=${m.journal_id}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No OpenAlex matches.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-5 rounded border bg-white p-4">
        <h3 className="text-sm font-semibold">Recent Audit Logs</h3>
        <div className="mt-3 grid gap-2">
          {(auditLogs ?? []).length ? (
            (auditLogs ?? []).map((a) => (
              <div key={a.id} className="rounded border p-3 text-sm">
                <p>
                  <span className="font-medium">{a.action}</span> · {a.entity_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  actor={a.actor_user_id} · entity={a.entity_id}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No audit logs found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
