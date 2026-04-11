/**
 * Fallback when Markdown conversion drops bibliography (e.g. div-wrapped blocks) or strips list structure.
 */

function decodeBasicEntities(s: string) {
  return s
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTagsToText(html: string): string {
  return decodeBasicEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

const REF_HEADING_HTML =
  /<h[1-6][^>]*>[\s\S]*?\bReferences\b[\s\S]*?<\/h[1-6]>/i;

function stripHtmlToPlain(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if an h1–h3 line is probably a bibliography row (Word styles a reference as a heading). */
function isBibliographyHeadingPlainText(t: string): boolean {
  const s = t.trim();
  if (/^\[\d+\]\s?/.test(s)) return true;
  if (/^https?:\/\/doi\.org\/10\./i.test(s)) return true;
  if (/\b10\.\d{4,9}\//.test(s)) return true;
  if (/^\d{1,4}[\.)]\s/.test(s) && /(\(\d{4}\)|\b\d{4}\s*[;:]\b|doi\.org)/i.test(s)) return true;
  return false;
}

/**
 * Slice HTML after a References title until the next h1–h3 that is not a bibliography-style heading.
 */
function referencesHtmlSlice(html: string): string | null {
  const body = html.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "") || html;

  let from = -1;
  const hm = REF_HEADING_HTML.exec(body);
  if (hm && hm.index !== undefined) {
    from = hm.index + hm[0].length;
  } else {
    const pRe = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
    let pm: RegExpExecArray | null;
    pRe.lastIndex = 0;
    while ((pm = pRe.exec(body)) !== null) {
      const block = pm[0] ?? "";
      const plain = stripHtmlToPlain(block);
      if (/^references\s*:?\s*\.?$/i.test(plain)) {
        from = pm.index + block.length;
        break;
      }
    }
  }

  if (from < 0) return null;

  const rest = body.slice(from);
  const hRe = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let endOffset = rest.length;
  let m: RegExpExecArray | null;
  hRe.lastIndex = 0;
  while ((m = hRe.exec(rest)) !== null) {
    const inner = stripHtmlToPlain(m[2] ?? "");
    if (isBibliographyHeadingPlainText(inner)) continue;
    if (/^references\s*:?$/i.test(inner)) continue;
    endOffset = m.index;
    break;
  }

  const slice = rest.slice(0, endOffset);
  return slice.trim() ? slice : null;
}

/**
 * Pull list items and paragraphs from a references HTML fragment.
 */
export function extractReferenceEntryTextsFromHtml(html: string): { entries: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const slice = referencesHtmlSlice(html);
  if (!slice) {
    return { entries: [], warnings };
  }

  const entries: string[] = [];

  const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let lm: RegExpExecArray | null;
  liRe.lastIndex = 0;
  while ((lm = liRe.exec(slice)) !== null) {
    const t = stripTagsToText(lm[1] ?? "");
    if (t.length > 12) entries.push(t.replace(/\n+/g, " ").trim());
  }

  if (entries.length === 0) {
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let pm: RegExpExecArray | null;
    pRe.lastIndex = 0;
    while ((pm = pRe.exec(slice)) !== null) {
      const t = stripTagsToText(pm[1] ?? "");
      if (/^\s*references\s*:?\s*$/i.test(t)) continue;
      if (t.length > 12) entries.push(t.replace(/\n+/g, " ").trim());
    }
  }

  /** Word sometimes formats each reference as a heading (h2/h3). */
  if (entries.length === 0) {
    const hRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
    let hm: RegExpExecArray | null;
    hRe.lastIndex = 0;
    while ((hm = hRe.exec(slice)) !== null) {
      const t = stripTagsToText(hm[1] ?? "");
      if (/^\s*references\s*:?\s*$/i.test(t)) continue;
      const looksLikeRef =
        /^\[\d+\]\s?/.test(t) ||
        /^\d{1,4}[\.)]\s/.test(t) ||
        /\b10\.\d{4,9}\//.test(t) ||
        (t.length > 48 && /\(\d{4}\)/.test(t));
      if (looksLikeRef) entries.push(t.replace(/\n+/g, " ").trim());
    }
  }

  if (entries.length === 0) {
    warnings.push("References region found in HTML but no list items, paragraphs, or heading-style entries could be read.");
    return { entries: [], warnings };
  }

  return { entries, warnings };
}
