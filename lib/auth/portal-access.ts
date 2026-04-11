import { getEffectiveRolesFromProfile, type AppRole } from "@/lib/auth/app-roles";
import { HANDLING_EDITOR_ROLES } from "@/lib/editor-roles";

export function isAdminPortalPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** `/editor` workspace only — not paths like `/editorial`. */
export function isEditorPortalPath(pathname: string): boolean {
  return pathname === "/editor" || pathname.startsWith("/editor/");
}

/**
 * Authenticated workspaces under `(portal)` — require login in `proxy.ts` session refresh.
 * Public marketing, journals, and `/review/invite/*` must NOT match here.
 */
export function isPortalProtectedPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/editor" ||
    pathname.startsWith("/editor/") ||
    pathname === "/author" ||
    pathname.startsWith("/author/") ||
    pathname === "/reviewer" ||
    pathname.startsWith("/reviewer/") ||
    pathname === "/production" ||
    pathname.startsWith("/production/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  );
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
