"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveRolesFromProfile, isAppRole } from "@/lib/auth/app-roles";
import { getRoleLandingPath } from "@/lib/auth/landing";
import { revalidatePath } from "next/cache";

export async function switchActiveRoleAction(input: { role: string }) {
  if (!isAppRole(input.role)) {
    return { ok: false, message: "Invalid role." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles, role")
    .eq("user_id", user.id)
    .maybeSingle();

  const effective = getEffectiveRolesFromProfile(profile);
  if (!effective.includes(input.role)) {
    return { ok: false, message: "You do not have this role." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_role: input.role })
    .eq("user_id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: getRoleLandingPath(input.role) };
}

