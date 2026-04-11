"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateProfileRolesAction } from "@/lib/actions/admin-users";
import { cn } from "@/lib/utils";
import { isAppRole, mergeWorkspaceRoles, roleLabel, type AppRole } from "@/lib/auth/app-roles";

const staffRoleOptions: AppRole[] = [
  "admin",
  "editor_in_chief",
  "managing_editor",
  "associate_editor",
  "production_editor",
  "copyeditor",
  "typesetter",
];

export type AdminUserProfileRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: AppRole | null;
  roles: AppRole[] | null;
  active_role: AppRole | null;
  updated_at?: string | null;
};

export function AdminUserRoleCard(props: { profile: AdminUserProfileRow; className?: string }) {
  const router = useRouter();
  const mergedRoles = useMemo(
    () => mergeWorkspaceRoles(props.profile.roles ?? [], props.profile.role),
    [props.profile.roles, props.profile.role],
  );

  const [selected, setSelected] = useState<AppRole[]>(mergedRoles);
  const [activeRole, setActiveRole] = useState<AppRole | "">(props.profile.active_role ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const name =
    props.profile.display_name?.trim() ||
    `${props.profile.first_name ?? ""} ${props.profile.last_name ?? ""}`.trim() ||
    props.profile.email ||
    props.profile.user_id;

  const allRolesForDropdown = useMemo(() => mergeWorkspaceRoles(selected, null), [selected]);

  const toggle = (role: AppRole, value: boolean) => {
    setSelected((prev) => {
      const next = new Set<AppRole>(mergeWorkspaceRoles(prev, null));
      if (value) next.add(role);
      else next.delete(role);
      // baseline roles always stay due to mergeWorkspaceRoles, but keep it explicit
      next.add("author");
      next.add("reviewer");
      return Array.from(next);
    });
  };

  return (
    <div className={cn("rounded border bg-white p-4", props.className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{props.profile.email ?? "No email"} · {props.profile.user_id}</p>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          {mergeWorkspaceRoles(selected, null).map((r) => (
            <Badge key={r} variant={r === "admin" ? "destructive" : "secondary"}>
              {roleLabel(r)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold text-muted-foreground">Staff roles</p>
          <div className="mt-3 grid gap-2">
            {staffRoleOptions.map((r) => {
              const checked = mergeWorkspaceRoles(selected, null).includes(r);
              return (
                <div key={r} className="flex items-center gap-2">
                  <Checkbox
                    id={`${props.profile.user_id}-${r}`}
                    checked={checked}
                    onCheckedChange={(v) => toggle(r, v === true)}
                    disabled={pending}
                  />
                  <Label htmlFor={`${props.profile.user_id}-${r}`} className="cursor-pointer text-sm">
                    {roleLabel(r)}
                  </Label>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Author + Reviewer are always available for every account.
          </p>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold text-muted-foreground">Active role</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sets the default workspace after sign-in and role switching.
          </p>
          <div className="mt-3 grid gap-2">
            <Label htmlFor={`${props.profile.user_id}-active`} className="text-sm">
              Active role
            </Label>
            <select
              id={`${props.profile.user_id}-active`}
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as AppRole)}
              disabled={pending}
            >
              <option value="">(none)</option>
              {allRolesForDropdown.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setMessage(null);
                  const rolesToSave = mergeWorkspaceRoles(selected, null);
                  const res = await updateProfileRolesAction({
                    userId: props.profile.user_id,
                    roles: rolesToSave,
                    activeRole: activeRole || null,
                  });
                  setMessage(res.ok ? "Saved." : res.message ?? "Failed.");
                  if (res.ok) router.refresh();
                })
              }
            >
              {pending ? "Saving…" : "Save"}
            </Button>
            {message && (
              <p className={`text-sm ${message === "Saved." ? "text-green-600" : "text-red-600"}`}>{message}</p>
            )}
          </div>
        </div>
      </div>

      {!mergeWorkspaceRoles(selected, null).every(isAppRole) ? (
        <p className="mt-3 text-xs text-red-600">Invalid role detected.</p>
      ) : null}
    </div>
  );
}

