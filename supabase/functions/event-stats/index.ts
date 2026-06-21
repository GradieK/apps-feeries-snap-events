// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  const secret = authHeader?.replace("Bearer ", "") ?? "";
  if (!secret || secret !== Deno.env.get("BLESS_SHARED_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const blessEventId = url.searchParams.get("bless_event_id");

    if (!blessEventId) {
      return new Response(JSON.stringify({ error: "Paramètre requis : bless_event_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: event } = await supabase
      .from("events")
      .select("id, slug")
      .eq("bless_event_id", blessEventId)
      .maybeSingle();

    // Retourner des zéros si l'événement n'est pas encore provisionné
    if (!event) {
      return new Response(JSON.stringify({ total: 0, by_type: {}, last_wish_at: null, provisioned: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: wishes } = await supabase
      .from("wishes")
      .select("type, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false });

    const total = wishes?.length ?? 0;
    const by_type = (wishes ?? []).reduce<Record<string, number>>((acc, w) => {
      acc[w.type] = (acc[w.type] ?? 0) + 1;
      return acc;
    }, {});
    const last_wish_at = wishes?.[0]?.created_at ?? null;
    const baseUrl = Deno.env.get("VOEUX_BASE_URL") ?? "https://moment-events.vercel.app";

    return new Response(JSON.stringify({
      total,
      by_type,
      last_wish_at,
      slug: event.slug,
      provisioned: true,
      admin_url: `${baseUrl}/${event.slug}/admin`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
