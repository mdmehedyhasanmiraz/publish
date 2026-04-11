import { mergeWorkspaceRoles, type AppRole } from "@/lib/auth/app-roles";

/** Roles eligible as handling editor (must match DB RPC filter). */
export const HANDLING_EDITOR_ROLES = [
  "editor_in_chief",
  "managing_editor",
  "associate_editor",
  "production_editor",
] as const satisfies readonly AppRole[];

export type HandlingEditorRole = (typeof HANDLING_EDITOR_ROLES)[number];

export function isHandlingEditorRole(value: string): value is HandlingEditorRole {
  return (HANDLING_EDITOR_ROLES as readonly string[]).includes(value);
}

export function handlingEditorRoleLabel(role: string): string {
  switch (role) {
    case "editor_in_chief":
      return "Editor in Chief";
    case "managing_editor":
      return "Managing Editor";
    case "associate_editor":
      return "Associate Editor";
    case "production_editor":
      return "Production Editor";
    default:
      return role.replace(/_/g, " ");
  }
}

/** Distinct badge colors per role (Tailwind). */
export function pickPrimaryHandlingEditorRole(roles: readonly AppRole[]): HandlingEditorRole | null {
  for (const r of HANDLING_EDITOR_ROLES) {
    if (roles.includes(r)) return r;
  }
  return null;
}

export type HandlingEditorProfileRow = {
  user_id: string;
  email: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  roles?: unknown;
  role?: unknown;
  active_role?: unknown;
};

/** Build picker row from a profiles row (fallback when RPC returns empty). */
export function profileRowToHandlingEditorCandidate(
  row: HandlingEditorProfileRow,
): {
  user_id: string;
  email: string;
  display_name: string;
  primary_editor_role: string;
} | null {
  const merged = mergeWorkspaceRoles(row.roles ?? [], row.role);
  const active = row.active_role != null ? String(row.active_role) : "";
  const withActive =
    active && (HANDLING_EDITOR_ROLES as readonly string[]).includes(active) && !merged.includes(active as AppRole)
      ? [...merged, active as AppRole]
      : merged;

  const primary = pickPrimaryHandlingEditorRole(withActive);
  if (!primary) return null;

  const firstLast = [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ").trim();
  const displayName = firstLast || row.email?.trim() || row.user_id;

  return {
    user_id: row.user_id,
    email: row.email?.trim() ?? "",
    display_name: displayName,
    primary_editor_role: primary,
  };
}

export function handlingEditorRoleBadgeClass(role: string): string {
  switch (role) {
    case "editor_in_chief":
      return "border-transparent bg-violet-600 text-white shadow hover:bg-violet-600/90";
    case "managing_editor":
      return "border-transparent bg-sky-600 text-white shadow hover:bg-sky-600/90";
    case "associate_editor":
      return "border-transparent bg-emerald-600 text-white shadow hover:bg-emerald-600/90";
    case "production_editor":
      return "border-transparent bg-amber-600 text-white shadow hover:bg-amber-600/90";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
}
