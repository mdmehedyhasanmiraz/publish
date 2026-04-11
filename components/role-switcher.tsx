"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { switchActiveRoleAction } from "@/lib/actions/role";
import { roleLabel, type AppRole } from "@/lib/auth/app-roles";
import { useRouter } from "next/navigation";

export function RoleSwitcher(props: { roles: AppRole[]; activeRole: AppRole | null }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<AppRole | "">(props.activeRole ?? props.roles[0] ?? "");
  const [message, setMessage] = useState<string>("");
  const [pending, startTransition] = useTransition();

  if (!props.roles.length) {
    return <p className="text-sm text-muted-foreground">No roles are assigned to your account yet.</p>;
  }

  return (
    <div className="rounded border bg-white p-4">
      <h2 className="text-sm font-semibold">Current Role</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Switch your active role any time. Your workspace home updates immediately.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          className="h-10 min-w-[240px] rounded-md border border-input bg-white px-3 text-sm"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as AppRole)}
          disabled={pending}
        >
          {props.roles.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
        <Button
          disabled={!selectedRole || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await switchActiveRoleAction({ role: selectedRole });
              if (!res.ok) {
                setMessage(res.message ?? "Failed to switch role.");
                return;
              }
              router.push(res.redirectTo ?? "/author");
              router.refresh();
            })
          }
        >
          {pending ? "Switching..." : "Switch role"}
        </Button>
      </div>
      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}

