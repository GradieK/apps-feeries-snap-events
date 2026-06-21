// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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

    const { bless_event_id, event_name, client_name, event_date, owner_email } = await req.json();

    if (!bless_event_id || !event_name || !owner_email) {
      return new Response(JSON.stringify({ error: "Champs requis manquants : bless_event_id, event_name, owner_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = Deno.env.get("VOEUX_BASE_URL") ?? "https://moment-events.vercel.app";

    // Idempotence : l'événement existe déjà ?
    const { data: existing } = await supabase
      .from("events")
      .select("id, slug")
      .eq("bless_event_id", bless_event_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({
        slug: existing.slug,
        guest_url: `${baseUrl}/${existing.slug}/voeux`,
        admin_url: `${baseUrl}/${existing.slug}/admin`,
        voeux_event_id: existing.id,
        already_exists: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Trouver ou créer l'utilisateur admin dans Voeux Festifs
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = users?.find((u) => u.email === owner_email);
    let ownerId: string;

    if (existingUser) {
      ownerId = existingUser.id;
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: owner_email,
        email_confirm: true,
        password: crypto.randomUUID(), // SSO via magic link uniquement
      });
      if (createErr || !newUser.user) throw createErr ?? new Error("Échec création utilisateur");
      ownerId = newUser.user.id;
    }

    // Générer un slug unique
    let baseSlug = generateSlug(event_name);
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const { data: conflict } = await supabase
        .from("events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!conflict) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Créer l'événement
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .insert({
        name: event_name,
        client_name: client_name ?? event_name,
        event_date: event_date ?? null,
        slug,
        owner_id: ownerId,
        status: "published",
        bless_event_id,
        source: "bless_events",
      })
      .select("id, slug")
      .single();

    if (eventErr || !event) throw eventErr ?? new Error("Échec création événement");

    return new Response(JSON.stringify({
      slug: event.slug,
      guest_url: `${baseUrl}/${event.slug}/voeux`,
      admin_url: `${baseUrl}/${event.slug}/admin`,
      voeux_event_id: event.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
