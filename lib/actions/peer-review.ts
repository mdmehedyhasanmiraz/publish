"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { PeerReviewChecklist } from "@/lib/peer-review/checklist";
import {
  applyAuthorDecisionTemplate,
  applyReviewerInviteTemplate,
  defaultAuthorDecisionBody,
  defaultAuthorDecisionSubject,
  defaultReviewerInviteBody,
  defaultReviewerInviteSubject,
  type AuthorDecisionMailKind,
} from "@/lib/peer-review/email-defaults";
import { revalidatePath } from "next/cache";
import { ensureArticleForSubmissionAction } from "@/lib/actions/article";
import { isOutboundSmtpConfigured, sendOutboundEmail } from "@/lib/email/outbound";

function siteOrigin() {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (u) return u;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function logOutboundEmail(kind: string, to: string, subject: string, body: string) {
  console.info(`[email:outbound:${kind}]`, { to, subject, bodyPreview: body.slice(0, 200) });
}

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

function newInviteToken() {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return Buffer.from(buf).toString("base64url");
}

export async function assignHandlingEditorAction(submissionId: string, editorUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase.rpc("assign_submission_handling_editor", {
    p_submission_id: submissionId,
    p_editor_user_id: editorUserId,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/submissions/${submissionId}`);
  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath("/admin/submissions");
  revalidatePath("/editor/queue");
  return { ok: true as const };
}

export async function saveEmailTemplatePresetAction(input: {
  templateKey: "reviewer_invite" | "author_decision";
  journalId: string | null;
  subject: string;
  body: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  let q = supabase
    .from("email_template_presets")
    .select("id")
    .eq("user_id", user.id)
    .eq("template_key", input.templateKey);

  q = input.journalId ? q.eq("journal_id", input.journalId) : q.is("journal_id", null);

  const { data: row } = await q.maybeSingle();

  if (row?.id) {
    const { error } = await supabase
      .from("email_template_presets")
      .update({
        subject: input.subject,
        body: input.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from("email_template_presets").insert({
      user_id: user.id,
      template_key: input.templateKey,
      journal_id: input.journalId,
      subject: input.subject,
      body: input.body,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

export async function loadEmailTemplatePresetAction(input: {
  templateKey: "reviewer_invite" | "author_decision";
  journalId: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  let q = supabase
    .from("email_template_presets")
    .select("subject, body")
    .eq("user_id", user.id)
    .eq("template_key", input.templateKey);

  q = input.journalId ? q.eq("journal_id", input.journalId) : q.is("journal_id", null);

  const { data } = await q.maybeSingle();
  if (data) return { ok: true as const, subject: data.subject, body: data.body };

  if (input.templateKey === "reviewer_invite") {
    return {
      ok: true as const,
      subject: defaultReviewerInviteSubject(),
      body: defaultReviewerInviteBody(),
    };
  }
  return {
    ok: true as const,
    subject: defaultAuthorDecisionSubject(),
    body: defaultAuthorDecisionBody(),
  };
}

export async function createPeerReviewInvitationsAction(input: {
  submissionId: string;
  emails: string[];
  reviewDurationDays: number;
  subject: string;
  body: string;
  saveAsDefault: boolean;
  journalId: string | null;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, error: "Not signed in." };

    const raw = input.emails.map(normalizeEmail).filter(Boolean);
    const unique = Array.from(new Set(raw));
    if (unique.length === 0) return { ok: false as const, error: "Add at least one reviewer email." };
    if (unique.length > 10) return { ok: false as const, error: "You can invite at most 10 reviewers at once." };

    const { data: roundIdRaw, error: rErr } = await supabase.rpc("ensure_active_review_round", {
      p_submission_id: input.submissionId,
    });
    if (rErr || roundIdRaw == null || roundIdRaw === "") {
      return { ok: false as const, error: rErr?.message ?? "Could not open review round." };
    }

    const roundId = String(roundIdRaw);

    const { count } = await supabase
      .from("reviewer_invitations")
      .select("id", { count: "exact", head: true })
      .eq("review_round_id", roundId)
      .in("status", ["pending_send", "sent", "accepted", "completed"]);

    const existing = count ?? 0;
    if (existing + unique.length > 10) {
      return { ok: false as const, error: "This round already has reviewers; maximum is 10 active invitations." };
    }

    // Journal must come from the submission (authoritative FK). Do not read review_rounds.journal_id
    // here: RLS on review_rounds only allows the assigned handling editor (or platform admin), while
    // staff who can manage the workflow often have submissions access via can_edit_articles / admin paths.
    const { data: submissionRow, error: subJournalErr } = await supabase
      .from("submissions")
      .select("journal_id")
      .eq("id", input.submissionId)
      .single();

    const journalId = submissionRow?.journal_id as string | undefined;
    if (subJournalErr || !journalId) {
      return {
        ok: false as const,
        error: subJournalErr?.message ?? "Missing journal for submission.",
      };
    }

    for (const email of unique) {
      const { error: insErr } = await supabase.from("reviewer_invitations").insert({
        journal_id: journalId,
        review_round_id: roundId,
        reviewer_email: email,
        reviewer_user_id: null,
        status: "pending_send",
        invite_token: newInviteToken(),
        review_duration_days: Math.min(90, Math.max(1, Math.floor(input.reviewDurationDays) || 7)),
      });
      if (insErr) return { ok: false as const, error: insErr.message };
    }

    if (input.saveAsDefault) {
      const preset = await saveEmailTemplatePresetAction({
        templateKey: "reviewer_invite",
        journalId: input.journalId,
        subject: input.subject,
        body: input.body,
      });
      if (!preset.ok) {
        console.warn("[createPeerReviewInvitationsAction] save default template failed:", preset.error);
      }
    }

    try {
      revalidatePath(`/admin/submissions/${input.submissionId}`);
      revalidatePath(`/editor/submissions/${input.submissionId}`);
    } catch (revErr) {
      console.error("[createPeerReviewInvitationsAction] revalidatePath", revErr);
    }
    return { ok: true as const };
  } catch (e) {
    console.error("[createPeerReviewInvitationsAction]", e);
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Unexpected error creating invitations.",
    };
  }
}

export async function sendPeerReviewInvitationsAction(input: {
  submissionId: string;
  invitationIds: string[];
  subject: string;
  body: string;
  saveAsDefault: boolean;
  journalId: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  if (input.invitationIds.length === 0) {
    return { ok: false as const, error: "Select invitations to send." };
  }

  const { data: rows, error: fetchErr } = await supabase
    .from("reviewer_invitations")
    .select("id, reviewer_email, invite_token, review_duration_days, review_round_id")
    .in("id", input.invitationIds)
    .eq("status", "pending_send");

  if (fetchErr || !rows?.length) {
    return { ok: false as const, error: fetchErr?.message ?? "No pending invitations found." };
  }

  const { data: subRow, error: subErr } = await supabase
    .from("submissions")
    .select("id, title, journals(name)")
    .eq("id", input.submissionId)
    .single();

  if (subErr || !subRow) return { ok: false as const, error: "Submission not found." };

  const j = Array.isArray(subRow.journals) ? subRow.journals[0] : subRow.journals;
  const journalName = (j as { name?: string } | null)?.name ?? "the journal";
  const submissionTitle = subRow.title ?? "Manuscript";
  const origin = siteOrigin();

  if (!isOutboundSmtpConfigured()) {
    return {
      ok: false as const,
      error:
        "Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and MAIL_FROM in .env.local (Gmail needs an App password). For a no-auth dev relay, set SMTP_ALLOW_NO_AUTH=true. See .env.example.",
    };
  }

  type Prepared = {
    id: string;
    to: string;
    subject: string;
    body: string;
  };
  const prepared: Prepared[] = [];

  for (const row of rows) {
    const { data: rr } = await supabase
      .from("review_rounds")
      .select("submission_id")
      .eq("id", row.review_round_id)
      .single();
    if (rr?.submission_id !== input.submissionId) {
      return { ok: false as const, error: "Invitation does not belong to this submission." };
    }

    const link = `${origin}/review/invite/${row.invite_token}`;
    const days = row.review_duration_days ?? 7;
    const applied = applyReviewerInviteTemplate(input.subject, input.body, {
      journalName,
      submissionTitle,
      inviteLink: link,
      reviewDeadlineDays: days,
      reviewerEmail: row.reviewer_email ?? "",
    });
    const to = (row.reviewer_email ?? "").trim();
    if (!to) {
      return { ok: false as const, error: "One invitation has no reviewer email." };
    }
    prepared.push({ id: row.id, to, subject: applied.subject, body: applied.body });
  }

  for (const p of prepared) {
    const sent = await sendOutboundEmail({ to: p.to, subject: p.subject, text: p.body });
    if (!sent.ok) {
      return {
        ok: false as const,
        error: `Could not send to ${p.to}: ${sent.error}`,
      };
    }
    logOutboundEmail("reviewer_invite", p.to, p.subject, p.body);
  }

  for (const p of prepared) {
    const { error: upErr } = await supabase
      .from("reviewer_invitations")
      .update({
        email_subject_snapshot: p.subject,
        email_body_snapshot: p.body,
      })
      .eq("id", p.id);
    if (upErr) {
      return { ok: false as const, error: upErr.message };
    }
  }

  const { error: rpcErr } = await supabase.rpc("mark_peer_invitations_sent_and_progress_submission", {
    p_submission_id: input.submissionId,
    p_invitation_ids: input.invitationIds,
  });
  if (rpcErr) return { ok: false as const, error: rpcErr.message };

  if (input.saveAsDefault) {
    await saveEmailTemplatePresetAction({
      templateKey: "reviewer_invite",
      journalId: input.journalId,
      subject: input.subject,
      body: input.body,
    });
  }

  revalidatePath(`/admin/submissions/${input.submissionId}`);
  revalidatePath(`/editor/submissions/${input.submissionId}`);
  revalidatePath("/reviewer");
  return { ok: true as const };
}

export async function submitPeerReviewReportAction(input: {
  invitationId: string;
  commentsToAuthor: string;
  narrative: string;
  noCompetingInterests: boolean;
  checklist: PeerReviewChecklist;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  if (!input.commentsToAuthor.trim()) {
    return { ok: false as const, error: "Comments to the author(s) are required." };
  }
  if (!input.narrative.trim()) {
    return { ok: false as const, error: "Confidential comments to the editor are required." };
  }

  if (!input.noCompetingInterests) {
    return { ok: false as const, error: "You must confirm no competing interests to submit." };
  }

  const { data: existing } = await supabase
    .from("peer_review_reports")
    .select("id")
    .eq("reviewer_invitation_id", input.invitationId)
    .maybeSingle();
  if (existing) return { ok: false as const, error: "A report was already submitted for this invitation." };

  const { error: insErr } = await supabase.from("peer_review_reports").insert({
    reviewer_invitation_id: input.invitationId,
    comments_to_author: input.commentsToAuthor.trim(),
    narrative: input.narrative.trim(),
    no_competing_interests_confirmed: true,
    checklist: input.checklist as unknown as Record<string, unknown>,
  });
  if (insErr) return { ok: false as const, error: insErr.message };

  const { error: doneErr } = await supabase.rpc("complete_reviewer_invitation", {
    p_invitation_id: input.invitationId,
  });
  if (doneErr) return { ok: false as const, error: doneErr.message };

  revalidatePath("/reviewer");
  revalidatePath(`/reviewer/reviews/${input.invitationId}`);
  return { ok: true as const };
}

/** Time-limited download link for manuscript files (RLS must allow reviewer on storage). */
export async function createReviewerSubmissionFileSignedUrlAction(input: {
  submissionId: string;
  storagePath: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const normalized = input.storagePath.replace(/^\/+/, "");
  const prefix = `submissions/${input.submissionId}/`;
  if (!normalized.startsWith(prefix)) {
    return { ok: false as const, error: "Invalid file path for this submission." };
  }

  const { data, error } = await supabase.storage.from("data").createSignedUrl(normalized, 120);
  if (error || !data?.signedUrl) {
    return { ok: false as const, error: error?.message ?? "Could not create download link." };
  }
  return { ok: true as const, url: data.signedUrl };
}

async function buildStaffReviewerFeedbackBlock(
  supabase: SupabaseClient,
  submissionId: string,
): Promise<string> {
  const { data: roundRow } = await supabase
    .from("review_rounds")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("round_number", 1)
    .maybeSingle();
  if (!roundRow?.id) return "";

  const { data: invs } = await supabase
    .from("reviewer_invitations")
    .select("id, reviewer_number, reviewer_email")
    .eq("review_round_id", roundRow.id);
  const invIds = (invs ?? []).map((i) => i.id as string);
  if (!invIds.length) return "";

  const { data: reps } = await supabase
    .from("peer_review_reports")
    .select("reviewer_invitation_id, comments_to_author")
    .in("reviewer_invitation_id", invIds);
  const numByInv = new Map((invs ?? []).map((i) => [i.id as string, i.reviewer_number as number | null]));
  const lines = (reps ?? [])
    .map((r) => {
      const n = numByInv.get(r.reviewer_invitation_id as string);
      const c = String(r.comments_to_author ?? "").trim();
      if (!c) return null;
      return `Reviewer ${n ?? "?"}:\n${c}`;
    })
    .filter((x): x is string => x != null);
  return lines.join("\n\n---\n\n");
}

export async function sendAuthorDecisionEmailAction(input: {
  submissionId: string;
  subject: string;
  body: string;
  decisionSummary: string;
  saveAsDefault: boolean;
  journalId: string | null;
  decisionKind: AuthorDecisionMailKind;
  includeReviewerFeedback: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: sub, error: sErr } = await supabase
    .from("submissions")
    .select("id, title, owner_user_id, journal_id, journals(name)")
    .eq("id", input.submissionId)
    .single();

  if (sErr || !sub) return { ok: false as const, error: "Submission not found." };

  const { data: contactJson, error: cErr } = await supabase.rpc("get_submission_author_contact", {
    p_submission_id: input.submissionId,
  });

  let authorEmail: string | null = null;
  if (!cErr && contactJson && typeof contactJson === "object" && "email" in contactJson) {
    const raw = (contactJson as { email: string | null }).email;
    authorEmail = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }

  const rpcMissing =
    Boolean(cErr) &&
    /schema cache|could not find the function|does not exist|get_submission_author_contact/i.test(
      cErr?.message ?? "",
    );

  if (!authorEmail && sub.owner_user_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("email, alternate_email")
      .eq("user_id", sub.owner_user_id as string)
      .maybeSingle();
    authorEmail = prof?.email?.trim() || prof?.alternate_email?.trim() || null;
  }

  if (!authorEmail) {
    if (rpcMissing) {
      return {
        ok: false as const,
        error:
          "The database is missing the function get_submission_author_contact. Apply the Supabase migration `supabase/migrations/28_get_submission_author_contact_catchup.sql` (paste its SQL into the SQL editor if needed). After applying, wait briefly or use the dashboard control to reload the API schema so the error clears.",
      };
    }
    if (cErr && !rpcMissing) {
      return { ok: false as const, error: cErr.message };
    }
    return { ok: false as const, error: "Author email not found on profile." };
  }

  const j = Array.isArray(sub.journals) ? sub.journals[0] : sub.journals;
  const journalName = (j as { name?: string } | null)?.name ?? "the journal";

  let reviewerFeedback = "";
  if (input.includeReviewerFeedback) {
    reviewerFeedback = await buildStaffReviewerFeedbackBlock(supabase, input.submissionId);
  }

  const applied = applyAuthorDecisionTemplate(input.subject, input.body, {
    journalName,
    submissionTitle: sub.title,
    authorEmail,
    decisionSummary: input.decisionSummary.trim(),
    reviewerFeedback,
  });

  if (!isOutboundSmtpConfigured()) {
    return {
      ok: false as const,
      error:
        "Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and MAIL_FROM in .env.local (Gmail needs an App password). For a no-auth dev relay, set SMTP_ALLOW_NO_AUTH=true.",
    };
  }

  const authorSend = await sendOutboundEmail({
    to: authorEmail,
    subject: applied.subject,
    text: applied.body,
  });
  if (!authorSend.ok) {
    return { ok: false as const, error: authorSend.error };
  }
  logOutboundEmail("author_decision", authorEmail, applied.subject, applied.body);

  if (input.saveAsDefault) {
    await saveEmailTemplatePresetAction({
      templateKey: "author_decision",
      journalId: input.journalId,
      subject: input.subject,
      body: input.body,
    });
  }

  const rpcDecision =
    input.decisionKind === "accept" ? "accept" : input.decisionKind === "revision" ? "revision" : "reject";
  const { error: rpcErr } = await supabase.rpc("apply_editor_author_decision", {
    p_submission_id: input.submissionId,
    p_decision: rpcDecision,
  });
  if (rpcErr) return { ok: false as const, error: rpcErr.message };

  const { error: dErr } = await supabase.from("editor_decisions").insert({
    journal_id: sub.journal_id,
    submission_id: sub.id,
    actor_user_id: user.id,
    decision: `${input.decisionKind}: ${applied.subject.slice(0, 180)}`,
  });
  if (dErr) return { ok: false as const, error: dErr.message };

  if (input.decisionKind === "accept") {
    const ensured = await ensureArticleForSubmissionAction(input.submissionId);
    if (!ensured.ok) {
      console.error("[sendAuthorDecisionEmailAction] ensureArticleForSubmission", ensured.message);
    }
  }

  revalidatePath(`/admin/submissions/${input.submissionId}`);
  revalidatePath(`/editor/submissions/${input.submissionId}`);
  revalidatePath("/author/revision-required");
  revalidatePath(`/author/submissions/${input.submissionId}`);
  revalidatePath("/admin/articles");
  revalidatePath("/editor/articles");
  return { ok: true as const };
}

export async function saveSubmissionAuthorsAction(submissionId: string, authors: any[]) {
  const { createClient } = await import("@/lib/supabase/server");
  const { profileRowToRoles, isPlatformAdminRole } = await import("@/lib/peer-review/workflow-access");
  const { STAFF_ROLES } = await import("@/lib/auth/app-roles");
  const { publicArticlePath } = await import("@/lib/articles/public-article-path");
  const { revalidatePath } = await import("next/cache");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roles")
    .eq("user_id", user.id)
    .maybeSingle();

  const roles = profileRowToRoles(profile);
  const isStaff = STAFF_ROLES.some((r) => roles.includes(r)) || isPlatformAdminRole(roles, profile?.role as string | undefined);
  if (!isStaff) return { ok: false as const, error: "Editor/Admin access required." };

  const { error } = await supabase
    .from("submissions")
    .update({ author_affiliations: authors })
    .eq("id", submissionId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/submissions/${submissionId}`);
  revalidatePath(`/editor/submissions/${submissionId}`);
  revalidatePath(`/author/submissions/${submissionId}`);

  // Revalidate public article page if published
  const { data: article } = await supabase
    .from("articles")
    .select("id, manuscript_reference_code, journal_id")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (article?.id && article.manuscript_reference_code) {
    const code = String(article.manuscript_reference_code).trim();
    if (code && article.journal_id) {
      const { data: j } = await supabase.from("journals").select("slug").eq("id", article.journal_id).maybeSingle();
      if (j?.slug) {
        revalidatePath(publicArticlePath(j.slug, code));
      }
    }
  }

  return { ok: true as const };
}
