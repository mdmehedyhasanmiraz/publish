import { createClient } from "@/lib/supabase/server";
import { requireArticleEditorAccess } from "@/lib/articles/require-article-editor-access";
import { runImportArticleReferencesFromSubmission } from "@/lib/manuscript/import-article-references-from-submission";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let articleId: string;
  try {
    const body = (await req.json()) as { articleId?: string };
    articleId = typeof body.articleId === "string" ? body.articleId : "";
  } catch {
    return Response.json({ ok: false as const, message: "Invalid JSON." }, { status: 400 });
  }
  if (!articleId) {
    return Response.json({ ok: false as const, message: "articleId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const auth = await requireArticleEditorAccess(supabase);
  if (!auth.ok) {
    return Response.json({ ok: false as const, message: auth.message }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      };

      try {
        const result = await runImportArticleReferencesFromSubmission(supabase, articleId, (p) => {
          send({ type: "progress", percent: p.percent, message: p.message });
        });
        if (result.ok) {
          send({
            type: "result",
            ok: true,
            references: result.references,
            warnings: result.warnings,
          });
        } else {
          send({ type: "result", ok: false, message: result.message });
        }
      } catch (e) {
        send({
          type: "result",
          ok: false,
          message: e instanceof Error ? e.message : "Import failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
