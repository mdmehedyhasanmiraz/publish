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
}): string {
  const title = normalizeWhitespace(input.title || "Untitled");
  const abstract = (input.abstract ?? "").trim();
  const md = String(input.markdownBody ?? "").replace(/\r\n/g, "\n").trim();

  const bodyLines = md.length ? md.split("\n") : [];
  const blocks: string[] = [];

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
    const titleXml = `<title>${inlineToJats(sec.title)}</title>`;
    const parasXml = sec.paras.map((p) => `<p>${inlineToJats(p)}</p>`).join("");
    // We don’t build nested sec trees yet; we store everything as top-level secs.
    blocks.push(`<sec>${titleXml}${parasXml}</sec>`);
  }

  const abstractXml = abstract
    ? `<abstract><p>${inlineToJats(abstract)}</p></abstract>`
    : "";

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<article xmlns:xlink="http://www.w3.org/1999/xlink">`,
    `<front>`,
    `<article-meta>`,
    `<title-group><article-title>${inlineToJats(title)}</article-title></title-group>`,
    abstractXml,
    `</article-meta>`,
    `</front>`,
    `<body>${blocks.join("")}</body>`,
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

  // Replace common inline tags to Markdown-ish forms.
  let t = body;
  t = t.replace(/<italic\b[^>]*>([\s\S]*?)<\/italic>/gi, (_, a: string) => `*${unescapeXml(stripTags(a))}*`);
  t = t.replace(/<bold\b[^>]*>([\s\S]*?)<\/bold>/gi, (_, a: string) => `**${unescapeXml(stripTags(a))}**`);
  t = t.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, a: string) => `<sup>${unescapeXml(stripTags(a))}</sup>`);
  t = t.replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (_, a: string) => `<sub>${unescapeXml(stripTags(a))}</sub>`);

  // ext-link / uri / inline links (best-effort)
  t = t.replace(
    /<ext-link\b[^>]*xlink:href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/ext-link>/gi,
    (_full, href: string, inner: string) => {
      const label = normalizeWhitespace(unescapeXml(stripTags(inner))) || href;
      return `[${label}](${href})`;
    },
  );

  // Sections: <sec><title>..</title>...</sec> → ## Title + paragraphs
  const out: string[] = [];
  const secRe = /<sec\b[^>]*>([\s\S]*?)<\/sec>/gi;
  let sm: RegExpExecArray | null;
  while ((sm = secRe.exec(t)) !== null) {
    const secInner = sm[1] ?? "";
    const titleMatch = secInner.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? normalizeWhitespace(unescapeXml(stripTags(titleMatch[1] ?? ""))) : "";
    if (title) out.push(`## ${title}`);
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    let pm: RegExpExecArray | null;
    const paras: string[] = [];
    while ((pm = pRe.exec(secInner)) !== null) {
      const inner = pm[1] ?? "";
      const plain = normalizeWhitespace(unescapeXml(stripTags(inner)));
      if (plain) paras.push(plain);
    }
    if (paras.length) out.push(paras.join("\n\n"));
  }

  if (out.length) return out.join("\n\n").trim();

  // Fallback: read <p> only
  const paras: string[] = [];
  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pRe.exec(t)) !== null) {
    const inner = pm[1] ?? "";
    const plain = normalizeWhitespace(unescapeXml(stripTags(inner)));
    if (plain) paras.push(plain);
  }
  return paras.join("\n\n").trim();
}

