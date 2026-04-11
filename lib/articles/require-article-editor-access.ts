import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeWorkspaceRoles } from "@/lib/auth/app-roles";
import { isPlatformAdminRole } from "@/lib/peer-review/workflow-access";

export type ArticleEditorAccess =
  | { ok: true; userId: string }
  | { ok: false; message: string };

/**
 * Same rules as `requireEditorAccess` in `lib/actions/article.ts`, but uses the caller's Supabase client
 * so Server Components and follow-up queries share one session (avoids RSC vs server-action cookie mismatch).
 */
export async function requireArticleEditorAccess(supabase: SupabaseClient): Promise<ArticleEditorAccess> {
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
  const allowed = roles.some((r) =>
    ["admin", "editor_in_chief", "managing_editor", "associate_editor"].includes(r),
  );
  const isAdmin = isPlatformAdminRole(roles, profile?.role as string | undefined);
  if (!allowed && !isAdmin) return { ok: false, message: "Editor/Admin access required." };

  return { ok: true, userId: user.id };
}
