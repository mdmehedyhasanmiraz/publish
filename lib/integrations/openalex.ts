const OPENALEX_BASE = "https://api.openalex.org";

export async function lookupOpenAlexWork(title: string) {
  if (process.env.OPENALEX_ENABLED !== "true") {
    return { source: "stub", title, candidates: [] };
  }

  const url = `${OPENALEX_BASE}/works?search=${encodeURIComponent(title)}&per-page=3`;
  const response = await fetch(url, { headers: { "User-Agent": "PublisherOS/0.1" } });
  if (!response.ok) throw new Error(`OpenAlex request failed: ${response.status}`);
  const data = (await response.json()) as { results?: Array<{ id: string; display_name: string }> };
  return {
    source: "openalex",
    title,
    candidates: (data.results ?? []).map((item) => ({ id: item.id, title: item.display_name })),
  };
}
