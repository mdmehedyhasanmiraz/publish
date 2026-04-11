import { getEffectiveRolesFromProfile, type AppRole } from "@/lib/auth/app-roles";

export function profileRowToRoles(profile: {
  roles?: unknown;
  role?: unknown;
} | null): AppRole[] {
  return getEffectiveRolesFromProfile(profile);
}

export function isPlatformAdminRole(roles: AppRole[], legacyRole: string | null | undefined) {
  return legacyRole === "admin" || roles.includes("admin");
}

export function canAssignHandlingEditor(roles: AppRole[], legacyRole: string | null | undefined) {
  return (
    isPlatformAdminRole(roles, legacyRole) ||
    roles.includes("editor_in_chief") ||
    roles.includes("managing_editor")
  );
}

export function canManagePeerReviewForSubmission(
  userId: string,
  roles: AppRole[],
  legacyRole: string | null | undefined,
  assignedEditorUserId: string | null,
) {
  if (isPlatformAdminRole(roles, legacyRole)) return true;
  return assignedEditorUserId != null && assignedEditorUserId === userId;
}
