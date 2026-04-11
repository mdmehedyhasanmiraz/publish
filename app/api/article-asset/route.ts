import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("data").createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not create signed URL" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}

