import { NextResponse } from "next/server";
import { enqueueJob } from "@/lib/workflows/transitions";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { type?: string; data?: Record<string, unknown> };
  if (!body.type) return NextResponse.json({ error: "type is required" }, { status: 400 });
  const job = await enqueueJob({ type: body.type, data: body.data ?? {} });
  return NextResponse.json(job, { status: 201 });
}
