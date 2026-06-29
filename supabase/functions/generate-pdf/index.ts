// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Mise en page A4 Paysage ───────────────────────────────────────────────────
const W = 842;
const H = 595;
const M = 36;

// ── Doré : toujours identique quel que soit le thème ─────────────────────────
const GOLD = rgb(0.831, 0.686, 0.216);

// ── Thèmes disponibles ────────────────────────────────────────────────────────
//    bg    = fond des pages couverture / clôture / chapitre / texte
//    panel = fond des panneaux latéraux (feature, mixed) et fonds alternatifs
//    text  = couleur du corps de texte (citations, noms)
function getTheme(id) {
  switch (id) {
    case "ivoire":
      return {
        bg:    rgb(0.980, 0.972, 0.953),   // #FAF7F2
        panel: rgb(0.937, 0.918, 0.898),   // #EFE9E5
        text:  rgb(0.10,  0.10,  0.10),    // #1A1A1A
      };
    case "marine":
      return {
        bg:    rgb(0.039, 0.086, 0.157),   // #0A1628
        panel: rgb(0.051, 0.118, 0.220),   // #0D1E38
        text:  rgb(0.980, 0.972, 0.953),   // #FAF7F2
      };
    case "bordeaux":
      return {
        bg:    rgb(0.173, 0.039, 0.039),   // #2C0A0A
        panel: rgb(0.227, 0.055, 0.055),   // #3A0E0E
        text:  rgb(0.980, 0.972, 0.953),   // #FAF7F2
      };
    default: // "noir"
      return {
        bg:    rgb(0,     0,     0),        // #000000
        panel: rgb(0.039, 0.039, 0.039),   // #0A0A0A
        text:  rgb(0.980, 0.972, 0.953),   // #FAF7F2
      };
  }
}

// ── Fonts (Cormorant Garamond via jsDelivr, fallback Times) ───────────────────
const CDN = "https://cdn.jsdelivr.net/npm/@fontsource/cormorant-garamond@5/files";
const FONT_URLS = {
  r: `${CDN}/cormorant-garamond-latin-400-normal.woff`,
  b: `${CDN}/cormorant-garamond-latin-700-normal.woff`,
  i: `${CDN}/cormorant-garamond-latin-400-italic.woff`,
};

// ── Entrée ────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const sb    = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body    = await req.json();
    const eventId = body.eventId;
    const theme   = getTheme(body.theme ?? "noir");

    const { data: event } = await sb.from("events").select("*").eq("id", eventId).single();
    const { data: raw }   = await sb.from("wishes").select("*").eq("event_id", eventId).order("created_at", { ascending: true });
    const wishes = (raw ?? []).filter(w => w.type === "image" || w.type === "text");

    const { data: job } = await sb
      .from("generation_jobs")
      .insert({ event_id: eventId, type: "pdf", status: "processing" })
      .select().single();

    generate(sb, job.id, event, wishes, theme).catch(console.error);
    return new Response(JSON.stringify({ jobId: job.id }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});

// ── Utilitaires ───────────────────────────────────────────────────────────────
async function loadFonts(doc) {
  try {
    const [rb, bb, ib] = await Promise.all([
      fetch(FONT_URLS.r).then(x => x.arrayBuffer()),
      fetch(FONT_URLS.b).then(x => x.arrayBuffer()),
      fetch(FONT_URLS.i).then(x => x.arrayBuffer()),
    ]);
    return { r: await doc.embedFont(rb), b: await doc.embedFont(bb), i: await doc.embedFont(ib) };
  } catch {
    return {
      r: await doc.embedFont("Times-Roman"),
      b: await doc.embedFont("Times-Bold"),
      i: await doc.embedFont("Times-Italic"),
    };
  }
}

function cx(text, font, size, pageW = W) {
  return (pageW - font.widthOfTextAtSize(text, size)) / 2;
}

function wrap(text, font, size, maxW) {
  const words = (text ?? "").split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function divider(page, centerX, y, half = 80) {
  page.drawLine({ start: { x: centerX - half, y }, end: { x: centerX - 10, y }, color: GOLD, thickness: 0.6 });
  page.drawLine({ start: { x: centerX + 10,   y }, end: { x: centerX + half, y }, color: GOLD, thickness: 0.6 });
  page.drawEllipse({ x: centerX, y, xScale: 3.5, yScale: 3.5, color: GOLD });
}

function border(page) {
  page.drawRectangle({ x: 20, y: 20, width: W - 40, height: H - 40, borderColor: GOLD, borderWidth: 0.4 });
  page.drawRectangle({ x: 27, y: 27, width: W - 54, height: H - 54, borderColor: GOLD, borderWidth: 1.2 });
}

function folio(page, n, f) {
  const t = `— ${n} —`;
  page.drawText(t, { x: cx(t, f.r, 9), y: 12, size: 9, font: f.r, color: GOLD });
}

async function loadImg(doc, wish) {
  const buf = await fetch(wish.file_url).then(r => r.arrayBuffer());
  return (wish.mime_type ?? "").includes("png") ? doc.embedPng(buf) : doc.embedJpg(buf);
}

// ── Template T1 : Couverture ──────────────────────────────────────────────────
function pageCover(doc, f, event, theme) {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: theme.bg });
  border(p);

  const title = "ALBUM SOUVENIR";
  p.drawText(title, { x: cx(title, f.b, 38), y: 358, size: 38, font: f.b, color: GOLD });
  divider(p, W / 2, 324);

  const couple = (event.client_name ?? event.name ?? "").toUpperCase();
  if (couple) {
    p.drawText(couple, { x: cx(couple, f.r, 22), y: 285, size: 22, font: f.r, color: theme.text });
  }

  if (event.event_date) {
    const d = new Date(event.event_date).toLocaleDateString("fr-FR", { dateStyle: "long" });
    p.drawText(d, { x: cx(d, f.i, 15), y: 250, size: 15, font: f.i, color: GOLD });
  }

  divider(p, W / 2, 216);
  const brand = "Moments Events · by Bless Events";
  p.drawText(brand, { x: cx(brand, f.r, 11), y: 48, size: 11, font: f.r, color: GOLD, opacity: 0.55 });
}

// ── Template T2 : Séparateur de chapitre (table) ──────────────────────────────
function pageChapter(doc, f, tableNum, theme) {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: theme.panel });
  border(p);
  const label = tableNum != null ? `TABLE  ${tableNum}` : "NOS INVITÉS";
  p.drawText(label, { x: cx(label, f.b, 42), y: H / 2 - 14, size: 42, font: f.b, color: GOLD });
  divider(p, W / 2, H / 2 - 38, 100);
}

// ── Template T6 : Message texte premium ───────────────────────────────────────
function pageText(doc, f, wish, n, theme) {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: theme.panel });

  const lines = wrap(`« ${wish.content ?? ""} »`, f.i, 20, W - 160);
  const blockH = lines.length * 30;
  let y = (H + blockH) / 2 - 8;
  for (const line of lines) {
    p.drawText(line, { x: cx(line, f.i, 20), y, size: 20, font: f.i, color: theme.text });
    y -= 30;
  }

  divider(p, W / 2, y - 20);

  const name = (wish.guest_name ?? "Invité").toUpperCase();
  p.drawText(name, { x: cx(name, f.b, 11), y: y - 40, size: 11, font: f.b, color: GOLD });

  if (wish.table_number) {
    const sub = `Table ${wish.table_number}`;
    p.drawText(sub, { x: cx(sub, f.i, 9), y: y - 57, size: 9, font: f.i, color: GOLD, opacity: 0.55 });
  }

  folio(p, n, f);
}

// ── Template T4 : Photo plein cadre + panneau latéral ─────────────────────────
async function pageFeature(doc, f, imgWish, txtWish, n, theme) {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: theme.bg });

  const photoZone = Math.round(W * 0.68);
  const panelX    = photoZone;
  const panelW    = W - photoZone;

  // Fond du panneau latéral dans la couleur thème
  p.drawRectangle({ x: panelX, y: 0, width: panelW, height: H, color: theme.panel });

  try {
    const im = await loadImg(doc, imgWish);
    const d  = im.scaleToFit(photoZone, H);
    p.drawImage(im, { x: (photoZone - d.width) / 2, y: (H - d.height) / 2, width: d.width, height: d.height });

    // Bande de légende en bas de la photo
    p.drawRectangle({ x: 0, y: 0, width: photoZone, height: 54, color: rgb(0, 0, 0), opacity: 0.65 });
    const gname = (imgWish.guest_name ?? "Invité").toUpperCase();
    p.drawText(gname, { x: 14, y: 34, size: 11, font: f.b, color: GOLD });
    if (imgWish.table_number) {
      p.drawText(`Table ${imgWish.table_number}`, { x: 14, y: 17, size: 9, font: f.r, color: rgb(1, 1, 1), opacity: 0.65 });
    }
  } catch (e) { console.error("Feature img:", e); }

  // Panneau droit
  if (txtWish?.content) {
    divider(p, panelX + panelW / 2, H - 80, 38);
    const ml = wrap(`« ${txtWish.content} »`, f.i, 13, panelW - 28);
    let ly = H - 106;
    for (const line of ml) {
      p.drawText(line, {
        x: panelX + (panelW - f.i.widthOfTextAtSize(line, 13)) / 2,
        y: ly, size: 13, font: f.i, color: theme.text, opacity: 0.9,
      });
      ly -= 20;
    }
    divider(p, panelX + panelW / 2, ly - 12, 38);
  } else {
    const gname = (imgWish.guest_name ?? "").toUpperCase();
    if (gname) {
      p.drawText(gname, {
        x: panelX + (panelW - f.b.widthOfTextAtSize(gname, 12)) / 2,
        y: H / 2, size: 12, font: f.b, color: GOLD,
      });
      divider(p, panelX + panelW / 2, H / 2 - 22, 38);
    }
  }

  folio(p, n, f);
}

// ── Template T3 : Duo côte à côte ─────────────────────────────────────────────
async function pageDuo(doc, f, w1, w2, n, theme) {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: theme.bg });

  const half = W / 2;
  for (const [wish, ox] of [[w1, 0], [w2, half + 2]]) {
    const slotW = half - 2;
    if (!wish?.file_url) continue;
    try {
      const im = await loadImg(doc, wish);
      const d  = im.scaleToFit(slotW, H - 56);
      p.drawImage(im, {
        x: ox + (slotW - d.width) / 2,
        y: 28 + (H - 56 - d.height) / 2,
        width: d.width, height: d.height,
      });

      // Bande de légende
      p.drawRectangle({ x: ox, y: 0, width: slotW, height: 50, color: rgb(0, 0, 0), opacity: 0.72 });
      const name = (wish.guest_name ?? "Invité").toUpperCase();
      p.drawText(name, { x: ox + 10, y: 32, size: 10, font: f.b, color: GOLD });

      if (wish.content) {
        const firstLine = wrap(wish.content, f.i, 8.5, slotW - 20)[0] ?? "";
        const truncated = firstLine.length < (wish.content?.length ?? 0);
        p.drawText(`« ${firstLine}${truncated ? "…" : ""} »`, {
          x: ox + 10, y: 14, size: 8.5, font: f.i, color: rgb(1, 1, 1), opacity: 0.78,
        });
      } else if (wish.table_number) {
        p.drawText(`Table ${wish.table_number}`, { x: ox + 10, y: 14, size: 8.5, font: f.i, color: GOLD, opacity: 0.55 });
      }
    } catch (e) { console.error("Duo img:", e); }
  }

  p.drawLine({ start: { x: half, y: 0 }, end: { x: half, y: H }, color: rgb(0, 0, 0), thickness: 4 });
  folio(p, n, f);
}

// ── Template T7 : Mixte (photo gauche + message droite) ───────────────────────
async function pageMixed(doc, f, imgWish, txtWish, n, theme) {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: theme.bg });

  const photoZone = Math.round(W * 0.52);
  p.drawRectangle({ x: photoZone, y: 0, width: W - photoZone, height: H, color: theme.panel });

  try {
    const im = await loadImg(doc, imgWish);
    const d  = im.scaleToFit(photoZone, H);
    p.drawImage(im, { x: (photoZone - d.width) / 2, y: (H - d.height) / 2, width: d.width, height: d.height });
  } catch (e) { console.error("Mixed img:", e); }

  // Séparateur vertical doré
  p.drawLine({ start: { x: photoZone, y: M }, end: { x: photoZone, y: H - M }, color: GOLD, thickness: 0.5 });

  const rx = photoZone + 28;
  const rw = W - photoZone - 56;

  const name = (txtWish.guest_name ?? imgWish.guest_name ?? "Invité").toUpperCase();
  p.drawText(name, { x: rx + (rw - f.b.widthOfTextAtSize(name, 12)) / 2, y: H - 72, size: 12, font: f.b, color: GOLD });

  const tableNo = txtWish.table_number ?? imgWish.table_number;
  if (tableNo) {
    const sub = `Table ${tableNo}`;
    p.drawText(sub, { x: rx + (rw - f.i.widthOfTextAtSize(sub, 9)) / 2, y: H - 90, size: 9, font: f.i, color: GOLD, opacity: 0.5 });
  }

  divider(p, rx + rw / 2, H - 110, 48);

  const msgLines = wrap(`« ${txtWish.content ?? ""} »`, f.i, 14, rw);
  let ly = H - 138;
  for (const line of msgLines) {
    p.drawText(line, { x: rx + (rw - f.i.widthOfTextAtSize(line, 14)) / 2, y: ly, size: 14, font: f.i, color: theme.text });
    ly -= 22;
  }

  folio(p, n, f);
}

// ── Template T8 : Clôture ─────────────────────────────────────────────────────
function pageClose(doc, f, event, theme) {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: theme.bg });
  border(p);

  const l1 = "Chaque instant capturé ici";
  const l2 = "est un fragment d'éternité.";
  p.drawText(l1, { x: cx(l1, f.i, 22), y: 346, size: 22, font: f.i, color: theme.text });
  p.drawText(l2, { x: cx(l2, f.i, 22), y: 314, size: 22, font: f.i, color: theme.text });
  divider(p, W / 2, 280, 100);

  const brand = "Moments Events";
  p.drawText(brand, { x: cx(brand, f.b, 20), y: 248, size: 20, font: f.b, color: GOLD });
  const sub = "by Bless Events";
  p.drawText(sub, { x: cx(sub, f.r, 13), y: 226, size: 13, font: f.r, color: GOLD, opacity: 0.58 });
  divider(p, W / 2, 202, 56);

  const couple = event.client_name ?? event.name ?? "";
  if (couple) {
    const t = `Créé pour ${couple}`;
    p.drawText(t, { x: cx(t, f.i, 11), y: 172, size: 11, font: f.i, color: theme.text, opacity: 0.45 });
  }
  const d = new Date().toLocaleDateString("fr-FR", { dateStyle: "long" });
  p.drawText(d, { x: cx(d, f.r, 9), y: 154, size: 9, font: f.r, color: GOLD, opacity: 0.38 });
}

// ── Regroupement des vœux ─────────────────────────────────────────────────────
//   - même invité : image + texte → template mixte
//   - images orphelines → duo (paires) ou feature (seule)
//   - textes sans image → page texte premium
//   - table_number facultatif : sous-titre discret si présent, chapitres si >= 50 %
function buildSlots(wishes) {
  const byGuest = new Map();
  for (const w of wishes) {
    const k = w.guest_name ?? "__";
    if (!byGuest.has(k)) byGuest.set(k, { images: [], texts: [] });
    if (w.type === "image") byGuest.get(k).images.push(w);
    else                    byGuest.get(k).texts.push(w);
  }

  const slots = [];
  const pool  = [];

  for (const { images, texts } of byGuest.values()) {
    if (images.length >= 1 && texts.length >= 1) {
      slots.push({ t: "mixed", img: images[0], txt: texts[0] });
      images.slice(1).forEach(x => pool.push(x));
      texts.slice(1).forEach(x => slots.push({ t: "text", w: x }));
    } else if (images.length >= 1) {
      images.forEach(x => pool.push(x));
    } else {
      texts.forEach(x => slots.push({ t: "text", w: x }));
    }
  }

  for (let i = 0; i < pool.length; i += 2) {
    if (i + 1 < pool.length) slots.push({ t: "duo", a: pool[i], b: pool[i + 1] });
    else                      slots.push({ t: "feature", img: pool[i], txt: null });
  }

  return slots;
}

// ── Génération principale ─────────────────────────────────────────────────────
async function generate(sb, jobId, event, wishes, theme) {
  try {
    const doc = await PDFDocument.create();
    const f   = await loadFonts(doc);

    pageCover(doc, f, event, theme);

    const withTable   = wishes.filter(w => w.table_number != null).length;
    const useChapters = withTable > 0 && withTable >= Math.ceil(wishes.length * 0.5);

    let n = 1;

    if (useChapters) {
      const byTable = new Map();
      for (const w of wishes) {
        const t = w.table_number ?? null;
        if (!byTable.has(t)) byTable.set(t, []);
        byTable.get(t).push(w);
      }
      const tables = [...byTable.keys()].sort((a, b) =>
        a == null ? 1 : b == null ? -1 : a - b
      );
      for (const t of tables) {
        pageChapter(doc, f, t, theme);
        for (const slot of buildSlots(byTable.get(t))) {
          await renderSlot(doc, f, slot, n++, theme);
        }
      }
    } else {
      for (const slot of buildSlots(wishes)) {
        await renderSlot(doc, f, slot, n++, theme);
      }
    }

    pageClose(doc, f, event, theme);

    const bytes = await doc.save();
    const path  = `${event.id}/album_${Date.now()}.pdf`;
    await sb.storage.from("albums").upload(path, bytes, { contentType: "application/pdf" });
    const { data: { signedUrl } } = await sb.storage.from("albums").createSignedUrl(path, 604800);
    await sb.from("generation_jobs").update({ status: "done", output_url: signedUrl }).eq("id", jobId);
  } catch (err) {
    await sb.from("generation_jobs").update({ status: "error", error_message: err.message }).eq("id", jobId);
  }
}

async function renderSlot(doc, f, slot, n, theme) {
  if      (slot.t === "text")    return pageText(doc, f, slot.w, n, theme);
  else if (slot.t === "mixed")   return pageMixed(doc, f, slot.img, slot.txt, n, theme);
  else if (slot.t === "duo")     return pageDuo(doc, f, slot.a, slot.b, n, theme);
  else if (slot.t === "feature") return pageFeature(doc, f, slot.img, slot.txt, n, theme);
}
