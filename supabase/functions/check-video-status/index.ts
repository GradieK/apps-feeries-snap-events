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

    const { jobId } = await req.json();

    // Récupère le job
    const { data: job } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!job || !job.provider_id) {
      return new Response(JSON.stringify({ error: "Job introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Interroge Shotstack sur le statut du rendu
    const env = Deno.env.get("SHOTSTACK_ENVIRONMENT") ?? "stage";
    const res = await fetch(
      `https://api.shotstack.io/${env}/render/${job.provider_id}`,
      {
        headers: { "x-api-key": Deno.env.get("SHOTSTACK_API_KEY")! }
      }
    );

    const data = await res.json();
    console.log("Shotstack status check:", JSON.stringify(data));

    const renderStatus = data?.response?.status;
    const outputUrl = data?.response?.url;

    // Met à jour la base selon le statut Shotstack
    if (renderStatus === "done" && outputUrl) {
      await supabase
        .from("generation_jobs")
        .update({ status: "done", output_url: outputUrl })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({ status: "done", output_url: outputUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (renderStatus === "failed") {
      await supabase
        .from("generation_jobs")
        .update({ status: "error", error_message: "Shotstack render failed" })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({ status: "error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Encore en cours
    return new Response(
      JSON.stringify({ status: "processing", shotstack_status: renderStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});