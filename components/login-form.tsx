"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRoleLandingPath } from "@/lib/auth/landing";
import {
  getEffectiveRolesFromProfile,
  roleLabel,
  STAFF_LOGIN_ROLE_ORDER,
  STAFF_ROLES,
  type AppRole,
} from "@/lib/auth/app-roles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginMode = "portal" | "staff" | "admin";
type LoginRole = AppRole | "editor" | "production";

function safeInternalNextPath(next: string | undefined | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export function LoginForm({
  mode = "portal",
  nextPath,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { mode?: LoginMode; nextPath?: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginAs, setLoginAs] = useState<LoginRole>(
    mode === "admin" ? "admin" : mode === "staff" ? STAFF_LOGIN_ROLE_ORDER[0] : "author",
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("active_role, role, roles")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!profile) {
        throw new Error("Profile not found. Try again in a moment, or contact support.");
      }

      const effective = getEffectiveRolesFromProfile(profile);

      if (mode === "staff" || mode === "admin") {
        const requiredRole: AppRole = mode === "admin" ? "admin" : "admin"; // or any staff for staff mode
        const hasAccess = mode === "admin" 
          ? effective.includes("admin")
          : STAFF_ROLES.some((r) => effective.includes(r));
        
        if (!hasAccess) {
          throw new Error(
            mode === "admin"
              ? "This account does not have admin access."
              : "This account does not have staff access. Use author/reviewer login, or ask an administrator to assign a staff role.",
          );
        }
      }

      // Resolve the actual role to assign as active_role and redirect
      let resolvedRole: AppRole | null = null;
      let targetRedirectPath = "";

      if (loginAs === "editor") {
        const editorRole = (["editor_in_chief", "managing_editor", "associate_editor"] as const).find(
          (r) => effective.includes(r)
        );
        if (!editorRole) {
          throw new Error(
            "Your account does not include an Editor role. Choose a role you are assigned, or contact an administrator.",
          );
        }
        resolvedRole = editorRole;
        targetRedirectPath = "/admin"; // Redirect to admin panel as requested
      } else if (loginAs === "production") {
        const prodRole = (["production_editor", "copyeditor", "typesetter"] as const).find(
          (r) => effective.includes(r)
        );
        if (!prodRole) {
          throw new Error(
            "Your account does not include a Production role. Choose a role you are assigned, or contact an administrator.",
          );
        }
        resolvedRole = prodRole;
        targetRedirectPath = "/production"; // Redirect to production panel as requested
      } else {
        const appRole = loginAs as AppRole;
        if (!effective.includes(appRole)) {
          throw new Error(
            "Your account does not include the selected role. Choose a role you are assigned, or contact an administrator.",
          );
        }
        resolvedRole = appRole;
        targetRedirectPath = getRoleLandingPath(appRole);
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ active_role: resolvedRole })
        .eq("user_id", data.user.id);

      if (profileErr) throw profileErr;

      const next = safeInternalNextPath(nextPath ?? null);
      router.push(next ?? targetRedirectPath);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {mode === "admin" ? "Admin login" : mode === "staff" ? "Staff login" : "Login"}
          </CardTitle>
          <CardDescription>
            {mode === "admin"
              ? "Administrator login only."
              : mode === "staff"
              ? "Admins, editors, and production staff only."
              : "Enter your email below to login to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="login-as">Login as</Label>
                <select
                  id="login-as"
                  name="login-as"
                  value={loginAs}
                  onChange={(e) => setLoginAs(e.target.value as LoginRole)}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                >
                  {mode === "admin" ? (
                    <option value="admin">Admin</option>
                  ) : mode === "staff" ? (
                    STAFF_LOGIN_ROLE_ORDER.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="author">Author</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="editor">Editor</option>
                      <option value="production">Production</option>
                    </>
                  )}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {mode === "portal" ? (
                <div className="flex flex-col gap-2">
                  <div>
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/sign-up" className="underline underline-offset-4">
                      Sign up
                    </Link>
                  </div>
                  <div>
                    Are you an administrator?{" "}
                    <Link href="/auth/admin" className="underline underline-offset-4 font-semibold text-primary">
                      Admin login
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  Not admin?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    Go back to login
                  </Link>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

