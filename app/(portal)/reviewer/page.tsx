import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  switch (status) {
    case "accepted":
      return "In progress";
    case "completed":
      return "Completed";
    case "sent":
      return "Awaiting acceptance";
    case "declined":
      return "Declined";
    case "pending_send":
      return "Pending send";
    default:
      return status;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "accepted":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "completed":
      return "border-slate-200 bg-slate-100 text-slate-900";
    case "sent":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "declined":
      return "border-red-200 bg-red-50 text-red-950";
    default:
      return "border-border bg-muted text-foreground";
  }
}

export default async function ReviewerHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: invites } = await supabase
    .from("reviewer_invitations")
    .select(
      `
      id,
      status,
      reviewer_number,
      deadline_at,
      sent_at,
      accepted_at,
      review_rounds (
        submissions (
          id,
          title,
          journals ( name )
        )
      )
    `,
    )
    .eq("reviewer_user_id", user.id)
    .order("id", { ascending: false })
    .limit(100);

  const list = invites ?? [];
  const active = list.filter((i) => i.status === "accepted");
  const done = list.filter((i) => i.status === "completed");
  const other = list.filter((i) => i.status !== "accepted" && i.status !== "completed");

  return (
    <div>
      <h2 className="text-xl font-semibold">Reviewer workspace</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        New invitations arrive by email. Open the link, sign in with the invited address, then accept to see the
        task here. Use the role switcher (Author / Reviewer) in the header when you wear both hats.
      </p>

      <div className="mt-8 grid gap-10">
        <section>
          <h3 className="text-sm font-semibold text-foreground">Active &amp; pending</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Continue a review after you have accepted, or finish onboarding from your invite email.
          </p>
          <div className="mt-4 grid gap-3">
            {active.length ? (
              active.map((inv) => (
                <ReviewerInviteCard key={inv.id} inv={inv} />
              ))
            ) : (
              <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                No open reviews. Use the link in your invitation email to accept — then return here.
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Completed reviews</h3>
          <p className="mt-1 text-xs text-muted-foreground">Submitted reports and downloads for your records.</p>
          <div className="mt-4 grid gap-3">
            {done.length ? (
              done.map((inv) => <ReviewerInviteCard key={inv.id} inv={inv} />)
            ) : (
              <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                No completed reviews yet.
              </div>
            )}
          </div>
        </section>

        {other.length ? (
          <section>
            <h3 className="text-sm font-semibold text-foreground">Other</h3>
            <div className="mt-4 grid gap-3">
              {other.map((inv) => (
                <ReviewerInviteCard key={inv.id} inv={inv} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ReviewerInviteCard({
  inv,
}: {
  inv: {
    id: string;
    status: string;
    reviewer_number: number | null;
    deadline_at: string | null;
    sent_at: string | null;
    accepted_at: string | null;
    review_rounds: unknown;
  };
}) {
  const rrRaw = inv.review_rounds as unknown;
  const rr = Array.isArray(rrRaw) ? rrRaw[0] : rrRaw;
  const rrObj = rr as {
    submissions?: { title: string; journals: { name: string } | { name: string }[] | null } | null;
  };
  const subRaw = rrObj?.submissions;
  const sub = Array.isArray(subRaw) ? subRaw[0] : subRaw;
  const jRaw = sub?.journals;
  const journal = Array.isArray(jRaw) ? jRaw[0] : jRaw;

  const canOpenTask = inv.status === "accepted" || inv.status === "completed";
  const cta =
    inv.status === "completed"
      ? "View report & files"
      : inv.status === "accepted"
        ? "Continue review"
        : null;

  return (
    <div className="rounded border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{sub?.title ?? "Submission"}</p>
          {journal?.name ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{journal.name}</p>
          ) : null}
        </div>
        <Badge variant="outline" className={statusBadgeClass(inv.status)}>
          {statusLabel(inv.status)}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {inv.reviewer_number != null ? <span>Reviewer #{inv.reviewer_number}</span> : null}
        {inv.deadline_at ? <span>Deadline {new Date(inv.deadline_at).toLocaleDateString()}</span> : null}
        {inv.accepted_at ? <span>Accepted {new Date(inv.accepted_at).toLocaleDateString()}</span> : null}
      </div>
      {canOpenTask ? (
        <div className="mt-3">
          <Link href={`/reviewer/reviews/${inv.id}`} className="text-sm font-medium text-primary hover:underline">
            {cta} →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
