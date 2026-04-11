export const APP_ROLES = [
  "admin",
  "author",
  "reviewer",
  "editor_in_chief",
  "managing_editor",
  "associate_editor",
  "production_editor",
  "copyeditor",
  "typesetter",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Every signed-in user can open Author and Reviewer workspaces and switch between them. */
export const BASELINE_WORKSPACE_ROLES: readonly AppRole[] = ["author", "reviewer"];

/** Editorial and platform staff roles (not author/reviewer workspaces). */
export const STAFF_ROLES: readonly AppRole[] = [
  "admin",
  "editor_in_chief",
  "managing_editor",
  "associate_editor",
  "production_editor",
  "copyeditor",
  "typesetter",
] as const;

/** Staff login UI: admin last so the default selection is not privileged. */
export const STAFF_LOGIN_ROLE_ORDER: readonly AppRole[] = [
  "editor_in_chief",
  "managing_editor",
  "associate_editor",
  "production_editor",
  "copyeditor",
  "typesetter",
  "admin",
] as const;

/** Roles granted in DB (`profiles.roles` + legacy `profiles.role`). Used for auth checks — not for merging new privileges. */
export function getEffectiveRolesFromProfile(
  profile: { roles?: unknown; role?: unknown } | null | undefined,
): AppRole[] {
  const fromArray = ((profile?.roles ?? []) as string[]).filter(isAppRole);
  const legacy =
    profile?.role != null && isAppRole(String(profile.role)) ? ([profile.role] as AppRole[]) : [];
  return Array.from(new Set<AppRole>([...fromArray, ...legacy]));
}

export function mergeWorkspaceRoles(rolesArray: unknown, legacyRole: unknown): AppRole[] {
  const fromArray = ((rolesArray ?? []) as string[]).filter(isAppRole);
  const legacy = isAppRole(String(legacyRole)) ? ([legacyRole] as AppRole[]) : [];
  return Array.from(new Set<AppRole>([...BASELINE_WORKSPACE_ROLES, ...fromArray, ...legacy]));
}

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function roleLabel(role: AppRole) {
  switch (role) {
    case "editor_in_chief":
      return "Editor in Chief";
    case "managing_editor":
      return "Managing Editor";
    case "associate_editor":
      return "Associate Editor";
    case "production_editor":
      return "Production Editor";
    case "copyeditor":
      return "Copyeditor";
    case "typesetter":
      return "Typesetter";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

