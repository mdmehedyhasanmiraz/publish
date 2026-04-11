import { canAccessAdminRoutes, rolesFromProfile } from "@/lib/auth/portal-access";
import { createClient } from "@/lib/supabase/server";
import { saveJournalFromFormData } from "@/lib/journals/save-journal";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role, roles").eq("user_id", user.id).maybeSingle();
  if (!canAccessAdminRoutes(rolesFromProfile(profile))) {
    return NextResponse.json({ ok: false, message: "Admins only." }, { status: 403 });
  }

  const formData = await req.formData();
  const result = await saveJournalFromFormData(formData);
  const status = result.ok ? 200 : 400;
  return NextResponse.json(result, { status });
}
