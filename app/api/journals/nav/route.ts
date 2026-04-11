import { NextResponse } from "next/server";
import { getLatestJournalsForNav } from "@/lib/db/journals";
import { publicCoverUrl } from "@/lib/storage/covers";

export async function GET() {
  try {
    const rows = await getLatestJournalsForNav(6);
    const journals = rows.map((j) => ({
      id: j.id,
      name: j.name,
      slug: j.slug,
      coverSrc: publicCoverUrl(j.cover_image_path),
    }));
    return NextResponse.json({ journals });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load journals.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
