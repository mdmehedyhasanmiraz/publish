import type { PublicArticleAuthorRow } from "@/lib/articles/public-article-authors";

export type CitationAuthor = { family: string; given: string };

export type CitationWork = {
  title: string;
  journal: string;
  year: string;
  doi: string | null;
  doiUrl: string | null;
  url: string;
  authors: CitationAuthor[];
};

export const CITATION_STYLE_IDS = [
  "apa",
  "mla",
  "chicago",
  "harvard",
  "vancouver",
  "ieee",
  "bibtex",
] as const;

export type CitationStyleId = (typeof CITATION_STYLE_IDS)[number];

export const CITATION_STYLE_LABELS: Record<CitationStyleId, string> = {
  apa: "APA (7th)",
  mla: "MLA (9th)",
  chicago: "Chicago (author–date)",
  harvard: "Harvard",
  vancouver: "Vancouver",
  ieee: "IEEE",
  bibtex: "BibTeX",
};

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join("");
}

export function authorsToCitationAuthors(rows: PublicArticleAuthorRow[]): CitationAuthor[] {
  return rows.map((author) => {
    const fam = String(author.last_name ?? "").trim();
    const first = String(author.first_name ?? "").trim();
    const mid = String(author.middle_name ?? "").trim();
    if (fam || first || mid) {
      const givenParts = [first, mid].filter(Boolean);
      const given = givenParts.map((p) => initialsFrom(p)).join(" ").trim();
      return { family: fam || "Author", given };
    }
    const display = [author.salutation, author.first_name, author.middle_name, author.last_name, author.suffix]
      .filter((x) => x && String(x).trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!display) return { family: "Author", given: "" };
    const parts = display.split(/\s+/);
    if (parts.length === 1) return { family: parts[0], given: "" };
    return { family: parts[parts.length - 1], given: initialsFrom(parts.slice(0, -1).join(" ")) };
  });
}

function escapeBibtex(s: string): string {
  return s.replace(/([%$#&_{}])/g, "\\$1");
}

function bibtexKey(work: CitationWork): string {
  const a0 = work.authors[0]?.family.replace(/\W+/g, "") || "Author";
  const short = work.title.replace(/\W+/g, "").slice(0, 12);
  return `${a0}${work.year}${short}`.toLowerCase() || "article";
}

/** Minimal RTF with one Times paragraph; escapes braces and backslashes. */
export function plainToRtf(plain: string): string {
  const escaped = plain
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\r\n|\n|\r/g, "\\par\n");
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\f0\\fs24 ${escaped}}`;
}

function formatAuthorsApa(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "";
  const fmt = (a: CitationAuthor) => (a.given.trim() ? `${a.family}, ${a.given}`.trim() : a.family);
  if (authors.length === 1) return fmt(authors[0]);
  if (authors.length === 2) return `${fmt(authors[0])}, & ${fmt(authors[1])}`;
  return `${authors
    .slice(0, -1)
    .map((a) => fmt(a))
    .join(", ")}, & ${fmt(authors[authors.length - 1])}`;
}

function formatAuthorsIeee(authors: CitationAuthor[]): string {
  if (authors.length === 0) return "Author";
  const one = (a: CitationAuthor) => {
    const gi = a.given.replace(/\.\s*/g, "").trim();
    if (!gi) return a.family;
    const parts = gi.split(/\s+/).filter(Boolean);
    const initials = parts.map((p) => (p.length === 1 ? `${p.toUpperCase()}.` : `${p.charAt(0).toUpperCase()}.`)).join(" ");
    return `${initials} ${a.family}`.trim();
  };
  if (authors.length === 1) return one(authors[0]);
  if (authors.length === 2) return `${one(authors[0])} and ${one(authors[1])}`;
  return `${authors
    .slice(0, -1)
    .map((a) => one(a))
    .join(", ")}, and ${one(authors[authors.length - 1])}`;
}

export function formatCitationApa(work: CitationWork): string {
  const auth = formatAuthorsApa(work.authors);
  const doiPart = work.doiUrl ? ` ${work.doiUrl}` : work.doi ? ` https://doi.org/${work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}` : ` ${work.url}`;
  const head = auth ? `${auth} (${work.year}). ` : `(${work.year}). `;
  return `${head}${work.title}. *${work.journal}*.${doiPart}`.replace(/\*\*/g, "*");
}

export function formatCitationMla(work: CitationWork): string {
  const names = work.authors.map((a) => `${a.family}${a.given ? `, ${a.given.replace(/\./g, "")}` : ""}`).join(", ");
  const base = `${names || "Author"}. "${work.title}." *${work.journal}*, ${work.year}`;
  if (work.doi) return `${base}, doi:${work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}.`;
  return `${base}, ${work.url}.`;
}

export function formatCitationChicago(work: CitationWork): string {
  const auth = formatAuthorsApa(work.authors).replace(/ & /g, " and ");
  const doiPart = work.doi ? `https://doi.org/${work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}` : work.url;
  return `${auth} ${work.year}. "${work.title}." *${work.journal}*. ${doiPart}.`;
}

export function formatCitationHarvard(work: CitationWork): string {
  const auth = work.authors.map((a) => `${a.family}, ${a.given.charAt(0)}.`).join(", ");
  const doiPart = work.doiUrl ?? (work.doi ? `https://doi.org/${work.doi}` : work.url);
  return `${auth || "Author"} (${work.year}) '${work.title}', *${work.journal}*. Available at: ${doiPart}`;
}

export function formatCitationVancouver(work: CitationWork): string {
  const names = work.authors.map((a) => `${a.family} ${a.given.replace(/\./g, "")}`.trim()).join(", ");
  const doiPart = work.doi ? ` doi:${work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}` : "";
  return `${names || "Author"}. ${work.title}. ${work.journal}. ${work.year}.${doiPart}`;
}

export function formatCitationIeee(work: CitationWork): string {
  const auth = formatAuthorsIeee(work.authors);
  const doiPart = work.doi ? ` doi: ${work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}` : "";
  return `${auth}, "${work.title}," *${work.journal}*, ${work.year}.${doiPart}`;
}

export function formatCitationBibtex(work: CitationWork): string {
  const key = bibtexKey(work);
  const authorField = work.authors.map((a) => `${a.family}, ${a.given}`.trim()).join(" and ");
  const lines = [
    `@article{${key},`,
    `  title = {${escapeBibtex(work.title)}},`,
    `  author = {${escapeBibtex(authorField || "Author")}},`,
    `  journal = {${escapeBibtex(work.journal)}},`,
    `  year = {${work.year}},`,
    `  url = {${escapeBibtex(work.url)}},`,
  ];
  if (work.doi) {
    const d = work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    lines.push(`  doi = {${escapeBibtex(d)}},`);
  }
  lines.push("}");
  return lines.join("\n");
}

/** RIS format (Zotero, Mendeley, EndNote, etc.). */
export function formatCitationRis(work: CitationWork): string {
  const lines: string[] = ["TY  - JOUR"];
  for (const a of work.authors) {
    lines.push(`AU  - ${a.given.trim() ? `${a.family}, ${a.given}` : a.family}`);
  }
  lines.push(`TI  - ${work.title}`);
  lines.push(`JO  - ${work.journal}`);
  lines.push(`PY  - ${work.year}`);
  lines.push(`UR  - ${work.url}`);
  if (work.doi) lines.push(`DO  - ${work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`);
  lines.push("ER  - ");
  return lines.join("\r\n");
}

export function formatCitationForStyle(work: CitationWork, style: CitationStyleId): string {
  switch (style) {
    case "apa":
      return formatCitationApa(work);
    case "mla":
      return formatCitationMla(work);
    case "chicago":
      return formatCitationChicago(work);
    case "harvard":
      return formatCitationHarvard(work);
    case "vancouver":
      return formatCitationVancouver(work);
    case "ieee":
      return formatCitationIeee(work);
    case "bibtex":
      return formatCitationBibtex(work);
    default:
      return formatCitationApa(work);
  }
}

/** Plain citation string for RTF export (matches selected style). */
export function formatCitationPlain(work: CitationWork, style: CitationStyleId): string {
  return formatCitationForStyle(work, style);
}

export function buildCitationWork(input: {
  title: string;
  journalName: string;
  publishedAt: string | null | undefined;
  doi: string | null | undefined;
  articleUrl: string;
  authors: PublicArticleAuthorRow[];
}): CitationWork {
  const d = input.publishedAt ? new Date(input.publishedAt) : null;
  const year = d && !Number.isNaN(d.getTime()) ? String(d.getFullYear()) : "n.d.";
  const doiRaw = input.doi?.trim() || null;
  const doiUrl =
    doiRaw && !/^https?:\/\//i.test(doiRaw)
      ? `https://doi.org/${doiRaw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`
      : doiRaw;
  return {
    title: input.title.trim(),
    journal: input.journalName.trim(),
    year,
    doi: doiRaw,
    doiUrl,
    url: input.articleUrl,
    authors: authorsToCitationAuthors(input.authors),
  };
}
