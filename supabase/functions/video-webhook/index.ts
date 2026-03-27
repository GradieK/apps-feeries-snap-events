import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("Webhook Shotstack RAW:", JSON.stringify(body));

    // CORRECTION ICI
    const renderId = body?.id;
    const status   = body?.status;
    const url      = body?.url; // parfois absent si failed

    if (!renderId) {
      console.error("renderId manquant");
      return new Response("Bad Request", { status: 400 });
    }

    console.log(`Render ${renderId} → status: ${status}`);

    if (status === "done") {
      await supabase
        .from("generation_jobs")
        .update({
          status: "done",
          output_url: url ?? null,
          updated_at: new Date().toISOString()
        })
        .eq("provider_id", renderId);

      console.log("DONE");

    } else if (status === "failed") {
      await supabase
        .from("generation_jobs")
        .update({
          status: "error",
          error_message: "Shotstack failed (media ou format invalide)",
          updated_at: new Date().toISOString()
        })
        .eq("provider_id", renderId);

      console.log("FAILED");
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});