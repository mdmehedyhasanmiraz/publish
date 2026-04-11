import { getEffectiveRolesFromProfile, type AppRole } from "@/lib/auth/app-roles";
import { HANDLING_EDITOR_ROLES } from "@/lib/editor-roles";

export function isAdminPortalPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** `/editor` workspace only — not paths like `/editorial`. */
export function isEditorPortalPath(pathname: string): boolean {
  return pathname === "/editor" || pathname.startsWith("/editor/");
}

/** Platform admin workspace: `/admin` */
export function canAccessAdminRoutes(roles: readonly AppRole[]): boolean {
  return roles.includes("admin");
}

/**
 * Editorial workspace: `/editor` — handling-editor roles, plus platform admins who need full access.
 */
export function canAccessEditorRoutes(roles: readonly AppRole[]): boolean {
  if (roles.includes("admin")) return true;
  return HANDLING_EDITOR_ROLES.some((r) => roles.includes(r as AppRole));
}

export function rolesFromProfile(profile: { role?: unknown; roles?: unknown } | null | undefined): AppRole[] {
  return getEffectiveRolesFromProfile(profile);
}
