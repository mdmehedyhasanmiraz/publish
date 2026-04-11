import { createClient } from "@/lib/supabase/server";
import { requireArticleEditorAccess } from "@/lib/articles/require-article-editor-access";
import { importArticleReferencesFromDocxBuffer } from "@/lib/manuscript/import-article-references-from-submission";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const auth = await requireArticleEditorAccess(supabase);
  if (!auth.ok) {
    return Response.json({ ok: false as const, message: auth.message }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ ok: false as const, message: "Expected multipart form data." }, { status: 400 });
  }

  const articleId = typeof form.get("articleId") === "string" ? (form.get("articleId") as string).trim() : "";
  const file = form.get("file");
  if (!articleId) {
    return Response.json({ ok: false as const, message: "articleId is required." }, { status: 400 });
  }

  const { data: articleRow } = await supabase.from("articles").select("id").eq("id", articleId).maybeSingle();
  if (!articleRow?.id) {
    return Response.json({ ok: false as const, message: "Article not found." }, { status: 404 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ ok: false as const, message: "A non-empty .docx file is required." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  const isDocx =
    name.endsWith(".docx") ||
    mime.includes("wordprocessingml") ||
    mime.includes("officedocument.wordprocessingml");
  if (!isDocx) {
    return Response.json({ ok: false as const, message: "Upload a Word .docx file." }, { status: 400 });
  }

  const buf = await file.arrayBuffer();
  const result = await importArticleReferencesFromDocxBuffer(buf);
  if (!result.ok) {
    return Response.json({ ok: false as const, message: result.message }, { status: 400 });
  }
  return Response.json({
    ok: true as const,
    references: result.references,
    warnings: result.warnings,
  });
}
