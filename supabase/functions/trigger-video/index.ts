import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "media-wishes";
const EXCLUDED_EXT = [".jfif", ".avif", ".heic", ".heif", ".bmp", ".tiff"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // ── 1. Auth ──
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { eventId } = await req.json();

    // ── 2. Vérif propriétaire ──
    const { data: event } = await supabase
      .from("events")
      .select("id, owner_id")
      .eq("id", eventId)
      .eq("owner_id", user.id)
      .single();

    if (!event) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── 3. Récupération des médias ──
    const { data: media, error: mediaError } = await supabase
      .from("wishes")
      .select("file_url, filename, mime_type, type")
      .eq("event_id", eventId)
      .in("type", ["image", "video"])
      .order("created_at", { ascending: true })
      .limit(100);

    if (mediaError || !media || media.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun média trouvé" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Médias trouvés:", media.length);

// ── 4. FILTRE + SIGNED URL + VALIDATION ──
const MAX_DURATION_URL = 60 * 60; // 1h

const validMediaRaw = media.filter(m => {
  if (!m.file_url) return false;

  const filename = (m.filename ?? "").toLowerCase();
  const mimeType = (m.mime_type ?? "").toLowerCase();

  // formats instables
  if (EXCLUDED_EXT.some(ext => filename.endsWith(ext))) return false;

  // images SAFE uniquement
  if (m.type === "image") {
    return (
      mimeType.includes("jpeg") ||
      mimeType.includes("jpg") ||
      mimeType.includes("png") ||
      filename.endsWith(".jpg") ||
      filename.endsWith(".jpeg") ||
      filename.endsWith(".png")
    );
  }

  //  vidéos SAFE uniquement
  if (m.type === "video") {
    return (
      mimeType.includes("mp4") ||
      filename.endsWith(".mp4")
    );
  }

  return false;
});

console.log("Après filtre strict:", validMediaRaw.length);

// ── 5. SIGNED URL + VALIDATION ACCESS ──
const validMedia: any[] = [];

for (const m of validMediaRaw) {
  try {
    // extraction robuste du filePath
    let filePath = "";

    try {
      const urlObj = new URL(m.file_url);
      const parts = urlObj.pathname.split(`/${BUCKET}/`);
      filePath = parts[1]?.split("?")[0] ?? "";
    } catch {
      filePath = m.file_url.split(`/${BUCKET}/`)[1]?.split("?")[0] ?? "";
    }

    if (!filePath) {
      console.log("Path invalide:", m.file_url);
      continue;
    }

    // ✅ signed URL (clé du succès)
    const { data: signed, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(filePath, MAX_DURATION_URL);

    if (error || !signed?.signedUrl) {
      console.log("Signed URL failed:", filePath);
      continue;
    }

    const url = signed.signedUrl;

    // 🔥 TEST ACCESS RAPIDE (HEAD)
    let isAccessible = false;

    try {
      const res = await fetch(url, { method: "HEAD" });
      isAccessible = res.ok;
    } catch {
      isAccessible = false;
    }

    if (!isAccessible) {
      console.log("Inaccessible media:", url);
      continue;
    }

    validMedia.push({
      ...m,
      publicUrl: url
    });

  } catch (e) {
    console.log("Media skipped:", e.message);
  }
}

console.log("Médias validés final:", validMedia.length);

if (validMedia.length === 0) {
  return new Response(JSON.stringify({
    error: "Aucun média exploitable après validation"
  }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// ── 6. SÉLECTION INTELLIGENTE ──
const MAX_CLIPS = 30;

const videoMedia = validMedia
  .filter(m => m.type === "video")
  .slice(0, 5);

const imageMedia = validMedia
  .filter(m => m.type === "image")
  .slice(0, MAX_CLIPS - videoMedia.length);

const selectedMedia = [...videoMedia, ...imageMedia];

console.log(`Sélection finale: ${selectedMedia.length} clips`);

// ── 7. CONSTRUCTION CLIPS ROBUSTE ──
let currentTime = 0;

const clips = selectedMedia.map((m, i) => {
  const isVideo = m.type === "video";

  const duration = isVideo ? 5 : 3;

  const clip = {
    asset: {
      type: isVideo ? "video" : "image",
      src: m.publicUrl,
      ...(isVideo ? { trim: 0, volume: 0 } : {})
    },
    start: currentTime,
    length: duration,
    effect: i % 2 === 0 ? "zoomIn" : "zoomOut",
    transition: { in: "fade", out: "fade" }
  };

  currentTime += duration;

  return clip;
});

    // ── 7. Envoi à Shotstack ──
    const shotstackPayload = {
      timeline: {
        soundtrack: {
          src: "https://shotstack-assets.s3.amazonaws.com/music/unminus/ambisonic.mp3",
          effect: "fadeOut",
        },
        tracks: [{ clips }],
      },
      output: { format: "mp4", resolution: "hd", fps: 25 },
      callback: `${SUPABASE_URL}/functions/v1/video-webhook`,
    };

    const env = Deno.env.get("SHOTSTACK_ENVIRONMENT") ?? "stage";
    console.log("Envoi à Shotstack:", env);

    const shotstackRes = await fetch(`https://api.shotstack.io/${env}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("SHOTSTACK_API_KEY")!,
      },
      body: JSON.stringify(shotstackPayload),
    });

    const shotstackData = await shotstackRes.json();
    console.log("Shotstack status:", shotstackRes.status);
    console.log("Shotstack body:", JSON.stringify(shotstackData));

    if (!shotstackRes.ok) throw new Error(`Shotstack: ${JSON.stringify(shotstackData)}`);

    const renderId = shotstackData?.response?.id;
    if (!renderId) throw new Error("Pas d'ID retourné par Shotstack");

    // ── 8. Enregistre le job ──
    const { data: job } = await supabase
      .from("generation_jobs")
      .insert({
        event_id: eventId,
        type: "video",
        status: "processing",
        provider_id: renderId,
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ jobId: job.id, renderId, status: "processing" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erreur trigger-video:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});