import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const title = url.searchParams.get("title");
  if (!title) return new Response(JSON.stringify({ error: "title is required" }), { status: 400 });

  const upstream = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(title)}&per-page=1`);
  const data = await upstream.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  await supabase.from("audit_logs").insert({
    actor_user_id: crypto.randomUUID(),
    entity_type: "openalex_enrichment",
    entity_id: crypto.randomUUID(),
    action: "lookup",
    payload: { title },
  });

  return new Response(JSON.stringify({ data }), {
    headers: { "content-type": "application/json" },
  });
});
