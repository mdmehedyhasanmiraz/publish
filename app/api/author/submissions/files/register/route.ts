import { registerSubmissionFile } from "@/lib/submissions/register-submission-file";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 401 });
  }

  let body: {
    submissionId?: string;
    submissionVersionId?: string;
    fileKind?: string;
    storagePath?: string;
    mimeType?: string | null;
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const submissionId = String(body.submissionId ?? "").trim();
  const submissionVersionId = String(body.submissionVersionId ?? "").trim();
  const fileKind = String(body.fileKind ?? "").trim();
  const storagePath = String(body.storagePath ?? "").trim();
  if (!submissionId || !submissionVersionId || !fileKind || !storagePath) {
    return NextResponse.json({ ok: false, message: "Missing required fields." }, { status: 400 });
  }

  const result = await registerSubmissionFile(supabase, user.id, {
    submissionId,
    submissionVersionId,
    fileKind,
    storagePath,
    mimeType: body.mimeType ?? null,
    description: body.description,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  try {
    revalidatePath(`/author/submissions/${submissionId}`);
    revalidatePath("/author/submissions/new");
  } catch {
    /* ignore */
  }

  return NextResponse.json(result);
}
