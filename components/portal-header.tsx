import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, mergeWorkspaceRoles, type AppRole } from "@/lib/auth/app-roles";
import { PortalAccountMenu } from "@/components/portal-account-menu";
import { Button } from "@/components/ui/button";

export async function PortalHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="inline-flex items-center">
            <Image src="/logos/logo-sciencelet.svg" alt="Sciencelet" width={108} height={24} className="h-6 w-auto" style={{ height: "auto" }} priority suppressHydrationWarning />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name, email, roles, role, active_role")
    .eq("user_id", user.id)
    .maybeSingle();

  const roles = mergeWorkspaceRoles(profile?.roles, profile?.role);
  const activeRole = isAppRole(String(profile?.active_role ?? "")) ? (profile?.active_role as AppRole) : roles[0] ?? null;

  const display =
    profile?.display_name?.trim() ||
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    profile?.email ||
    user.email ||
    "Account";

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="inline-flex items-center">
            <Image src="/logos/logo-sciencelet.svg" alt="Sciencelet" width={108} height={24} className="h-6 w-auto" style={{ height: "auto" }} priority suppressHydrationWarning />
          </Link>
        </div>
        <PortalAccountMenu display={display} roles={roles} activeRole={activeRole} />
      </div>
    </header>
  );
}
