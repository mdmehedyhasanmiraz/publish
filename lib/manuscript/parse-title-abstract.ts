/**
 * Heuristic extraction from plain text (e.g. from a DOCX body).
 * Works best when the document has a clear "Abstract" heading/section.
 */

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
}

export function parseTitleAndAbstractFromPlainText(text: string): { title: string; abstract: string } {
  const raw = normalizeWhitespace(text);
  if (!raw) return { title: "", abstract: "" };

  // Match "Abstract" as a line or start of line, then capture until Keywords / Introduction / numbered heading
  const abstractBlock = raw.match(
    /(?:^|\n)\s*abstract\s*[:\s]?\s*\n?([\s\S]*?)(?=\n\s*(?:keywords|key\s*words|introduction|1\.?\s+introduction)\b|\n\s*\d+\.\s+[A-Z]|\n{2,}\s*[A-Z][^\n]{3,}\s*\n|$)/i,
  );

  let abstract = "";
  let title = "";

  if (abstractBlock && abstractBlock[1]) {
    abstract = abstractBlock[1]
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const before = raw.slice(0, abstractBlock.index ?? 0).trim();
    const beforeLines = before
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    // Title: lines before "Abstract" — skip very short running headers; take first substantive line(s)
    const skip = /^(authors?|author|correspondence|received|accepted|published)\b/i;
    const titleCandidates = beforeLines.filter((l) => l.length > 2 && !skip.test(l));
    if (titleCandidates.length) {
      title = titleCandidates[0] ?? "";
      if (title.length < 40 && titleCandidates[1] && titleCandidates[1].length < 120) {
        title = `${title} ${titleCandidates[1]}`.trim();
      }
    }
  } else {
    // Fallback: first non-empty line(s) as title; no abstract block found
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    title = lines.slice(0, 2).join(" ").trim();
    if (title.length > 300) title = title.slice(0, 300);
  }

  title = title.replace(/\s+/g, " ").trim().slice(0, 500);
  abstract = abstract.replace(/\s+/g, " ").trim().slice(0, 12000);

  return { title, abstract };
}
