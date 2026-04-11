import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ARTICLE_VERSION_ROW_SELECT,
  ArticleVersionRow,
  ensureArticleHasEditVersion,
} from "@/lib/articles/ensure-article-edit-version";
import { requireArticleEditorAccess } from "@/lib/articles/require-article-editor-access";
import { ArticleEditorForm } from "@/components/articles/article-editor-form";
import { loadSubmissionFilesForEditor } from "@/lib/articles/load-submission-files-for-editor";
import { parseArticleExtraMetadata } from "@/lib/articles/extra-metadata";

export const dynamic = "force-dynamic";

export default async function AdminArticleEditPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const supabase = await createClient();

  const access = await requireArticleEditorAccess(supabase);
  if (!access.ok) {
    if (access.message === "Not signed in.") redirect("/auth/login");
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-destructive">{access.message}</p>
      </div>
    );
  }

  const { data: article, error: articleErr } = await supabase
    .from("articles")
    .select(
      "id, title, slug, doi, abstract, keywords, issue_id, current_version_id, submission_id, status, published_at, manuscript_reference_code, journals(slug, name)",
    )
    .eq("id", articleId)
    .maybeSingle();

  if (articleErr || !article) notFound();

  const submissionId = (article.submission_id as string | null | undefined) ?? null;
  const journal = Array.isArray(article.journals) ? article.journals[0] : article.journals;
  const journalSlug = (journal as { slug?: string } | null)?.slug ?? null;

  const submissionFiles = submissionId ? await loadSubmissionFilesForEditor(supabase, submissionId) : [];

  let versionId: string | null = (article.current_version_id as string | null) ?? null;

  let version: ArticleVersionRow | null = null;

  if (versionId) {
    const { data: byId } = await supabase
      .from("article_versions")
      .select(ARTICLE_VERSION_ROW_SELECT)
      .eq("id", versionId)
      .maybeSingle();
    if (byId && (byId as { article_id: string }).article_id === articleId) {
      version = byId as ArticleVersionRow;
    }
  }

  if (!version) {
    const { data: latest } = await supabase
      .from("article_versions")
      .select(ARTICLE_VERSION_ROW_SELECT)
      .eq("article_id", articleId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest && (latest as { article_id: string }).article_id === articleId) {
      version = latest as ArticleVersionRow;
      versionId = version.id;
    }
  }

  if (!version) {
    const ensured = await ensureArticleHasEditVersion(supabase, access.userId, articleId);
    if (!ensured.ok) {
      return (
        <div className="mx-auto max-w-2xl p-6">
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/articles" className="text-primary hover:underline">
              ← Articles
            </Link>
          </p>
          <h1 className="mt-4 text-xl font-semibold">Could not open article editor</h1>
          <p className="mt-2 text-sm text-muted-foreground">{ensured.message}</p>
        </div>
      );
    }
    version = ensured.version;
  }

  if (!version) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/articles" className="text-primary hover:underline">
            ← Articles
          </Link>
        </p>
        <h1 className="mt-4 text-xl font-semibold">Article version missing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Could not load the article version after setup. Refresh the page or return to the articles list.
        </p>
      </div>
    );
  }

  const [{ data: assets }, { data: issues }] = await Promise.all([
    supabase
      .from("article_assets")
      .select("id, asset_key, asset_type, caption, alt_text, table_markdown, storage_path, sort_order")
      .eq("article_id", articleId)
      .eq("version_id", version.id)
      .order("sort_order", { ascending: true }),
    supabase.from("issues").select("id, issue_slug, volumes(volume_slug)").order("issue_slug", { ascending: false }),
  ]);

  const extra = parseArticleExtraMetadata(version.extra_metadata);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-4">
      <ArticleEditorForm
        articleId={article.id}
        versionId={version.id}
        initialTitle={(version.title as string) || (article.title as string)}
        initialAbstract={((version.abstract as string | null) ?? (article.abstract as string | null) ?? "") as string}
        initialDoi={(article.doi as string | null) ?? ""}
        initialKeywords={(article.keywords as string[] | null) ?? []}
        initialMarkdownBody={(version.markdown_body as string) ?? ""}
        initialIssueId={(article.issue_id as string | null) ?? null}
        workflowStatus={(version.workflow_status as string) ?? "draft"}
        issueOptions={(issues ?? []) as never}
        assets={(assets ?? []) as never}
        submissionId={submissionId}
        submissionFiles={submissionFiles}
        initialAcknowledgement={extra.acknowledgement ?? ""}
        initialCompetingInterests={extra.competing_interests ?? ""}
        initialReferences={extra.references}
        editorContext="admin"
        journalSlug={journalSlug}
        articleCodeForPublic={
          (article as { manuscript_reference_code?: string | null }).manuscript_reference_code?.trim() || null
        }
        journalName={(journal as { name?: string } | null)?.name ?? null}
        submissionWorkflowHref={submissionId ? `/admin/submissions/${submissionId}` : null}
        manuscriptReferenceCode={
          (article as { manuscript_reference_code?: string | null }).manuscript_reference_code?.trim() || null
        }
      />
    </div>
  );
}
