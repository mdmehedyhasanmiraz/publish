"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminUserRoleCard, type AdminUserProfileRow } from "@/components/admin-user-role-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isAppRole, mergeWorkspaceRoles, roleLabel } from "@/lib/auth/app-roles";

function displayName(p: AdminUserProfileRow) {
  return (
    p.display_name?.trim() ||
    `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
    p.email ||
    p.user_id
  );
}

function formatUpdatedAt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type Props = {
  profiles: AdminUserProfileRow[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export function AdminUsersTable(props: Props) {
  const { profiles, page, pageSize, totalCount } = props;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUserProfileRow | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const selectedTitle = useMemo(() => (selected ? displayName(selected) : ""), [selected]);

  return (
    <div className="mt-5 space-y-4">
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Roles</th>
              <th className="hidden px-4 py-3 sm:table-cell">Active role</th>
              <th className="hidden px-4 py-3 md:table-cell">Updated</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No profiles found.
                </td>
              </tr>
            ) : (
              profiles.map((p) => {
                const merged = mergeWorkspaceRoles(p.roles ?? [], p.role);
                const preview = merged.slice(0, 4);
                const rest = merged.length - preview.length;
                return (
                  <tr
                    key={p.user_id}
                    tabIndex={0}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => {
                      setSelected(p);
                      setOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(p);
                        setOpen(true);
                      }
                    }}
                  >
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium">{displayName(p)}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {preview.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "destructive" : "secondary"} className="text-xs">
                            {roleLabel(r)}
                          </Badge>
                        ))}
                        {rest > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            +{rest}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {p.active_role && isAppRole(p.active_role) ? (
                        <span className="text-muted-foreground">{roleLabel(p.active_role)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground md:table-cell">
                      {formatUpdatedAt(p.updated_at ?? null)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0 ? "No users" : `Showing ${from}–${to} of ${totalCount}`}
        </p>
        <div className="flex items-center gap-2">
          {page <= 1 ? (
            <Button variant="outline" size="sm" disabled type="button">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/users?page=${page - 1}`}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Link>
            </Button>
          )}
          <span className="text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page >= totalPages ? (
            <Button variant="outline" size="sm" disabled type="button">
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/users?page=${page + 1}`}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTitle || "User"}</DialogTitle>
            <DialogDescription>
              {selected?.email ?? "No email"} · {selected?.user_id}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <AdminUserRoleCard key={selected.user_id} profile={selected} className="mt-2 border-0 bg-muted/30 p-4 shadow-none" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
