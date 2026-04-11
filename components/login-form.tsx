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

type LoginMode = "portal" | "staff";

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
  const [loginAs, setLoginAs] = useState<AppRole>(
    mode === "staff" ? STAFF_LOGIN_ROLE_ORDER[0] : "author",
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

      if (mode === "staff") {
        const hasStaffAccess = STAFF_ROLES.some((r) => effective.includes(r));
        if (!hasStaffAccess) {
          throw new Error(
            "This account does not have staff access. Use author/reviewer login, or ask an administrator to assign a staff role.",
          );
        }
      }

      if (!effective.includes(loginAs)) {
        throw new Error(
          "Your account does not include the selected role. Choose a role you are assigned, or contact an administrator.",
        );
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ active_role: loginAs })
        .eq("user_id", data.user.id);

      if (profileErr) throw profileErr;

      const next = safeInternalNextPath(nextPath ?? null);
      router.push(next ?? getRoleLandingPath(loginAs));
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
          <CardTitle className="text-2xl">{mode === "staff" ? "Staff login" : "Login"}</CardTitle>
          <CardDescription>
            {mode === "staff"
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
                  onChange={(e) => setLoginAs(e.target.value as AppRole)}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                >
                  {(mode === "staff" ? STAFF_LOGIN_ROLE_ORDER : (["author", "reviewer"] as const)).map(
                    (r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
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
                <>
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/sign-up" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Not staff?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    Use author/reviewer login
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
