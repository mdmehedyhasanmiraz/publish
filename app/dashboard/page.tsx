import { getRoleLandingPath } from "@/lib/auth/landing";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Legacy `/dashboard` — redirect to the correct role workspace. */
export default async function DashboardRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_role, role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (profile?.active_role ?? profile?.role) as string | undefined;
  redirect(getRoleLandingPath(role));
}
