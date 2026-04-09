import { NextResponse } from "next/server";
import {
  assignEditor,
  createSubmissionDraft,
  publishArticle,
  requestRevision,
  submitSubmission,
} from "@/lib/workflows/transitions";

type RouteContext = { params: Promise<{ action: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { action } = await context.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    switch (action) {
      case "create-draft":
        return NextResponse.json(await createSubmissionDraft(body as never));
      case "submit":
        return NextResponse.json(await submitSubmission(body as never));
      case "assign-editor":
        return NextResponse.json(await assignEditor(body as never));
      case "request-revision":
        return NextResponse.json(await requestRevision(body as never));
      case "publish-article":
        return NextResponse.json(await publishArticle(body as never));
      default:
        return NextResponse.json({ error: "Unknown workflow action" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
