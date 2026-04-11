"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { switchActiveRoleAction } from "@/lib/actions/role";
import { type AppRole } from "@/lib/auth/app-roles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PortalAccountMenu(props: {
  display: string;
  roles: AppRole[];
  activeRole: AppRole | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const currentRole = props.activeRole ?? props.roles[0] ?? "author";
  const currentAuthorReviewer = currentRole === "reviewer" ? "reviewer" : "author";

  return (
    <div className="flex items-center gap-2">
      {error ? <p className="max-w-[240px] truncate text-xs text-red-600">{error}</p> : null}
      <div className="inline-flex h-9 items-center rounded-md border border-input bg-muted/40 p-1">
        {(["author", "reviewer"] as const).map((role) => (
          <button
            key={role}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (currentAuthorReviewer === role) return;
                setError("");
                const res = await switchActiveRoleAction({ role });
                if (!res.ok) {
                  setError(res.message ?? "Failed to switch role.");
                  return;
                }
                router.push(res.redirectTo ?? "/author");
                router.refresh();
              })
            }
            className={`inline-flex h-7 items-center rounded px-3 text-sm transition-colors ${
              currentAuthorReviewer === role
                ? "bg-white font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={`Switch to ${role}`}
          >
            {role === "author" ? "Author" : "Reviewer"}
          </button>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Open account menu" className="h-9 gap-2">
            <Menu className="h-4 w-4" />
            <span>Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="truncate">{props.display}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/author">Author panel</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/reviewer">Reviewer panel</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/auth/login");
              router.refresh();
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

