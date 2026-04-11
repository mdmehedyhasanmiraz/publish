import { removeSubmissionFile } from "@/lib/submissions/remove-submission-file";
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

  let body: { fileId?: string; storagePath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const fileId = String(body.fileId ?? "").trim();
  const storagePath = String(body.storagePath ?? "").trim();
  if (!fileId || !storagePath) {
    return NextResponse.json({ ok: false, message: "Missing file id or path." }, { status: 400 });
  }

  const result = await removeSubmissionFile(supabase, user.id, { fileId, storagePath });
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  try {
    if (result.submissionId) {
      revalidatePath(`/author/submissions/${result.submissionId}`);
    }
    revalidatePath("/author/submissions/new");
  } catch {
    /* ignore */
  }

  return NextResponse.json(result);
}
