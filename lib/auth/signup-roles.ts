/** Roles new users may self-select at registration (not staff roles). */
export const REGISTRATION_ROLES = ["author", "reviewer"] as const;
export type RegistrationRole = (typeof REGISTRATION_ROLES)[number];

export function isRegistrationRole(value: string): value is RegistrationRole {
  return (REGISTRATION_ROLES as readonly string[]).includes(value);
}
