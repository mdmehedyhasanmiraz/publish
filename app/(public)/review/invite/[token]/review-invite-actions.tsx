"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Payload = {
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

export function ReviewInviteActions({
  token,
  payload,
  isLoggedIn,
}: {
  token: string;
  payload: Payload;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declineBusy, setDeclineBusy] = useState(false);
  const nextPath = `/review/invite/${encodeURIComponent(token)}`;
  const emailQ = payload.reviewer_email
    ? `&email=${encodeURIComponent(payload.reviewer_email)}`
    : "";

  async function accept() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("accept_reviewer_invitation", { p_token: token });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    const row = data as { ok?: boolean; error?: string; invitation_id?: string } | null;
    if (row?.ok) {
      const invId = row.invitation_id;
      if (invId) router.push(`/reviewer/reviews/${invId}`);
      else router.refresh();
      return;
    }
    setMsg(row?.error ?? "Could not accept invitation.");
  }

  async function decline() {
    setDeclineBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("decline_reviewer_invitation", { p_token: token });
    setDeclineBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    const row = data as { ok?: boolean; error?: string } | null;
    if (row?.ok) {
      router.refresh();
      setMsg("You have declined this invitation.");
      return;
    }
    setMsg(row?.error ?? "Could not decline invitation.");
  }

  if (payload.status === "pending_send") {
    return <p className="text-sm text-muted-foreground">This invitation has not been sent yet.</p>;
  }

  if (payload.status === "declined") {
    return <p className="text-sm text-muted-foreground">You declined this invitation.</p>;
  }

  if (payload.status === "completed") {
    return (
      <p className="text-sm text-muted-foreground">
        Thank you — your review has already been submitted.
      </p>
    );
  }

  if (payload.status === "accepted") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">You have accepted this invitation.</p>
        {payload.invitation_id ? (
          <Button asChild>
            <Link href={`/reviewer/reviews/${payload.invitation_id}`}>Open review task</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  if (payload.status !== "sent") {
    return <p className="text-sm text-muted-foreground">This invitation is not open for acceptance.</p>;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Sign in or create an account using the same email this invitation was sent to (
          <span className="font-medium text-foreground">{payload.reviewer_email}</span>), then accept
          below.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default">
            <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>Log in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/auth/sign-up?next=${encodeURIComponent(nextPath)}${emailQ}`}>Sign up</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button disabled={busy} onClick={() => void accept()}>
        {busy ? "Working…" : "Accept invitation"}
      </Button>
      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
    </div>
  );
}
