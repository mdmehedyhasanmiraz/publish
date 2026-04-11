import type { AppRole } from "@/lib/auth/app-roles";

/** Default when signed in but no role resolved. */
export const DEFAULT_PORTAL_PATH = "/author";

export function getRoleLandingPath(role?: string | null) {
  switch (role as AppRole | string | null | undefined) {
    case "admin":
      return "/admin";
    case "author":
      return "/author";
    case "reviewer":
      return "/reviewer";
    case "editor_in_chief":
    case "managing_editor":
    case "associate_editor":
      return "/editor";
    case "production_editor":
    case "copyeditor":
    case "typesetter":
      return "/production";
    default:
      return DEFAULT_PORTAL_PATH;
  }
}
