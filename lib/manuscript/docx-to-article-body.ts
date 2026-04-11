import mammoth from "mammoth";

function decodeBasicEntities(s: string) {
  return s
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtmlInner(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Inline HTML from Mammoth → markdown-ish line with **bold**, *italic*, and literal &lt;sup&gt;/&lt;sub&gt; kept.
 */
function inlineHtmlToArticleLine(html: string): string {
  let s = html.trim();
  if (!s) return "";

  const preserved: string[] = [];
  s = s.replace(/<(sup|sub)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_match, tag: string, inner: string) => {
    const plain = inner.replace(/<[^>]+>/g, "");
    const decoded = decodeBasicEntities(plain);
    const idx = preserved.length;
    preserved.push(`<${String(tag).toLowerCase()}>${escapeHtmlInner(decoded)}</${String(tag).toLowerCase()}>`);
    return `\uE000${idx}\uE000`;
  });

  const unwrap = (x: string) => {
    let t = x;
    for (let i = 0; i < 12; i++) {
      const next = t
        .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, (_, a) => `**${unwrap(a)}**`)
        .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, (_, a) => `**${unwrap(a)}**`)
        .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, (_, a) => `*${unwrap(a)}*`)
        .replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, (_, a) => `*${unwrap(a)}*`);
      if (next === t) break;
      t = next;
    }
    return t;
  };
  s = unwrap(s);

  s = s.replace(/<[^>]+>/g, "");
  s = decodeBasicEntities(s);

  s = s.replace(/\uE000(\d+)\uE000/g, (_, i) => preserved[Number(i)] ?? "");

  return s.replace(/\s+/g, " ").trim();
}

/**
 * Word bibliography is often emitted as &lt;ul&gt;/&lt;ol&gt;&lt;li&gt;…&lt;/li&gt;. The article extractor only
 * reads &lt;p&gt; and headings, so lists would be skipped entirely. Flatten each list item to its own &lt;p&gt;.
 */
function flattenListsToParagraphs(htmlFragment: string): string {
  let h = htmlFragment;
  for (let pass = 0; pass < 24; pass++) {
    const next = h.replace(/<(o|u)l\b[^>]*>([\s\S]*?)<\/\1>/gi, (full, _kind: string, inner: string) => {
      const parts: string[] = [];
      const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let lm: RegExpExecArray | null;
      liRe.lastIndex = 0;
      while ((lm = liRe.exec(inner)) !== null) {
        const raw = (lm[1] ?? "").trim();
        if (!raw) continue;
        const paras = [...raw.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
        let merged = paras.length
          ? paras.map((m) => m[1].replace(/\s+/g, " ").trim()).filter(Boolean).join(" ")
          : "";
        if (!merged) {
          merged = raw
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }
        if (merged) parts.push(`<p>${merged}</p>`);
      }
      return parts.length ? parts.join("") : full;
    });
    if (next === h) break;
    h = next;
  }
  return h;
}

/**
 * Mammoth HTML → article markdown body: headings, paragraphs, figure/table shortcodes. Preserves &lt;sup&gt;/&lt;sub&gt;.
 */
export function mammothHtmlToArticleMarkdown(html: string): string {
  let h = (html ?? "").replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "").trim();
  if (!h) h = html ?? "";

  h = flattenListsToParagraphs(h);

  let fig = 1;
  let tbl = 1;
  h = h.replace(/<table\b[\s\S]*?<\/table>/gi, () => `\n<p>{{table:tbl-${tbl++}}}</p>\n`);
  h = h.replace(/<img\b[^>]*>/gi, () => `\n<p>{{figure:fig-${fig++}}}</p>\n`);

  const out: string[] = [];
  const re = /<(h[1-3]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(h)) !== null) {
    const tag = m[1].toLowerCase();
    const inner = m[2] ?? "";
    const t = inner.trim();
    if (!t) continue;
    if (/^\{\{(figure|table):/.test(t.replace(/<[^>]+>/g, "").trim())) {
      const plain = t.replace(/<p[^>]*>|<\/p>/gi, "").trim();
      out.push(plain);
      continue;
    }
    const line = inlineHtmlToArticleLine(inner);
    if (!line) continue;
    if (tag === "h1") out.push(`# ${line}`);
    else if (tag === "h2") out.push(`## ${line}`);
    else if (tag === "h3") out.push(`### ${line}`);
    else out.push(line);
  }

  if (out.length === 0) {
    const fallback = inlineHtmlToArticleLine(h.replace(/<[^>]+>/g, " "));
    return fallback || "";
  }

  return out.join("\n\n").trim();
}

export async function docxBufferToArticleMarkdownBody(
  buffer: ArrayBuffer,
  hooks?: {
    /** Fires before Word→HTML, then before HTML→Markdown. */
    onPhase?: (phase: "word_to_html" | "html_to_markdown") => void;
  },
): Promise<{
  markdown: string;
  /** Raw Mammoth HTML (for reference extraction fallback). */
  html: string;
  warnings: string[];
}> {
  hooks?.onPhase?.("word_to_html");
  const result = await mammoth.convertToHtml(
    { buffer: Buffer.from(buffer) },
    {
      ignoreEmptyParagraphs: false,
    },
  );
  const html = result.value ?? "";
  hooks?.onPhase?.("html_to_markdown");
  const markdown = mammothHtmlToArticleMarkdown(html);
  const warnings = (result.messages ?? []).map((x) => String((x as { message?: string }).message ?? x));
  return { markdown, html, warnings };
}
