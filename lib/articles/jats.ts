import type { PublicArticleAuthorRow } from "@/lib/articles/public-article-authors";
import { formatAffiliationFootnoteText } from "@/lib/articles/public-article-authors";
import { creditTermIdentifier, normalizeCreditRole } from "@/lib/articles/credit-roles";

function escapeXml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function unescapeXml(s: string) {
  return s
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function stripXmlDeclAndTrim(xml: string): string {
  return String(xml ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/^\s*<\?xml[^>]*\?>\s*/i, "")
    .trim();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const SUPSUB_TOKEN_RE = /\uE100(\d+)\uE100/g;

function xmlInlineToMarkdown(raw: string): string {
  const preserved: string[] = [];
  let t = raw;
  t = t.replace(/<(sup|sub)\b[^>]*>([\s\S]*?)<\/\1>/gi, (full) => {
    const m = full.match(/^<(sup|sub)\b[^>]*>([\s\S]*?)<\/\1>$/i);
    if (!m) return "";
    const idx = preserved.length;
    preserved.push(`<${m[1].toLowerCase()}>${unescapeXml(stripTags(m[2] ?? ""))}</${m[1].toLowerCase()}>`);
    return `\uE100${idx}\uE100`;
  });
  t = t.replace(/<italic\b[^>]*>([\s\S]*?)<\/italic>/gi, (_, a: string) => `*${unescapeXml(stripTags(a))}*`);
  t = t.replace(/<bold\b[^>]*>([\s\S]*?)<\/bold>/gi, (_, a: string) => `**${unescapeXml(stripTags(a))}**`);
  t = t.replace(
    /<ext-link\b[^>]*xlink:href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/ext-link>/gi,
    (_full, href: string, inner: string) => {
      const label = normalizeWhitespace(unescapeXml(stripTags(inner))) || href;
      return `[${label}](${href})`;
    },
  );
  t = unescapeXml(stripTags(t));
  return normalizeWhitespace(t).replace(SUPSUB_TOKEN_RE, (_, i) => preserved[Number(i)] ?? "");
}

/**
 * Minimal Markdown → JATS generator for your current editor/import flow.
 * - Preserves {{figure:...}} / {{table:...}} as paragraph text so your asset rendering still works.
 * - Preserves literal <sup>/<sub> tags from your DOCX import.
 * - Converts basic **bold** / *italic* to <bold>/<italic> (best-effort).
 *
 * This is not a full JATS implementation; it aims to be stable for your current content pipeline.
 */
export function markdownToJatsXml(input: {
  title: string;
  abstract?: string | null;
  markdownBody: string;
  authors?: PublicArticleAuthorRow[];
}): string {
  const title = normalizeWhitespace(input.title || "Untitled");
  const abstract = (input.abstract ?? "").trim();
  const md = String(input.markdownBody ?? "").replace(/\r\n/g, "\n").trim();

  const bodyLines = md.length ? md.split("\n") : [];
  const blocks: string[] = [];
  const refs: Array<{ n: string; text: string }> = [];
  const authors = Array.isArray(input.authors) ? input.authors : [];
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  // Very small inline conversion: keep <sup>/<sub>, convert ** and *.
  const inlineToJats = (raw: string) => {
    const preserved: string[] = [];
    let s = raw;
    s = s.replace(/<(sup|sub)\b[^>]*>[\s\S]*?<\/\1>/gi, (full) => {
      const i = preserved.length;
      preserved.push(full);
      return `\uE000${i}\uE000`;
    });
    s = escapeXml(s);
    // bold then italic (non-greedy)
    s = s.replace(/\*\*([^*]+?)\*\*/g, "<bold>$1</bold>");
    s = s.replace(/\*([^*]+?)\*/g, "<italic>$1</italic>");
    // restore preserved tags without escaping their markup; escape their inner text only
    s = s.replace(/\uE000(\d+)\uE000/g, (_, idxRaw) => {
      const idx = Number(idxRaw);
      const tag = preserved[idx] ?? "";
      const m = tag.match(/^<(sup|sub)\b[^>]*>([\s\S]*?)<\/\1>$/i);
      if (!m) return escapeXml(tag);
      const t = stripTags(m[2] ?? "");
      return `<${m[1].toLowerCase()}>${escapeXml(t)}</${m[1].toLowerCase()}>`;
    });
    return s;
  };

  // Build <sec> structure using ## / ### headings; # becomes a top-level <sec> as well.
  type Sec = { level: 2 | 3; title: string; paras: string[] };
  const secs: Sec[] = [];
  let current: Sec | null = null;

  const flushParaBuffer = (buf: string[]) => {
    if (!current) {
      // If no section headings exist, create an implicit one.
      current = { level: 2, title: "Main text", paras: [] };
      secs.push(current);
    }
    const text = buf.join(" ").trim();
    if (text) current.paras.push(text);
  };

  let paraBuf: string[] = [];
  for (const rawLine of bodyLines) {
    const line = rawLine.trim();
    if (!line) {
      flushParaBuffer(paraBuf);
      paraBuf = [];
      continue;
    }
    if (line.startsWith("## ")) {
      flushParaBuffer(paraBuf);
      paraBuf = [];
      current = { level: 2, title: line.slice(3).trim(), paras: [] };
      secs.push(current);
      continue;
    }
    if (line.startsWith("### ")) {
      flushParaBuffer(paraBuf);
      paraBuf = [];
      current = { level: 3, title: line.slice(4).trim(), paras: [] };
      secs.push(current);
      continue;
    }
    if (line.startsWith("# ")) {
      flushParaBuffer(paraBuf);
      paraBuf = [];
      current = { level: 2, title: line.slice(2).trim(), paras: [] };
      secs.push(current);
      continue;
    }
    paraBuf.push(line);
  }
  flushParaBuffer(paraBuf);

  for (const sec of secs) {
    if (normalizeWhitespace(sec.title).toLowerCase() === "references") {
      for (const p of sec.paras) {
        const m = p.match(/^\[(\d+)\]\s*(.*)$/);
        if (m) refs.push({ n: m[1], text: m[2].trim() });
        else refs.push({ n: String(refs.length + 1), text: p.trim() });
      }
      continue;
    }
    const titleXml = `<title>${inlineToJats(sec.title)}</title>`;
    const parasXml = sec.paras.map((p) => `<p>${inlineToJats(p)}</p>`).join("");
    // We don’t build nested sec trees yet; we store everything as top-level secs.
    blocks.push(`<sec>${titleXml}${parasXml}</sec>`);
  }

  const abstractXml = abstract
    ? `<abstract><p>${inlineToJats(abstract)}</p></abstract>`
    : "";
  const contribXml = (() => {
    if (!authors.length) return "";
    const affIndexByKey = new Map<string, number>();
    const affTexts: string[] = [];
    const keyOf = (author: PublicArticleAuthorRow, af: NonNullable<PublicArticleAuthorRow["affiliations"]>[number]) =>
      [
        String(af.department ?? "").trim().toLowerCase(),
        String(af.institution_name ?? "").trim().toLowerCase(),
        String(af.city ?? author.city ?? "").trim().toLowerCase(),
        String(af.country_code ?? author.country_code ?? "").trim().toLowerCase(),
      ].join("|");

    const correspondingAuthor = authors.find((a) => Boolean(a.is_corresponding_author));
    const contribs = authors.map((author, idx) => {
      const given = normalizeWhitespace([author.first_name, author.middle_name].filter(Boolean).join(" "));
      const surname = normalizeWhitespace([author.last_name, author.suffix].filter(Boolean).join(" "));
      const fallback = normalizeWhitespace(author.display_name ?? "") || "Author";
      const nameXml =
        given || surname
          ? `<name>${given ? `<given-names>${escapeXml(given)}</given-names>` : ""}${surname ? `<surname>${escapeXml(surname)}</surname>` : ""}</name>`
          : `<string-name>${escapeXml(fallback)}</string-name>`;

      const affRefs: number[] = [];
      const affs = Array.isArray(author.affiliations) ? author.affiliations : [];
      for (const af of affs) {
        const text = formatAffiliationFootnoteText(af, author).trim();
        if (!text) continue;
        const key = keyOf(author, af);
        if (!affIndexByKey.has(key)) {
          affIndexByKey.set(key, affTexts.length + 1);
          affTexts.push(text);
        }
        const idx = affIndexByKey.get(key);
        if (idx && !affRefs.includes(idx)) affRefs.push(idx);
      }

      const xrefs = affRefs.map((n) => `<xref ref-type="aff" rid="af${n}">${n}</xref>`).join("");
      const orcid = String(author.orcid_id ?? "").trim();
      const orcidHref = orcid
        ? /^https?:\/\//i.test(orcid)
          ? orcid
          : `https://orcid.org/${orcid.replace(/^\/+/, "")}`
        : "";
      const orcidXml = orcidHref
        ? `<contrib-id contrib-id-type="orcid" authenticated="true">${escapeXml(orcidHref)}</contrib-id>`
        : "";
      const rolesRaw = Array.isArray(author.credit_roles) ? author.credit_roles : [];
      const seen = new Set<string>();
      const rolesXml = rolesRaw
        .map((r) => String(r ?? "").trim())
        .filter(Boolean)
        .filter((r) => {
          const key = normalizeCreditRole(r);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((role) => {
          const term = escapeXml(role);
          const termId = escapeXml(creditTermIdentifier(role));
          return `<role vocab="credit" vocab-identifier="https://credit.niso.org/" vocab-term="${term}" vocab-term-identifier="${termId}">${term}</role>`;
        })
        .join("");
      const isCorresp = Boolean(author.is_corresponding_author);
      const correspXref = isCorresp ? `<xref rid="c1" ref-type="corresp">*</xref>` : "";
      return `<contrib contrib-type="author" id="A${idx + 1}">${orcidXml}${nameXml}${rolesXml}${xrefs}${correspXref}</contrib>`;
    });

    const affXml = affTexts
      .map((text, i) => `<aff id="af${i + 1}"><label>${i + 1}</label>${escapeXml(text)}</aff>`)
      .join("");
    const correspXml = correspondingAuthor
      ? `<author-notes><corresp id="c1"><label>*</label>Correspondence: <email>${escapeXml(String(correspondingAuthor.email ?? "").trim())}</email>${String(correspondingAuthor.phone ?? "").trim() ? `; Tel.: ${escapeXml(String(correspondingAuthor.phone ?? "").trim())}` : ""}</corresp></author-notes>`
      : "";
    return `<contrib-group>${contribs.join("")}</contrib-group>${affXml}${correspXml}`;
  })();
  const backXml = `<back><notes><title>Author Contributions</title><p>CRediT roles are captured per author in the submission workflow and encoded in each contrib role element.</p></notes><ack><title>Acknowledgments</title><p>The authors thank contributors and institutions supporting this work.</p></ack><fn-group><fn id="conflict"><p>The authors declare no conflict of interest.</p></fn></fn-group>${refs.length ? `<ref-list><title>References</title>${refs
    .map(
      (r) =>
        `<ref id="B${escapeXml(r.n)}"><label>${escapeXml(r.n)}</label><mixed-citation>${inlineToJats(r.text)}</mixed-citation></ref>`,
    )
    .join("")}</ref-list>` : ""}</back>`;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Publishing DTD v1.3 20210610//EN" "JATS-journalpublishing1-3.dtd">`,
    `<article xmlns:mml="http://www.w3.org/1998/Math/MathML" xmlns:xlink="http://www.w3.org/1999/xlink" article-type="research-article" dtd-version="1.3" xml:lang="en">`,
    `<front>`,
    `<journal-meta>`,
    `<journal-id journal-id-type="publisher-id">journal-id</journal-id>`,
    `<journal-title-group><journal-title>Journal Title</journal-title><abbrev-journal-title abbrev-type="publisher">J. Title</abbrev-journal-title><abbrev-journal-title abbrev-type="pubmed">Journal Title</abbrev-journal-title></journal-title-group>`,
    `<issn pub-type="epub">0000-0000</issn>`,
    `<publisher><publisher-name>Publisher</publisher-name></publisher>`,
    `</journal-meta>`,
    `<article-meta>`,
    `<article-id pub-id-type="doi">10.0000/placeholder-doi</article-id>`,
    `<article-id pub-id-type="publisher-id">placeholder-article-id</article-id>`,
    `<article-categories><subj-group><subject>Article</subject></subj-group></article-categories>`,
    `<title-group><article-title>${inlineToJats(title)}</article-title></title-group>`,
    contribXml,
    abstractXml,
    `<pub-date pub-type="epub"><day>${day}</day><month>${month}</month><year>${year}</year></pub-date>`,
    `<pub-date pub-type="collection"><month>${month}</month><year>${year}</year></pub-date>`,
    `<volume>1</volume><issue>1</issue><elocation-id>1</elocation-id>`,
    `<history><date date-type="received"><day>${day}</day><month>${month}</month><year>${year}</year></date><date date-type="rev-recd"><day>${day}</day><month>${month}</month><year>${year}</year></date><date date-type="accepted"><day>${day}</day><month>${month}</month><year>${year}</year></date></history>`,
    `<permissions><copyright-statement>© ${year} by the authors.</copyright-statement><copyright-year>${year}</copyright-year><license license-type="open-access"><license-p>This article is distributed under the terms and conditions of the <ext-link ext-link-type="uri" xlink:href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution (CC BY) license</ext-link>.</license-p></license></permissions>`,
    `<kwd-group/>`,
    `<funding-group/>`,
    `</article-meta>`,
    `</front>`,
    `<body>${blocks.join("")}</body>`,
    backXml,
    `</article>`,
  ].join("");
}

/**
 * Minimal JATS → Markdown converter (supports the JATS subset we generate).
 * This lets your existing Markdown renderer keep producing the same UI.
 */
export function jatsXmlToMarkdown(jatsXml: string): string {
  const xml = stripXmlDeclAndTrim(jatsXml);
  if (!xml) return "";

  // Extract <body>...</body>
  const bodyMatch = xml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1] ?? xml;

  let t = body;

  // Sections: <sec><title>..</title>...</sec> → ## Title + paragraphs
  const out: string[] = [];
  const secRe = /<sec\b[^>]*>([\s\S]*?)<\/sec>/gi;
  let sm: RegExpExecArray | null;
  while ((sm = secRe.exec(t)) !== null) {
    const secInner = sm[1] ?? "";
    const titleMatch = secInner.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? xmlInlineToMarkdown(titleMatch[1] ?? "") : "";
    if (title) out.push(`## ${title}`);
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let pm: RegExpExecArray | null;
    const paras: string[] = [];
    while ((pm = pRe.exec(secInner)) !== null) {
      const inner = pm[1] ?? "";
      const plain = xmlInlineToMarkdown(inner);
      if (plain) paras.push(plain);
    }
    if (paras.length) out.push(paras.join("\n\n"));
  }

  // Parse back/ref-list for standard JATS references.
  const refsOut: string[] = [];
  const refListMatch = xml.match(/<ref-list\b[^>]*>([\s\S]*?)<\/ref-list>/i);
  if (refListMatch) {
    const refInner = refListMatch[1] ?? "";
    const refRe = /<ref\b[^>]*>([\s\S]*?)<\/ref>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = refRe.exec(refInner)) !== null) {
      const one = rm[1] ?? "";
      const labelMatch = one.match(/<label\b[^>]*>([\s\S]*?)<\/label>/i);
      const mixedMatch = one.match(/<mixed-citation\b[^>]*>([\s\S]*?)<\/mixed-citation>/i);
      const citMatch = one.match(/<element-citation\b[^>]*>([\s\S]*?)<\/element-citation>/i);
      const label = labelMatch ? normalizeWhitespace(unescapeXml(stripTags(labelMatch[1] ?? ""))) : "";
      const text = mixedMatch
        ? xmlInlineToMarkdown(mixedMatch[1] ?? "")
        : citMatch
          ? xmlInlineToMarkdown(citMatch[1] ?? "")
          : xmlInlineToMarkdown(one);
      if (text) refsOut.push(`[${label || String(refsOut.length + 1)}] ${text}`);
    }
  }

  if (refsOut.length) {
    out.push("## References");
    out.push(...refsOut);
  }

  if (out.length) return out.join("\n\n").trim();

  // Fallback: read <p> only
  const paras: string[] = [];
  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pRe.exec(t)) !== null) {
    const inner = pm[1] ?? "";
    const plain = xmlInlineToMarkdown(inner);
    if (plain) paras.push(plain);
  }
  return paras.join("\n\n").trim();
}

