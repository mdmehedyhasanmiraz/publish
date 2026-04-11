"use server";

import { createClient } from "@/lib/supabase/server";
import { isAppRole, mergeWorkspaceRoles, type AppRole } from "@/lib/auth/app-roles";
import { revalidatePath } from "next/cache";

function asAppRoles(input: unknown): AppRole[] {
  if (!Array.isArray(input)) return [];
  return input.map(String).filter(isAppRole);
}

export async function updateProfileRolesAction(input: {
  userId: string;
  roles: string[];
  activeRole: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role, roles")
    .eq("user_id", user.id)
    .maybeSingle();

  const myRoles = mergeWorkspaceRoles(me?.roles, me?.role);
  if (!myRoles.includes("admin")) {
    return { ok: false as const, message: "Admins only." };
  }

  const requested = asAppRoles(input.roles);
  const merged = mergeWorkspaceRoles(requested, null);

  const desiredActive = input.activeRole && isAppRole(input.activeRole) ? (input.activeRole as AppRole) : null;
  const active_role = desiredActive && merged.includes(desiredActive) ? desiredActive : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      roles: merged,
      role: merged.includes("admin") ? "admin" : "author",
      active_role,
    })
    .eq("user_id", input.userId);

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

