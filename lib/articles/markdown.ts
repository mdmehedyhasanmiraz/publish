type ArticleAsset = {
  asset_key: string;
  asset_type: "figure" | "table";
  caption: string | null;
  alt_text: string | null;
  table_markdown: string | null;
  storage_path: string | null;
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const SUP_SUB_TOKEN = /\x00SUPSUB:(\d+)\x00/g;

/** Preserves literal &lt;sup&gt; / &lt;sub&gt; from DOCX import; sanitizes inner text only. */
function sanitizeSupSubFromImport(tag: string): string {
  const m = tag.match(/^<(sup|sub)\b[^>]*>([\s\S]*?)<\/\1>$/i);
  if (!m) return escapeHtml(tag);
  const inner = m[2].replace(/<[^>]+>/g, "");
  return `<${m[1].toLowerCase()}>${escapeHtml(inner)}</${m[1].toLowerCase()}>`;
}

function isSafeArticleHref(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith("#") || u.startsWith("/")) return true;
  const lower = u.toLowerCase();
  return lower.startsWith("https:") || lower.startsWith("http:") || lower.startsWith("mailto:");
}

/** Inline Markdown: [label](url), numeric citations [1] → #reference-n, **bold**, *italic*, `code`. Supports &lt;sup&gt;/&lt;sub&gt; from imports. */
function renderRichInline(text: string) {
  const preserved: string[] = [];
  const s = text.replace(/<(sup|sub)\b[^>]*>[\s\S]*?<\/\1>/gi, (full) => {
    const i = preserved.length;
    preserved.push(sanitizeSupSubFromImport(full));
    return `\x00SUPSUB:${i}\x00`;
  });

  type Piece =
    | { kind: "text"; v: string }
    | { kind: "cite"; n: string }
    | { kind: "link"; label: string; url: string };
  const pieces: Piece[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\[(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) pieces.push({ kind: "text", v: s.slice(last, m.index) });
    if (m[3] !== undefined) pieces.push({ kind: "cite", n: m[3] });
    else pieces.push({ kind: "link", label: m[1] ?? "", url: (m[2] ?? "").trim() });
    last = m.index + m[0].length;
  }
  if (last < s.length) pieces.push({ kind: "text", v: s.slice(last) });

  const renderTextChunk = (v: string) =>
    escapeHtml(v)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

  const rendered = pieces
    .map((p) => {
      if (p.kind === "text") return renderTextChunk(p.v);
      if (p.kind === "cite") {
        const n = p.n;
        return `<sup class="align-super text-[0.75em]"><a href="#reference-${escapeHtml(n)}" class="text-primary underline decoration-primary/60 underline-offset-2">[${escapeHtml(n)}]</a></sup>`;
      }
      const labelHtml = renderTextChunk(p.label);
      if (!isSafeArticleHref(p.url)) return labelHtml;
      return `<a href="${escapeHtml(p.url)}" class="text-primary underline decoration-primary/60 underline-offset-2" rel="noopener noreferrer">${labelHtml}</a>`;
    })
    .join("");

  return rendered.replace(SUP_SUB_TOKEN, (_, i) => preserved[Number(i)] ?? "");
}

function renderTableMarkdown(tableMarkdown: string) {
  const lines = tableMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return `<pre>${escapeHtml(tableMarkdown)}</pre>`;

  const rows = lines.map((line) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((v) => v.trim()),
  );
  const header = rows[0];
  const bodyRows = rows.slice(2);

  return `<table class="min-w-full border-collapse border border-slate-300 text-sm"><thead><tr>${header
    .map((h) => `<th class="border border-slate-300 bg-slate-100 px-2 py-1 text-left">${renderRichInline(h)}</th>`)
    .join("")}</tr></thead><tbody>${bodyRows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td class="border border-slate-300 px-2 py-1 align-top">${renderRichInline(c)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table>`;
}

/** Plain label for heading text (Markdown source line), used for URL fragments. */
function stripInlineMarkdownForSlug(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(\d+)\]/g, "$1")
    .trim();
}

function slugifyHeadingKey(raw: string): string {
  const t = stripInlineMarkdownForSlug(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return t || "section";
}

function allocateHeadingId(rawTitle: string, usedBaseCounts: Map<string, number>): string {
  const base = slugifyHeadingKey(rawTitle);
  const n = usedBaseCounts.get(base) ?? 0;
  usedBaseCounts.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

/** Outline entries are section-level (`##` in Markdown); Abstract/References on the article page use the same shape. */
export type ArticleTocItem = { level: 2; id: string; text: string };

function renderShortcodeMatch(assetKey: string, asset: ArticleAsset | undefined) {
  const fragId = escapeHtml(`figure-${assetKey}`);
  if (!asset) return `<span class="text-red-600">Missing asset</span>`;
  if (asset.asset_type === "figure") {
    if (!asset.storage_path) return `<span class="text-red-600">Missing figure file</span>`;
    return `<figure id="${fragId}" class="my-6 scroll-mt-24"><img src="/api/article-asset?path=${encodeURIComponent(asset.storage_path)}" alt="${escapeHtml(
      asset.alt_text ?? "",
    )}" class="max-h-[480px] w-auto rounded border" /><figcaption class="mt-2 text-sm text-slate-600">${renderRichInline(
      asset.caption ?? "",
    )}</figcaption></figure>`;
  }
  return `<figure id="${fragId}" class="my-6 scroll-mt-24">${renderTableMarkdown(asset.table_markdown ?? "")}<figcaption class="mt-2 text-sm text-slate-600">${renderRichInline(
    asset.caption ?? "",
  )}</figcaption></figure>`;
}

export function renderArticleMarkdownToHtmlWithToc(
  markdownBody: string,
  assets: ArticleAsset[],
): { html: string; toc: ArticleTocItem[] } {
  const assetMap = new Map(assets.map((a) => [a.asset_key, a]));
  const lines = markdownBody.split("\n");
  const blocks: string[] = [];
  const toc: ArticleTocItem[] = [];
  const usedIds = new Map<string, number>();
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(
      `<p class="text-[18px] leading-8 text-slate-800">${renderRichInline(paragraph.join(" "))}</p>`,
    );
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const shortcode = line.match(/^\{\{(figure|table):([a-zA-Z0-9_-]+)\}\}$/);
    if (!line) {
      flushParagraph();
      continue;
    }
    if (shortcode) {
      flushParagraph();
      const key = shortcode[2];
      blocks.push(renderShortcodeMatch(key, assetMap.get(key)));
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      const raw = line.slice(4);
      const id = allocateHeadingId(raw, usedIds);
      blocks.push(
        `<h3 id="${escapeHtml(id)}" class="scroll-mt-24 text-xl font-semibold mt-6">${renderRichInline(raw)}</h3>`,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      const raw = line.slice(3);
      const id = allocateHeadingId(raw, usedIds);
      const text = stripInlineMarkdownForSlug(raw);
      toc.push({ level: 2, id, text });
      blocks.push(
        `<h2 id="${escapeHtml(id)}" class="scroll-mt-24 text-2xl font-semibold mt-8">${renderRichInline(raw)}</h2>`,
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      const raw = line.slice(2);
      const id = allocateHeadingId(raw, usedIds);
      blocks.push(
        `<h1 id="${escapeHtml(id)}" class="scroll-mt-24 text-3xl font-bold mt-8">${renderRichInline(raw)}</h1>`,
      );
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return { html: blocks.join("\n"), toc };
}

export function renderArticleMarkdownToHtml(markdownBody: string, assets: ArticleAsset[]) {
  return renderArticleMarkdownToHtmlWithToc(markdownBody, assets).html;
}

