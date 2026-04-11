import { createClient } from "@/lib/supabase/server";

export default async function AdminReviewsPage() {
  const supabase = await createClient();

  const [{ data: rounds }, { data: invites }] = await Promise.all([
    supabase
      .from("review_rounds")
      .select("id, round_number, submission_id, submissions(title)")
      .order("round_number", { ascending: false })
      .limit(100),
    supabase
      .from("reviewer_invitations")
      .select("id, review_round_id, reviewer_user_id, status")
      .limit(500),
  ]);

  const invitesByRound = new Map<string, { total: number; pending: number; accepted: number; done: number }>();
  for (const i of invites ?? []) {
    const key = String(i.review_round_id);
    const current = invitesByRound.get(key) ?? { total: 0, pending: 0, accepted: 0, done: 0 };
    current.total += 1;
    const status = String(i.status ?? "").toLowerCase();
    if (status.includes("accept")) current.accepted += 1;
    else if (status.includes("complete") || status.includes("done")) current.done += 1;
    else current.pending += 1;
    invitesByRound.set(key, current);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Reviews</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Track reviewer invitations, pending reviews, completed reports, and overdue tasks.
      </p>
      <div className="mt-5 grid gap-3">
        {(rounds ?? []).length ? (
          (rounds ?? []).map((r) => {
            const s = Array.isArray(r.submissions) ? r.submissions[0] : r.submissions;
            const stats = invitesByRound.get(r.id) ?? { total: 0, pending: 0, accepted: 0, done: 0 };
            return (
              <div key={r.id} className="rounded border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    Round {r.round_number} - {s?.title ?? r.submission_id}
                  </p>
                  <p className="text-sm text-muted-foreground">Invitations: {stats.total}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pending: {stats.pending} | Accepted: {stats.accepted} | Completed: {stats.done}
                </p>
              </div>
            );
          })
        ) : (
          <div className="rounded border p-4 text-sm text-muted-foreground">
            No review rounds yet.
          </div>
        )}
      </div>
    </div>
  );
}
