export const NISO_CREDIT_ROLES = [
  "Conceptualization",
  "Data curation",
  "Formal analysis",
  "Funding acquisition",
  "Investigation",
  "Methodology",
  "Project administration",
  "Resources",
  "Software",
  "Supervision",
  "Validation",
  "Visualization",
  "Writing - original draft",
  "Writing - review & editing",
] as const;

export type CreditRole = (typeof NISO_CREDIT_ROLES)[number];

export function normalizeCreditRole(role: string): string {
  return String(role ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function creditTermIdentifier(role: string): string {
  const slug = normalizeCreditRole(role)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://credit.niso.org/contributor-roles/${slug}/`;
}

