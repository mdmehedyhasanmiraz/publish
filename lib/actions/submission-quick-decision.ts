"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mergeWorkspaceRoles } from "@/lib/auth/app-roles";
import { ensureArticleForSubmissionAction } from "@/lib/actions/article";
import { isPlatformAdminRole } from "@/lib/peer-review/workflow-access";

export type QuickDecisionResult =
  | { ok: true; articleId?: string; message?: string }
  | { ok: false; message: string };

/**
 * Accept or reject without sending email. Allowed only for platform admins and the assigned handling editor.
 */
export async function quickAcceptRejectSubmissionAction(input: {
  submissionId: string;
  decision: "accept" | "reject";
}): Promise<QuickDecisionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roles")
    .eq("user_id", user.id)
    .maybeSingle();
  const roles = mergeWorkspaceRoles(profile?.roles, profile?.role);
  const isAdmin = isPlatformAdminRole(roles, profile?.role as string | undefined);

  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("id, journal_id, assigned_editor_user_id, status")
    .eq("id", input.submissionId)
    .single();
  if (subErr || !sub) return { ok: false, message: "Submission not found." };

  const assigned = sub.assigned_editor_user_id as string | null;
  const isAssignedEditor = assigned != null && assigned === user.id;
  if (!isAdmin && !isAssignedEditor) {
    return {
      ok: false,
      message: "Only the assigned handling editor or a platform administrator can accept or reject here.",
    };
  }

  const rpcDecision = input.decision === "accept" ? "accept" : "reject";
  const { error: rpcErr } = await supabase.rpc("apply_editor_author_decision", {
    p_submission_id: input.submissionId,
    p_decision: rpcDecision,
  });
  if (rpcErr) {
    return {
      ok: false,
      message:
        rpcErr.message ||
        "Could not update submission status. It may not allow this transition from its current state.",
    };
  }

  const { error: dErr } = await supabase.from("editor_decisions").insert({
    journal_id: sub.journal_id as string,
    submission_id: input.submissionId,
    actor_user_id: user.id,
    decision: `Quick ${input.decision} (no email)`,
  });
  if (dErr) {
    console.error("[quickAcceptRejectSubmissionAction] editor_decisions", dErr.message);
  }

  let articleId: string | undefined;
  if (input.decision === "accept") {
    const ensured = await ensureArticleForSubmissionAction(input.submissionId);
    if (!ensured.ok) {
      return { ok: false, message: ensured.message ?? "Accepted, but article draft could not be created." };
    }
    articleId = ensured.articleId;
  }

  revalidatePath(`/admin/submissions/${input.submissionId}`);
  revalidatePath(`/editor/submissions/${input.submissionId}`);
  revalidatePath("/admin/articles");
  revalidatePath("/editor/articles");
  revalidatePath("/author/revision-required");

  return {
    ok: true,
    articleId,
    message:
      input.decision === "accept"
        ? articleId
          ? "Manuscript accepted. An article draft is ready under Articles."
          : "Manuscript accepted."
        : "Manuscript rejected.",
  };
}
