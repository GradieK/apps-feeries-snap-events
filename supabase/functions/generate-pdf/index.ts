import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { eventId } = await req.json();
    const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
    const { data: wishesRaw } = await supabase.from("wishes").select("*").eq("event_id", eventId).order("created_at", { ascending: true });
    //On ne garde que les images et les textes pour le PDF
    const wishes = (wishesRaw ?? []).filter(w => w.type === 'image' || w.type === 'text');

    const { data: job } = await supabase.from("generation_jobs").insert({ event_id: eventId, type: "pdf", status: "processing" }).select().single();

    generateAndStore(supabase, job.id, event, wishes ?? []).catch(console.error);

    return new Response(JSON.stringify({ jobId: job.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function generateAndStore(supabase: any, jobId: string, event: any, wishes: any[]) {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont("Times-Roman");
    const fontBold = await pdfDoc.embedFont("Times-Bold");
    const fontItalic = await pdfDoc.embedFont("Times-Italic");

    const ivory = rgb(0.98, 0.97, 0.95);
    const gold = rgb(0.72, 0.58, 0.38);
    const charcoal = rgb(0.1, 0.1, 0.1);

    const PAGE_W = 595;
    const PAGE_H = 842;

    // --- COUVERTURE CENTRÉE ---
    const cover = pdfDoc.addPage([PAGE_W, PAGE_H]);
    cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: ivory });
    cover.drawRectangle({ x: 40, y: 40, width: PAGE_W - 80, height: PAGE_H - 80, borderColor: gold, borderWidth: 0.5 });
    cover.drawRectangle({ x: 45, y: 45, width: PAGE_W - 90, height: PAGE_H - 90, borderColor: gold, borderWidth: 1.5 });

    // "ALBUM SOUVENIR" centré
    const txtAlbum = "ALBUM SOUVENIR";
    const albumWidth = fontBold.widthOfTextAtSize(txtAlbum, 34);
    cover.drawText(txtAlbum, { x: (PAGE_W - albumWidth) / 2, y: 580, size: 34, font: fontBold, color: gold });

    // Nom de l'événement / Organisateur centré
    const title = (event.client_name ?? event.name ?? "").toUpperCase();
    const titleWidth = font.widthOfTextAtSize(title, 22);
    cover.drawText(title, { x: (PAGE_W - titleWidth) / 2, y: 530, size: 22, font: font, color: charcoal });

    // Date centrée
    if (event.event_date) {
      const dateStr = new Date(event.event_date).toLocaleDateString("fr-FR", { dateStyle: "long" });
      const dateWidth = fontItalic.widthOfTextAtSize(dateStr, 16);
      cover.drawText(dateStr, { x: (PAGE_W - dateWidth) / 2, y: 495, size: 16, font: fontItalic, color: gold });
    }

    // --- PAGES CONTENU ---
    for (let i = 0; i < wishes.length; i++) {
      const w = wishes[i];
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: ivory });

      if (w.type === "image" && w.file_url) {
        try {
          const res = await fetch(w.file_url);
          const buf = await res.arrayBuffer();
          const img = w.mime_type?.includes("png") ? await pdfDoc.embedPng(buf) : await pdfDoc.embedJpg(buf);
          const dims = img.scaleToFit(PAGE_W - 100, 500);
          const x = (PAGE_W - dims.width) / 2;
          const y = PAGE_H - dims.height - 80;

          page.drawRectangle({ x: x + 5, y: y - 5, width: dims.width, height: dims.height, color: rgb(0.9, 0.9, 0.85) });
          page.drawImage(img, { x, y, width: dims.width, height: dims.height });

          const textY = y - 60;
          page.drawText(w.guest_name || "Invité", { x: 80, y: textY, size: 18, font: fontBold, color: gold });
          if (w.content) {
            const lines = wrapText(`« ${w.content} »`, 55);
            let lineY = textY - 30;
            lines.forEach(l => {
              page.drawText(l, { x: 80, y: lineY, size: 14, font: fontItalic, color: charcoal });
              lineY -= 20;
            });
          }
        } catch (e) { console.error("Skip img", e); }
      } else {
        // Page texte centrée
        const centerY = PAGE_H / 2;
        const lines = wrapText(w.content || "", 45);
        let lineY = centerY + 60;
        lines.forEach(l => {
          const lineWidth = fontItalic.widthOfTextAtSize(l, 20);
          page.drawText(l, { x: (PAGE_W - lineWidth) / 2, y: lineY, size: 20, font: fontItalic, color: charcoal });
          lineY -= 30;
        });
        const nameWidth = fontBold.widthOfTextAtSize(w.guest_name || "Invité", 16);
        page.drawText(w.guest_name || "Invité", { x: (PAGE_W - nameWidth) / 2, y: lineY - 40, size: 16, font: fontBold, color: gold });
      }
      page.drawText(`— ${i + 1} —`, { x: PAGE_W / 2 - 15, y: 40, size: 10, font: font, color: gold });
    }

    // --- PAGE FINALE CENTRÉE ---
    const last = pdfDoc.addPage([PAGE_W, PAGE_H]);
    last.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: ivory }); // Fond ivoire pour la fin
    
    const quote1 = "Chaque instant, chaque sourire…";
    const quote2 = "des souvenirs éternels pour une journée d’exception";
    const brand = "Féerie Snap Event";

    const q1W = fontBold.widthOfTextAtSize(quote1, 20);
    const q2W = fontItalic.widthOfTextAtSize(quote2, 14);
    const bW = fontBold.widthOfTextAtSize(brand, 16);

    last.drawText(quote1, { x: (PAGE_W - q1W) / 2, y: 470, size: 20, font: fontBold, color: charcoal });
    last.drawText(quote2, { x: (PAGE_W - q2W) / 2, y: 445, size: 14, font: fontItalic, color: gold });
    
    // Ligne de séparation
    last.drawLine({ 
        start: { x: PAGE_W/2 - 30, y: 400 }, 
        end: { x: PAGE_W/2 + 30, y: 400 }, 
        color: gold, thickness: 1 
    });

    last.drawText(brand, { x: (PAGE_W - bW) / 2, y: 370, size: 16, font: fontBold, color: gold });

    const pdfBytes = await pdfDoc.save();
    const filePath = `${event.id}/album_premium_${Date.now()}.pdf`;
    await supabase.storage.from("albums").upload(filePath, pdfBytes, { contentType: "application/pdf" });
    const { data: { signedUrl } } = await supabase.storage.from("albums").createSignedUrl(filePath, 604800);
    await supabase.from("generation_jobs").update({ status: "done", output_url: signedUrl }).eq("id", jobId);
  } catch (err) {
    await supabase.from("generation_jobs").update({ status: "error", error_message: err.message }).eq("id", jobId);
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  words.forEach(word => {
    if ((currentLine + word).length > maxChars) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else { currentLine += word + " "; }
  });
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}