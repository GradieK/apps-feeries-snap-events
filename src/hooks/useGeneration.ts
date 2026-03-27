import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type JobStatus = "idle" | "processing" | "done" | "error";

interface GenerationJob {
  id: string;
  status: JobStatus;
  output_url: string | null;
  error_message: string | null;
  type: "pdf" | "video";
}

interface UseGenerationReturn {
  pdfJob: GenerationJob | null;
  videoJob: GenerationJob | null;
  isGeneratingPdf: boolean;
  isGeneratingVideo: boolean;
  generatePdf: () => Promise<void>;
  generateVideo: () => Promise<void>;
}

export function useGeneration(eventId: string | undefined): UseGenerationReturn {
  const [pdfJob, setPdfJob]     = useState<GenerationJob | null>(null);
  const [videoJob, setVideoJob] = useState<GenerationJob | null>(null);

  // ── Charger les jobs existants au montage ──
  useEffect(() => {
    if (!eventId) return;

    const loadExistingJobs = async () => {
      const { data } = await supabase
        .from("generation_jobs")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (!data) return;

      const lastPdf   = data.find(j => j.type === "pdf");
      const lastVideo = data.find(j => j.type === "video");

      if (lastPdf)   setPdfJob(lastPdf as GenerationJob);
      if (lastVideo) setVideoJob(lastVideo as GenerationJob);
    };

    void loadExistingJobs();
  }, [eventId]);

  // ── Écoute Realtime : mise à jour automatique du statut ──
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`generation_jobs:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generation_jobs",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const job = payload.new as GenerationJob;
          if (job.type === "pdf")   setPdfJob(job);
          if (job.type === "video") setVideoJob(job);
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [eventId]);

  // Ajoute cet useEffect dans useGeneration.ts
useEffect(() => {
  if (!eventId || videoJob?.status !== "processing" || !videoJob?.id) return;

  const poll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase.functions.invoke("check-video-status", {
      body: { jobId: videoJob.id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (data?.status === "done") {
      setVideoJob(prev => prev ? { ...prev, status: "done", output_url: data.output_url } : null);
    } else if (data?.status === "error") {
      setVideoJob(prev => prev ? { ...prev, status: "error" } : null);
    }
  };

  // Lance le polling toutes les 10 secondes
  const interval = setInterval(poll, 10000);

  // Lance une première vérification immédiate
  void poll();

  return () => clearInterval(interval);
}, [eventId, videoJob?.status, videoJob?.id]);

  // ── Lancer la génération PDF ──
  // ── Lancer la génération PDF ──
const generatePdf = async () => {
    if (!eventId) return;
    setPdfJob({ id: "", type: "pdf", status: "processing", output_url: null, error_message: null });
  
    // Récupère le token de session explicitement
    const { data: { session } } = await supabase.auth.getSession();
    console.log("SESSION TOKEN:", session?.access_token ? "✅ présent" : "❌ absent");
    console.log("USER:", session?.user?.email);
  
    const { data, error } = await supabase.functions.invoke("generate-pdf", {
      body: { eventId },
      headers: {
        Authorization: `Bearer ${session.access_token}`, // token explicite
      },
    });
  
    if (error) {
      setPdfJob({ id: "", type: "pdf", status: "error", output_url: null, error_message: error.message });
    } else {
      setPdfJob(prev => prev ? { ...prev, id: data.jobId } : null);
    }
  };

  // ── Lancer la génération vidéo ──
const generateVideo = async () => {
    if (!eventId) return;
    setVideoJob({ id: "", type: "video", status: "processing", output_url: null, error_message: null });
  
    // Récupère le token de session explicitement
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setVideoJob({ id: "", type: "video", status: "error", output_url: null, error_message: "Non connecté" });
      return;
    }
  
    const { data, error } = await supabase.functions.invoke("trigger-video", {
      body: { eventId },
      headers: {
        Authorization: `Bearer ${session.access_token}`, // token explicite
      },
    });
  
    if (error) {
      setVideoJob({ id: "", type: "video", status: "error", output_url: null, error_message: error.message });
    } else {
      setVideoJob(prev => prev ? { ...prev, id: data.jobId } : null);
    }
  };

  return {
    pdfJob,
    videoJob,
    isGeneratingPdf:   pdfJob?.status === "processing",
    isGeneratingVideo: videoJob?.status === "processing",
    generatePdf,
    generateVideo,
  };
}