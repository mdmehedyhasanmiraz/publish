import { NextResponse } from "next/server";
import { lookupOpenAlexWork } from "@/lib/integrations/openalex";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get("title");
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  return NextResponse.json(await lookupOpenAlexWork(title));
}
