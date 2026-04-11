import type { SupabaseClient } from "@supabase/supabase-js";
import type { WizardAuthorRow } from "@/lib/submissions/wizard-author-types";

export type SaveWizardStep3Result = { ok: true; message?: string } | { ok: false; message: string };

export async function saveWizardStep3Authors(
  supabase: SupabaseClient,
  userId: string,
  submissionId: string,
  authors: WizardAuthorRow[],
): Promise<SaveWizardStep3Result> {
  for (const author of authors) {
    if (!author.first_name?.trim() || !author.last_name?.trim() || !author.email?.trim()) {
      return { ok: false, message: "Each author must include first name, last name and email." };
    }
  }

  const { data: current } = await supabase
    .from("submissions")
    .select("id, owner_user_id")
    .eq("id", submissionId)
    .single();
  if (!current || current.owner_user_id !== userId) return { ok: false, message: "Not allowed." };

  const { error } = await supabase.from("submissions").update({ author_affiliations: authors }).eq("id", submissionId);
  if (error) return { ok: false, message: error.message };

  const inviteRows = authors
    .map((a) => ({ email: a.email.trim().toLowerCase(), full_name: `${a.first_name} ${a.last_name}`.trim() }))
    .filter((a) => a.email);
  if (inviteRows.length) {
    const emails = inviteRows.map((a) => a.email);
    const { data: profiles } = await supabase.from("profiles").select("user_id, email").in("email", emails);
    const profileMap = new Map<string, string>(
      (profiles ?? []).map((p) => [String(p.email).toLowerCase(), p.user_id as string]),
    );

    await supabase.from("submission_author_invites").delete().eq("submission_id", submissionId);
    await supabase.from("submission_author_invites").insert(
      inviteRows.map((row) => ({
        submission_id: submissionId,
        email: row.email,
        full_name: row.full_name || null,
        linked_user_id: profileMap.get(row.email) ?? null,
        status: profileMap.has(row.email) ? "linked" : "pending_signup",
      })),
    );
  }

  return { ok: true, message: "Author affiliations saved." };
}
