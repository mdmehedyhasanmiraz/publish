import { resubmitRevisedManuscript } from "@/lib/submissions/resubmit-revised-manuscript";
import { submitSubmissionForReview } from "@/lib/submissions/submit-submission-for-review";
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

  const { data: row } = await supabase
    .from("submissions")
    .select("status")
    .eq("id", submissionId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  const status = row?.status as string | undefined;
  const result =
    status === "revision_requested"
      ? await resubmitRevisedManuscript(supabase, user.id, submissionId)
      : await submitSubmissionForReview(supabase, user.id, submissionId);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  try {
    revalidatePath("/author/submissions");
    revalidatePath("/author/revision-required");
    revalidatePath(`/author/submissions/${submissionId}`);
  } catch {
    /* ignore */
  }

  return NextResponse.json(result);
}
