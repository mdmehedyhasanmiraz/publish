import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPublicSiteUrl } from "@/lib/site-url";

const STATIC_PATHS = [
  "/",
  "/about",
  "/journals",
  "/latest-research",
  "/search",
  "/for-authors/submission-guidelines",
  "/for-authors/contact",
  "/for-authors/journal-policy",
  "/for-authors/plagiarism-policy",
  "/for-authors/ethics-statement",
  "/for-authors/retraction-correction-policy",
  "/for-authors/conflict-of-interest-policy",
  "/for-authors/article-processing-charges",
  "/auth/login",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/error",
  "/auth/update-password",
  "/auth/sign-up-success",
] as const;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicSiteUrl();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: path === "/" ? `${base}/` : `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const supabase = await createClient();

  const { data: journals } = await supabase.from("journals").select("id, slug");

  for (const j of journals ?? []) {
    const slug = String(j.slug);
    const now = new Date();
    entries.push(
      {
        url: `${base}/j/${slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.85,
      },
      {
        url: `${base}/j/${slug}/archive`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.75,
      },
      {
        url: `${base}/j/${slug}/aims-and-scope`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.65,
      },
    );
  }

  const slugByJournalId = new Map((journals ?? []).map((j) => [String(j.id), String(j.slug)]));

  const { data: articleRows } = await supabase
    .from("articles")
    .select("manuscript_reference_code, journal_id, published_at")
    .eq("status", "published");

  for (const row of articleRows ?? []) {
    const js = slugByJournalId.get(String(row.journal_id));
    const code =
      typeof row.manuscript_reference_code === "string" ? row.manuscript_reference_code.trim() : "";
    if (!js || !code) continue;
    entries.push({
      url: `${base}/j/${js}/article/${encodeURIComponent(code)}`,
      lastModified: row.published_at ? new Date(row.published_at as string) : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
