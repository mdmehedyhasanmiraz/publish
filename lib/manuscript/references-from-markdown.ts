import type { ArticleReferenceRow } from "@/lib/articles/extra-metadata";
import {
  extractDoiFromText,
  googleScholarSearchUrlFromReferenceText,
  normalizeDoi,
} from "@/lib/articles/reference-links";

const REFERENCES_HEADING = /^#{1,3}\s*references\s*:?\s*\.?\s*$/i;
/** Word often uses bold body text instead of a real heading: **References** or References */
const REFERENCES_STANDALONE_LINE = /^\s*(?:\*\*)?\s*references\s*:?\s*\.?\s*(?:\*\*)?\s*$/i;
/** Start of a numbered reference line: [1] or [1]Foo or 1. or 1) */
const NUMBERED_REF_START = /^\s*(?:\[\d+\]\s*|\d{1,4}[\.\)]\s+)/;
/** Bullet list line (Word bullets) */
const BULLET_REF_START = /^\s*(?:[-*•]|\u2022)\s+/;
/** Markdown line like ## [1] … when Word styled the citation as a heading */
const MARKDOWN_REF_HEADING = /^#{1,3}\s+(?=\[\d+\]|\d{1,4}[\.\)])/;
const ANY_HEADING = /^#{1,3}\s+/;

function isBibliographyMarkdownHeadingLine(trimmedLine: string): boolean {
  if (!ANY_HEADING.test(trimmedLine)) return false;
  if (MARKDOWN_REF_HEADING.test(trimmedLine)) return true;
  const rest = trimmedLine.replace(/^#{1,3}\s+/, "").trim();
  if (/^https?:\/\/doi\.org\/10\./i.test(rest)) return true;
  if (/\b10\.\d{4,9}\//.test(rest)) return true;
  if (/^\d{1,4}[\.\)]\s/.test(rest) && /(\(\d{4}\)|\b\d{4}\s*[;:]\b|doi\.org)/i.test(rest)) return true;
  return false;
}

function isEndOfReferencesMarkdownSection(trimmedLine: string): boolean {
  if (!ANY_HEADING.test(trimmedLine)) return false;
  if (REFERENCES_HEADING.test(trimmedLine)) return false;
  if (isBibliographyMarkdownHeadingLine(trimmedLine)) return false;
  return true;
}

/**
 * Text between the first Markdown heading "References" and the next same-or-higher-level section.
 */
export function extractReferenceEntryTexts(markdown: string): { entries: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const trim = lines[i].trim();
    if (REFERENCES_HEADING.test(trim) || REFERENCES_STANDALONE_LINE.test(trim)) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) {
    warnings.push(
      'No "References" section was found. In Word, use a heading titled References, or a separate paragraph line that says References (bold is fine). Numbered or bulleted lists under it are supported.',
    );
    return { entries: [], warnings };
  }

  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].trim();
    if (isEndOfReferencesMarkdownSection(t)) {
      end = i;
      break;
    }
  }

  const section = lines.slice(start, end).join("\n").trim();
  if (!section) {
    warnings.push('Found a "References" heading but no entries below it.');
    return { entries: [], warnings };
  }

  const entries = splitReferenceEntries(section);
  if (entries.length === 0) {
    warnings.push('Could not split the References section into separate items.');
  }
  return { entries, warnings };
}

function stripRefLinePrefix(line: string): string {
  return line
    .replace(/^#{1,3}\s+/, "")
    .replace(NUMBERED_REF_START, "")
    .replace(BULLET_REF_START, "")
    .trim();
}

function splitReferenceEntries(section: string): string[] {
  const trimmed = section.trim();
  if (!trimmed) return [];

  const byParagraphs = trimmed.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (byParagraphs.length > 1) {
    return byParagraphs.map((p) => stripRefLinePrefix(p)).filter(Boolean);
  }

  const single = byParagraphs[0] ?? trimmed;
  const lines = single.split("\n");
  const chunks: string[] = [];
  let buf: string[] = [];

  for (const line of lines) {
    const isNewEntry =
      buf.length > 0 &&
      (NUMBERED_REF_START.test(line) ||
        BULLET_REF_START.test(line) ||
        MARKDOWN_REF_HEADING.test(line.trim()));
    if (isNewEntry) {
      chunks.push(buf.join("\n").trim());
      buf = [stripRefLinePrefix(line)];
    } else {
      buf.push(line);
    }
  }
  if (buf.length) {
    chunks.push(buf.join("\n").trim());
  }

  const cleaned = chunks.map((c) => stripRefLinePrefix(c)).filter(Boolean);
  return cleaned.length ? cleaned : [stripRefLinePrefix(trimmed)];
}

/**
 * Builds metadata rows: DOI from text when present, Scholar search URL (always).
 */
export function enrichReferenceRowsFromTexts(texts: string[]): ArticleReferenceRow[] {
  return texts.map((text) => {
    const t = text.trim();
    if (!t) return { text: "" };
    const fromField = extractDoiFromText(t);
    const doi = fromField ? normalizeDoi(fromField) : undefined;
    return {
      text: t,
      ...(doi ? { doi } : {}),
      google_scholar_url: googleScholarSearchUrlFromReferenceText(t),
    };
  }).filter((r) => r.text.length > 0);
}
