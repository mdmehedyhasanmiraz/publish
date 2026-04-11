import { extractSubmissionManuscriptMetadata } from "@/lib/submissions/extract-submission-manuscript-metadata";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 401 });
  }

  let body: { submissionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const submissionId = String(body.submissionId ?? "").trim();
  if (!submissionId) {
    return NextResponse.json({ ok: false, message: "Missing submission id." }, { status: 400 });
  }

  const result = await extractSubmissionManuscriptMetadata(supabase, user.id, submissionId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
