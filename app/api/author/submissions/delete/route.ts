import { deleteDraftSubmission } from "@/lib/submissions/delete-draft-submission";
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

  const result = await deleteDraftSubmission(supabase, user.id, submissionId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  try {
    revalidatePath("/author/submissions");
    revalidatePath("/author/submissions/new");
    revalidatePath(`/author/submissions/${submissionId}`);
  } catch {
    /* ignore: route may be invalid after delete in some Next.js builds */
  }

  return NextResponse.json(result);
}
