import type { SupabaseClient } from "@supabase/supabase-js";

/** Columns needed to render the article editor (must match admin/editor pages). */
export const ARTICLE_VERSION_ROW_SELECT =
  "id, article_id, title, abstract, markdown_body, workflow_status, extra_metadata" as const;

export type ArticleVersionRow = {
  id: string;
  article_id: string;
  title: string;
  abstract: string | null;
  markdown_body: string | null;
  workflow_status: string | null;
  extra_metadata: unknown;
};

export type EnsureArticleVersionResult =
  | { ok: true; version: ArticleVersionRow; created: boolean }
  | { ok: false; message: string };

function isUniqueViolation(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  const m = err.message ?? "";
  return m.includes("article_versions_unique_number") || m.includes("duplicate key");
}

/**
 * Ensures an article has at least one `article_versions` row and `current_version_id` is set.
 * Returns the **full version row** so callers do not need a second SELECT (avoids flaky re-fetches).
 * If version 1 already exists (race / orphan pointer), that row is loaded and treated as the edit target.
 */
export async function ensureArticleHasEditVersion(
  supabase: SupabaseClient,
  userId: string,
  articleId: string,
): Promise<EnsureArticleVersionResult> {
  const { data: article, error: aErr } = await supabase
    .from("articles")
    .select("id, title, abstract, current_version_id")
    .eq("id", articleId)
    .maybeSingle();
  if (aErr || !article) return { ok: false, message: "Article not found." };

  const { data: latest, error: latestErr } = await supabase
    .from("article_versions")
    .select(ARTICLE_VERSION_ROW_SELECT)
    .eq("article_id", articleId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    return { ok: false, message: latestErr.message ?? "Could not read article versions." };
  }

  if (latest) {
    const row = latest as ArticleVersionRow;
    const cur = article.current_version_id as string | null;
    if (!cur || cur !== row.id) {
      await supabase.from("articles").update({ current_version_id: row.id }).eq("id", articleId);
    }
    return { ok: true, version: row, created: false };
  }

  const title = String(article.title ?? "").trim() || "Untitled";
  const abstract = (article.abstract as string | null) ?? null;

  const { data: inserted, error: insErr } = await supabase
    .from("article_versions")
    .insert({
      article_id: articleId,
      version_number: 1,
      title,
      abstract,
      markdown_body:
        "## Main text\n\nWrite the article in Markdown. Use [1], [2] for citations and list full references in the metadata fields.\n",
      workflow_status: "draft",
      created_by: userId,
    })
    .select(ARTICLE_VERSION_ROW_SELECT)
    .single();

  if (insErr) {
    if (isUniqueViolation(insErr)) {
      const { data: v1 } = await supabase
        .from("article_versions")
        .select(ARTICLE_VERSION_ROW_SELECT)
        .eq("article_id", articleId)
        .eq("version_number", 1)
        .maybeSingle();
      if (v1) {
        const row = v1 as ArticleVersionRow;
        await supabase.from("articles").update({ current_version_id: row.id }).eq("id", articleId);
        return { ok: true, version: row, created: false };
      }
    }
    return { ok: false, message: insErr.message ?? "Could not create article version." };
  }

  if (!inserted) {
    return { ok: false, message: "Could not create article version." };
  }

  const row = inserted as ArticleVersionRow;

  await supabase.from("articles").update({ current_version_id: row.id }).eq("id", articleId);
  await supabase.from("article_workflow_events").insert({
    article_id: articleId,
    version_id: row.id,
    actor_user_id: userId,
    event_type: "draft_created",
  });

  return { ok: true, version: row, created: true };
}
