import { saveWizardStep4Details } from "@/lib/submissions/save-wizard-step4-details";
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
    title?: string;
    abstract?: string;
    supplementaryDataLink?: string;
    submissionNotes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const submissionId = String(body.submissionId ?? "").trim();
  if (!submissionId) {
    return NextResponse.json({ ok: false, message: "Missing submission id." }, { status: 400 });
  }

  const result = await saveWizardStep4Details(supabase, user.id, {
    submissionId,
    title: String(body.title ?? ""),
    abstract: String(body.abstract ?? ""),
    supplementaryDataLink: String(body.supplementaryDataLink ?? ""),
    submissionNotes: String(body.submissionNotes ?? ""),
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
