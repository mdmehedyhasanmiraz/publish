import {
  STAFF_ROLES,
  type AppRole,
} from "@/lib/auth/app-roles";
import { createClient } from "@/lib/supabase/server";
import type { EditorCandidateRow, InvitationRow } from "@/components/submission-workflow-client";
import { profileRowToHandlingEditorCandidate } from "@/lib/editor-roles";
import {
  canAssignHandlingEditor,
  canManagePeerReviewForSubmission,
  isPlatformAdminRole,
  profileRowToRoles,
} from "@/lib/peer-review/workflow-access";
import { notFound, redirect } from "next/navigation";

function isEditorialStaff(roles: AppRole[]) {
  return STAFF_ROLES.some((r) => roles.includes(r));
}

export async function loadSubmissionWorkflowPage(submissionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roles")
    .eq("user_id", user.id)
    .maybeSingle();

  const roles = profileRowToRoles(profile);
  if (!isEditorialStaff(roles) && !isPlatformAdminRole(roles, profile?.role as string | undefined)) {
    notFound();
  }

  const { data: submission, error } = await supabase
    .from("submissions")
    .select("id, title, status, journal_id, assigned_editor_user_id, author_affiliations, journals(name)")
    .eq("id", submissionId)
    .maybeSingle();

  if (error || !submission) notFound();

  const canAssignEditor = canAssignHandlingEditor(roles, profile?.role as string | undefined);
  const canManagePeerReview = canManagePeerReviewForSubmission(
    user.id,
    roles,
    profile?.role as string | undefined,
    submission.assigned_editor_user_id,
  );
  const canQuickDecision =
    isPlatformAdminRole(roles, profile?.role as string | undefined) ||
    (submission.assigned_editor_user_id != null && submission.assigned_editor_user_id === user.id);

  const { data: linkedArticle } = await supabase
    .from("articles")
    .select("id")
    .eq("submission_id", submissionId)
    .maybeSingle();
  const linkedArticleId = (linkedArticle?.id as string | undefined) ?? null;

  let editorCandidates: EditorCandidateRow[] = [];
  if (canAssignEditor) {
    const { data: cand, error: candErr } = await supabase.rpc("list_handling_editor_candidates");
    if (candErr) {
      console.error("[list_handling_editor_candidates]", candErr.message);
    }
    editorCandidates = (cand ?? []).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        user_id: String(r.user_id),
        email: String(r.email ?? ""),
        display_name: String(r.display_name ?? ""),
        primary_editor_role: String(r.primary_editor_role ?? "associate_editor"),
      };
    });

    if (editorCandidates.length === 0) {
      const { data: rows, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, roles, role, active_role")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .limit(400);

      if (profErr) {
        console.error("[handling_editor fallback profiles]", profErr.message);
      } else {
        editorCandidates = (rows ?? [])
          .map((row) => profileRowToHandlingEditorCandidate(row))
          .filter((x): x is NonNullable<typeof x> => x != null);
      }
    }
  }

  const assignedEditorLabel =
    submission.assigned_editor_user_id == null
      ? null
      : editorCandidates.find((c) => c.user_id === submission.assigned_editor_user_id)?.display_name ??
        `User ${submission.assigned_editor_user_id.slice(0, 8)}…`;

  const { data: round } = await supabase
    .from("review_rounds")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("round_number", 1)
    .maybeSingle();

  let invitations: InvitationRow[] = [];
  let peerReviewReports: {
    reviewerNumber: number | null;
    reviewerEmail: string | null;
    commentsToAuthor: string;
    narrative: string;
  }[] = [];

  if (round?.id) {
    const { data: invs } = await supabase
      .from("reviewer_invitations")
      .select("id, reviewer_email, status, reviewer_number, deadline_at, sent_at")
      .eq("review_round_id", round.id)
      .order("id", { ascending: true });
    invitations = (invs ?? []) as InvitationRow[];

    const invIds = (invs ?? []).map((i) => i.id as string);
    if (invIds.length) {
      const { data: invFull } = await supabase
        .from("reviewer_invitations")
        .select("id, reviewer_number, reviewer_email")
        .in("id", invIds);
      const { data: reps } = await supabase
        .from("peer_review_reports")
        .select("reviewer_invitation_id, comments_to_author, narrative")
        .in("reviewer_invitation_id", invIds);
      const invMap = new Map((invFull ?? []).map((r) => [r.id as string, r]));
      peerReviewReports = (reps ?? []).map((r) => {
        const inv = invMap.get(r.reviewer_invitation_id as string);
        return {
          reviewerNumber: (inv?.reviewer_number as number | null) ?? null,
          reviewerEmail: (inv?.reviewer_email as string | null) ?? null,
          commentsToAuthor: String(r.comments_to_author ?? ""),
          narrative: String(r.narrative ?? ""),
        };
      });
    }
  }

  return {
    submissionId,
    canAssignEditor,
    canManagePeerReview,
    canQuickDecision,
    linkedArticleId,
    submission,
    editorCandidates,
    assignedEditorLabel,
    invitations,
    peerReviewReports,
  };
}
