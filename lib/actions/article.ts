"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ArticleExtraMetadata, ArticleReferenceRow } from "@/lib/articles/extra-metadata";
import { parseArticleExtraMetadata } from "@/lib/articles/extra-metadata";
import { mergeWorkspaceRoles } from "@/lib/auth/app-roles";
import { isPlatformAdminRole } from "@/lib/peer-review/workflow-access";
import { slugify } from "@/lib/utils";
import {
  ensureArticleHasEditVersion as ensureArticleHasEditVersionCore,
  type EnsureArticleVersionResult,
} from "@/lib/articles/ensure-article-edit-version";
import {
  runImportArticleBodyFromSubmission,
  type ImportManuscriptBodyResult,
} from "@/lib/manuscript/import-article-body-from-submission";

type ActionResult = { ok: boolean; message?: string };

type EditorAuth = { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string };

async function requireEditorAccess(): Promise<EditorAuth | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roles")
    .eq("user_id", user.id)
    .maybeSingle();
  const roles = mergeWorkspaceRoles(profile?.roles, profile?.role);
  const allowed = roles.some((r) =>
    ["admin", "editor_in_chief", "managing_editor", "associate_editor"].includes(r),
  );
  const isAdmin = isPlatformAdminRole(roles, profile?.role as string | undefined);
  if (!allowed && !isAdmin) return { ok: false as const, message: "Editor/Admin access required." };

  return { ok: true as const, supabase, userId: user.id };
}

/**
 * After a manuscript is accepted, ensure there is an article draft linked to the submission (idempotent).
 */
export async function ensureArticleForSubmissionAction(submissionId: string) {
  const auth = await requireEditorAccess();
  if (!auth.ok) return auth;
  const { supabase, userId } = auth;

  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (existing?.id) {
    return { ok: true as const, articleId: existing.id as string, created: false };
  }

  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("id, journal_id, title, abstract")
    .eq("id", submissionId)
    .single();
  if (subErr || !sub) return { ok: false as const, message: "Submission not found." };

  const title = String(sub.title ?? "").trim() || "Untitled";
  const abstract = sub.abstract ? String(sub.abstract).trim() : null;
  const base = slugify(title) || "article";
  const slug = `${base}-${String(sub.id).replace(/-/g, "").slice(0, 8)}`;

  const { data: article, error: aErr } = await supabase
    .from("articles")
    .insert({
      journal_id: sub.journal_id,
      submission_id: submissionId,
      title,
      slug,
      status: "ahead_of_issue",
      abstract,
      keywords: [],
    })
    .select("id")
    .single();
  if (aErr || !article) {
    return { ok: false as const, message: aErr?.message ?? "Could not create article." };
  }

  const { data: version, error: vErr } = await supabase
    .from("article_versions")
    .insert({
      article_id: article.id,
      version_number: 1,
      title,
      abstract,
      markdown_body:
        "## Main text\n\nWrite the article in Markdown. Use [1], [2] for citations and list full references in the metadata fields.\n",
      workflow_status: "draft",
      created_by: userId,
    })
    .select("id")
    .single();
  if (vErr || !version) {
    return { ok: false as const, message: vErr?.message ?? "Could not create article version." };
  }

  await supabase.from("articles").update({ current_version_id: version.id }).eq("id", article.id);
  await supabase.from("article_workflow_events").insert({
    article_id: article.id,
    version_id: version.id,
    actor_user_id: userId,
    event_type: "created_from_submission",
  });

  revalidatePath("/admin/articles");
  revalidatePath("/editor/articles");
  revalidatePath(`/admin/articles/${article.id}`);
  revalidatePath(`/editor/articles/${article.id}`);
  return { ok: true as const, articleId: article.id as string, created: true };
}

/**
 * Server action wrapper. For RSC pages, use `ensureArticleHasEditVersion` from
 * `@/lib/articles/ensure-article-edit-version` with the page Supabase client.
 */
export async function ensureArticleHasEditVersionAction(articleId: string): Promise<EnsureArticleVersionResult> {
  const auth = await requireEditorAccess();
  if (!auth.ok) return { ok: false, message: auth.message };
  return ensureArticleHasEditVersionCore(auth.supabase, auth.userId, articleId);
}

/**
 * Converts the submission’s latest manuscript .docx into Markdown for the article body
 * (figures/tables as {{figure:fig-n}} / {{table:tbl-n}} placeholders; superscript/subscript kept as &lt;sup&gt;/&lt;sub&gt;).
 * For live progress in the UI, use POST `/api/articles/import-manuscript-body` (NDJSON stream).
 */
export async function importManuscriptBodyFromSubmissionAction(input: {
  articleId: string;
}): Promise<ImportManuscriptBodyResult> {
  const auth = await requireEditorAccess();
  if (!auth.ok) return { ok: false, message: auth.message };
  return runImportArticleBodyFromSubmission(auth.supabase, input.articleId);
}

function assertWorkflowTransition(current: string, next: string) {
  const map: Record<string, string[]> = {
    draft: ["in_review", "published"],
    in_review: ["approved", "draft", "published"],
    approved: ["published", "draft"],
    published: ["approved"],
  };
  if (!map[current]?.includes(next)) {
    throw new Error(`Invalid transition from ${current} to ${next}`);
  }
}

export async function createArticleDraftAction(input: {
  journalId: string;
  title: string;
  slug?: string;
  issueId?: string | null;
  submissionId?: string | null;
}) {
  const auth = await requireEditorAccess();
  if (!auth.ok) return auth;
  const { supabase, userId } = auth;

  const title = input.title.trim();
  if (!input.journalId || !title) return { ok: false as const, message: "Journal and title are required." };
  const slug = slugify(input.slug?.trim() || title);
  if (!slug) return { ok: false as const, message: "Slug is required." };

  const { data: article, error } = await supabase
    .from("articles")
    .insert({
      journal_id: input.journalId,
      issue_id: input.issueId || null,
      submission_id: input.submissionId || null,
      title,
      slug,
      status: "ahead_of_issue",
    })
    .select("id")
    .single();
  if (error || !article) return { ok: false as const, message: error?.message ?? "Could not create article." };

  const { data: maxRow } = await supabase
    .from("article_versions")
    .select("version_number")
    .eq("article_id", article.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const versionNumber = (maxRow?.version_number ?? 0) + 1;
  const { data: version, error: vErr } = await supabase
    .from("article_versions")
    .insert({
      article_id: article.id,
      version_number: versionNumber,
      title,
      abstract: null,
      markdown_body: "",
      workflow_status: "draft",
      created_by: userId,
    })
    .select("id")
    .single();
  if (vErr || !version) return { ok: false as const, message: vErr?.message ?? "Could not create article version." };

  await supabase.from("articles").update({ current_version_id: version.id }).eq("id", article.id);
  await supabase.from("article_workflow_events").insert({
    article_id: article.id,
    version_id: version.id,
    actor_user_id: userId,
    event_type: "draft_created",
  });

  revalidatePath("/admin/articles");
  revalidatePath("/editor/articles");
  return { ok: true as const, articleId: article.id, versionId: version.id };
}

export async function saveArticleVersionAction(input: {
  articleId: string;
  versionId: string;
  title: string;
  abstract: string;
  doi: string;
  keywordsCsv: string;
  markdownBody: string;
  issueId?: string | null;
  acknowledgement?: string;
  competingInterests?: string;
  references?: ArticleReferenceRow[];
}) {
  const auth = await requireEditorAccess();
  if (!auth.ok) return auth;
  const { supabase } = auth;

  const title = input.title.trim();
  if (!title) return { ok: false as const, message: "Title is required." };
  const keywords = input.keywordsCsv
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const { data: verRow } = await supabase
    .from("article_versions")
    .select("extra_metadata")
    .eq("id", input.versionId)
    .eq("article_id", input.articleId)
    .maybeSingle();
  const prevMeta = parseArticleExtraMetadata(verRow?.extra_metadata);
  const extraMeta: ArticleExtraMetadata = {
    acknowledgement:
      input.acknowledgement !== undefined ? input.acknowledgement.trim() || undefined : prevMeta.acknowledgement,
    competing_interests:
      input.competingInterests !== undefined ? input.competingInterests.trim() || undefined : prevMeta.competing_interests,
    references: input.references !== undefined ? input.references : prevMeta.references,
  };

  const { error: vErr } = await supabase
    .from("article_versions")
    .update({
      title,
      abstract: input.abstract.trim() || null,
      markdown_body: input.markdownBody,
      extra_metadata: extraMeta,
    })
    .eq("id", input.versionId)
    .eq("article_id", input.articleId);
  if (vErr) return { ok: false as const, message: vErr.message };

  const { error: aErr } = await supabase
    .from("articles")
    .update({
      title,
      doi: input.doi.trim() || null,
      abstract: input.abstract.trim() || null,
      keywords,
      issue_id: input.issueId || null,
      current_version_id: input.versionId,
    })
    .eq("id", input.articleId);
  if (aErr) return { ok: false as const, message: aErr.message };

  revalidatePath(`/admin/articles/${input.articleId}`);
  revalidatePath(`/editor/articles/${input.articleId}`);
  revalidatePath(`/j/[journalSlug]/article/[articleSlug]`, "page");
  return { ok: true as const, message: "Article saved." };
}

export async function uploadArticleAssetAction(input: {
  articleId: string;
  versionId: string;
  assetKey: string;
  assetType: "figure" | "table";
  caption: string;
  altText: string;
  tableMarkdown: string;
  storagePath: string | null;
  sortOrder: number;
}) {
  const auth = await requireEditorAccess();
  if (!auth.ok) return auth;
  const { supabase } = auth;

  const key = input.assetKey.trim();
  if (!key) return { ok: false as const, message: "Asset key is required." };
  if (input.assetType === "figure" && !input.storagePath) {
    return { ok: false as const, message: "Figure requires an uploaded file." };
  }
  if (input.assetType === "table" && !input.tableMarkdown.trim()) {
    return { ok: false as const, message: "Table requires markdown content." };
  }

  const { data: row, error } = await supabase
    .from("article_assets")
    .upsert(
      {
        article_id: input.articleId,
        version_id: input.versionId,
        asset_key: key,
        asset_type: input.assetType,
        caption: input.caption.trim() || null,
        alt_text: input.altText.trim() || null,
        table_markdown: input.assetType === "table" ? input.tableMarkdown : null,
        storage_path: input.assetType === "figure" ? input.storagePath : null,
        sort_order: input.sortOrder,
      },
      { onConflict: "version_id,asset_key" },
    )
    .select("id")
    .single();
  if (error) return { ok: false as const, message: error.message };

  revalidatePath(`/admin/articles/${input.articleId}`);
  revalidatePath(`/editor/articles/${input.articleId}`);
  return { ok: true as const, assetId: row?.id };
}

export async function removeArticleAssetAction(input: { assetId: string }): Promise<ActionResult> {
  const auth = await requireEditorAccess();
  if (!auth.ok) return auth;
  const { supabase } = auth;

  const { data: asset } = await supabase
    .from("article_assets")
    .select("id, article_id, storage_path")
    .eq("id", input.assetId)
    .single();
  if (!asset) return { ok: false, message: "Asset not found." };

  if (asset.storage_path) {
    const { error: storageErr } = await supabase.storage.from("data").remove([asset.storage_path]);
    if (storageErr) return { ok: false, message: storageErr.message };
  }

  const { error } = await supabase.from("article_assets").delete().eq("id", input.assetId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/admin/articles/${asset.article_id}`);
  revalidatePath(`/editor/articles/${asset.article_id}`);
  return { ok: true, message: "Asset removed." };
}

async function setWorkflowStatus(input: {
  articleId: string;
  versionId: string;
  nextStatus: "in_review" | "approved" | "published" | "draft";
  eventType: string;
  note?: string;
}) {
  const auth = await requireEditorAccess();
  if (!auth.ok) return auth;
  const { supabase, userId } = auth;

  const { data: current } = await supabase
    .from("article_versions")
    .select("workflow_status")
    .eq("id", input.versionId)
    .eq("article_id", input.articleId)
    .single();
  if (!current) return { ok: false as const, message: "Article version not found." };

  try {
    assertWorkflowTransition(current.workflow_status, input.nextStatus);
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Invalid workflow transition." };
  }

  const { error: vErr } = await supabase
    .from("article_versions")
    .update({ workflow_status: input.nextStatus })
    .eq("id", input.versionId)
    .eq("article_id", input.articleId);
  if (vErr) return { ok: false as const, message: vErr.message };

  const articlePatch: Record<string, unknown> = { current_version_id: input.versionId };
  if (input.nextStatus === "published") {
    articlePatch.status = "published";
    articlePatch.published_at = new Date().toISOString();
  } else {
    articlePatch.status = "ahead_of_issue";
    if (input.nextStatus === "draft" || input.nextStatus === "approved") articlePatch.published_at = null;
  }

  const { error: aErr } = await supabase.from("articles").update(articlePatch).eq("id", input.articleId);
  if (aErr) return { ok: false as const, message: aErr.message };

  await supabase.from("article_workflow_events").insert({
    article_id: input.articleId,
    version_id: input.versionId,
    actor_user_id: userId,
    event_type: input.eventType,
    note: input.note ?? null,
  });

  revalidatePath(`/admin/articles/${input.articleId}`);
  revalidatePath(`/editor/articles/${input.articleId}`);
  if (input.nextStatus === "published") {
    const { data: a } = await supabase.from("articles").select("slug, journal_id").eq("id", input.articleId).maybeSingle();
    if (a?.slug && a.journal_id) {
      const { data: j } = await supabase.from("journals").select("slug").eq("id", a.journal_id).maybeSingle();
      if (j?.slug) revalidatePath(`/j/${j.slug}/article/${a.slug}`);
    }
  }
  revalidatePath("/latest-research");
  return { ok: true as const, message: "Workflow updated." };
}

export async function submitArticleForReviewAction(input: { articleId: string; versionId: string; note?: string }) {
  return setWorkflowStatus({
    articleId: input.articleId,
    versionId: input.versionId,
    nextStatus: "in_review",
    eventType: "submitted_for_review",
    note: input.note,
  });
}

export async function approveArticleVersionAction(input: { articleId: string; versionId: string; note?: string }) {
  return setWorkflowStatus({
    articleId: input.articleId,
    versionId: input.versionId,
    nextStatus: "approved",
    eventType: "approved",
    note: input.note,
  });
}

export async function publishArticleVersionAction(input: { articleId: string; versionId: string; note?: string }) {
  return setWorkflowStatus({
    articleId: input.articleId,
    versionId: input.versionId,
    nextStatus: "published",
    eventType: "published",
    note: input.note,
  });
}

export async function unpublishArticleAction(input: { articleId: string; versionId: string; note?: string }) {
  return setWorkflowStatus({
    articleId: input.articleId,
    versionId: input.versionId,
    nextStatus: "approved",
    eventType: "unpublished",
    note: input.note,
  });
}

/** Staff download for manuscript files linked to a submission (editor / admin). */
export async function createSubmissionFileStaffDownloadAction(input: {
  submissionId: string;
  storagePath: string;
}): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const auth = await requireEditorAccess();
  if (!auth.ok) return { ok: false, message: auth.message };
  const { supabase } = auth;

  const normalized = input.storagePath.replace(/^\/+/, "");
  const prefix = `submissions/${input.submissionId}/`;
  if (!normalized.startsWith(prefix)) {
    return { ok: false, message: "Invalid file path for this submission." };
  }

  const { data: row } = await supabase
    .from("submission_files")
    .select("id")
    .eq("submission_id", input.submissionId)
    .eq("storage_path", normalized)
    .maybeSingle();
  if (!row) return { ok: false, message: "File not found." };

  const { data, error } = await supabase.storage.from("data").createSignedUrl(normalized, 900);
  if (error || !data?.signedUrl) {
    return { ok: false, message: error?.message ?? "Could not create download link." };
  }
  return { ok: true, url: data.signedUrl };
}
