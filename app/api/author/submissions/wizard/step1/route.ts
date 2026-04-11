import { saveWizardStep1 } from "@/lib/submissions/save-wizard-step1";
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
    submissionId?: string | null;
    journalId?: string;
    title?: string;
    abstract?: string;
    area?: string;
    submissionType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const result = await saveWizardStep1(supabase, user.id, {
    submissionId: body.submissionId,
    journalId: String(body.journalId ?? ""),
    title: String(body.title ?? ""),
    abstract: String(body.abstract ?? ""),
    area: String(body.area ?? ""),
    submissionType: String(body.submissionType ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  try {
    revalidatePath("/author/submissions");
    revalidatePath("/author/submissions/new");
    revalidatePath(`/author/submissions/${result.submissionId}`);
  } catch {
    /* ignore */
  }

  return NextResponse.json(result);
}
