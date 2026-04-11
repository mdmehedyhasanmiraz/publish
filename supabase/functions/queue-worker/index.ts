import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  await supabase.from("audit_logs").insert({
    actor_user_id: crypto.randomUUID(),
    entity_type: "queue_worker",
    entity_id: crypto.randomUUID(),
    action: "heartbeat",
    payload: { message: "queue worker executed" },
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});
