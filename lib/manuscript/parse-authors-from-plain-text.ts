function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
}

function cleanAuthorToken(token: string): string {
  return token
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+/g, " ")
    .replace(/[†‡*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitDisplayName(displayName: string): { first_name: string; last_name: string } {
  const parts = displayName.split(" ").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return { first_name: displayName.trim(), last_name: "" };
  }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

export type ParsedAuthorName = {
  display_name: string;
  first_name: string;
  last_name: string;
};

/**
 * Heuristic: detect likely author-name line(s) between title and abstract.
 * Works best for comma-separated author lists in manuscript headers.
 */
export function parseAuthorNamesFromPlainText(text: string): ParsedAuthorName[] {
  const raw = normalizeWhitespace(text);
  if (!raw) return [];

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const abstractIdx = lines.findIndex((l) => /^abstract\b/i.test(l));
  const searchLines = abstractIdx > 0 ? lines.slice(1, abstractIdx) : lines.slice(1, 12);

  const badLine = /(correspond|affiliat|department|university|college|hospital|email|keywords?)/i;
  const candidate = searchLines.find((line) => line.includes(",") && !badLine.test(line) && line.length < 1500) ?? "";
  if (!candidate) return [];

  const tokens = candidate
    .split(",")
    .map((t) => cleanAuthorToken(t))
    .filter(Boolean);

  const authors: ParsedAuthorName[] = [];
  for (const token of tokens) {
    if (token.length < 2) continue;
    if (/^(and|with)$/i.test(token)) continue;
    const { first_name, last_name } = splitDisplayName(token);
    if (!first_name && !last_name) continue;
    authors.push({
      display_name: token,
      first_name,
      last_name,
    });
  }

  // Basic sanity: single token line is often not an author list.
  return authors.length >= 2 ? authors : [];
}

