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

    const { email, role, bless_event_id } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants : email, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role !== "admin" && role !== "organizer") {
      return new Response(
        JSON.stringify({ error: "role doit être 'admin' ou 'organizer'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role === "organizer" && !bless_event_id) {
      return new Response(
        JSON.stringify({ error: "bless_event_id requis pour le rôle organizer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = Deno.env.get("VOEUX_BASE_URL") ?? "https://moment-events.vercel.app";

    // Pour l'organisateur : vérifier que son événement existe AVANT de toucher au compte
    if (role === "organizer") {
      const { data: event } = await supabase
        .from("events")
        .select("id")
        .eq("bless_event_id", bless_event_id)
        .maybeSingle();

      if (!event) {
        return new Response(
          JSON.stringify({ error: "Événement non trouvé. Appelez d'abord provision-bless-event." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // app_metadata cible : le lien vers l'événement est stocké sur le compte, pas déduit
    // par correspondance d'email avec owner_id (source d'incohérences si les emails diffèrent
    // entre provision-bless-event et sso-token).
    const targetAppMetadata =
      role === "organizer" ? { bless_role: role, bless_event_id } : { bless_role: role, bless_event_id: null };

    // Trouver ou créer l'utilisateur dans Voeux Festifs
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = users?.find((u) => u.email === email);

    if (existingUser) {
      // Toujours resynchroniser le rôle + l'événement lié, pas seulement si le rôle a changé
      await supabase.auth.admin.updateUserById(existingUser.id, {
        app_metadata: { ...existingUser.app_metadata, ...targetAppMetadata },
      });
    } else {
      // Créer le compte avec le bon rôle
      const { error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID(),
        app_metadata: targetAppMetadata,
      });
      if (createErr) throw createErr;
    }

    // Générer le magic link — toujours vers /dashboard
    const redirectTo = `${baseUrl}/dashboard`;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (error || !data.properties?.action_link) {
      throw error ?? new Error("Génération du magic link échouée");
    }

    return new Response(JSON.stringify({
      magic_link_url: data.properties.action_link,
      redirect_to: redirectTo,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
