import { ReviewInviteActions } from "./review-invite-actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Payload = Record<string, unknown> | null;

export default async function ReviewInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: raw } = await supabase.rpc("get_reviewer_invite_by_token", { p_token: token });
  const payload = raw as Payload;

  if (!payload || typeof payload !== "object") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">Invitation not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">Check the link from your email or contact the journal.</p>
      </div>
    );
  }

  const p = payload as {
    ok?: boolean;
    invitation_id?: string;
    submission_title?: string;
    journal_name?: string;
    reviewer_email?: string;
    status?: string;
    deadline_at?: string | null;
    reviewer_number?: number | null;
    review_duration_days?: number;
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-semibold">Peer review invitation</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {p.journal_name ? <span className="font-medium text-foreground">{p.journal_name}</span> : "Journal"}{" "}
        invited you to review the following manuscript.
      </p>
      <p className="mt-4 font-medium">{p.submission_title ?? "Manuscript"}</p>
      {p.status === "accepted" && p.deadline_at ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Review deadline:{" "}
          <span className="font-medium text-foreground">{new Date(p.deadline_at).toLocaleString()}</span>
          {p.reviewer_number != null ? (
            <>
              {" "}
              · You are <span className="font-medium text-foreground">Reviewer #{p.reviewer_number}</span>
            </>
          ) : null}
        </p>
      ) : p.review_duration_days != null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Default review window after you accept: {p.review_duration_days} days.
        </p>
      ) : null}

      <div className="mt-6">
        <ReviewInviteActions token={token} payload={p} isLoggedIn={!!user} />
      </div>
    </div>
  );
}
