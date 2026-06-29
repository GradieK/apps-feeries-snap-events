import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGeneration } from "@/hooks/useGeneration";
import { FileText, Video, Download, Loader2, AlertCircle, CheckCircle2, Sparkles, Lock } from "lucide-react";

interface GenerationPanelProps {
  eventId: string;
}

const THEMES = [
  { id: "noir",     label: "Noir & Or",      bg: "#000000", ring: "#D4AF37" },
  { id: "ivoire",   label: "Ivoire & Or",    bg: "#FAF7F2", ring: "#B38728" },
  { id: "marine",   label: "Marine & Or",    bg: "#0A1628", ring: "#D4AF37" },
  { id: "bordeaux", label: "Bordeaux & Or",  bg: "#2C0A0A", ring: "#D4AF37" },
] as const;

type ThemeId = typeof THEMES[number]["id"];

export function GenerationPanel({ eventId }: GenerationPanelProps) {
  const [albumTheme, setAlbumTheme] = useState<ThemeId>("noir");

  const {
    pdfJob,
    videoJob,
    isGeneratingPdf,
    isGeneratingVideo,
    generatePdf,
    generateVideo,
  } = useGeneration(eventId);

  return (
    <Card className="mb-6 shadow-soft border-gold/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-elegant-black">
          <Sparkles className="h-5 w-5 text-gold" />
          Générer les souvenirs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* ── Bloc PDF ── */}
          <div className="p-4 border border-gold/20 rounded-lg bg-gradient-hero">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-gold" />
              <span className="font-semibold text-elegant-black">Album PDF souvenir</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Génère un album panoramique luxe avec tous les vœux, photos et messages de vos invités.
            </p>

            {/* Sélecteur de thème */}
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Couleur de fond
              </p>
              <div className="flex gap-2 flex-wrap">
                {THEMES.map(({ id, label, bg, ring }) => (
                  <button
                    key={id}
                    onClick={() => setAlbumTheme(id)}
                    title={label}
                    className={`relative h-7 w-7 rounded-full border-2 transition-all duration-200 ${
                      albumTheme === id
                        ? "scale-110 shadow-md"
                        : "opacity-60 hover:opacity-90"
                    }`}
                    style={{
                      backgroundColor: bg,
                      borderColor: albumTheme === id ? ring : "rgba(255,255,255,0.15)",
                      boxShadow: albumTheme === id ? `0 0 0 2px ${ring}40` : undefined,
                    }}
                  >
                    {albumTheme === id && (
                      <span
                        className="absolute inset-0 rounded-full"
                        style={{ boxShadow: `inset 0 0 0 1.5px ${ring}` }}
                      />
                    )}
                  </button>
                ))}
                <span className="self-center text-[11px] text-muted-foreground ml-1">
                  {THEMES.find(t => t.id === albumTheme)?.label}
                </span>
              </div>
            </div>

            <StatusBadge job={pdfJob} />

            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => generatePdf(albumTheme)}
                disabled={isGeneratingPdf}
                variant="wedding"
                size="sm"
                className="flex-1"
              >
                {isGeneratingPdf ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération...</>
                ) : (
                  <><FileText className="h-4 w-4 mr-2" />Générer l'album PDF</>
                )}
              </Button>

              {pdfJob?.status === "done" && pdfJob.output_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(pdfJob.output_url!, "_blank")}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* ── Bloc Vidéo 
          <div className="p-4 border border-gold/20 rounded-lg bg-gradient-hero">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-5 w-5 text-gold" />
              <span className="font-semibold text-elegant-black">Vidéo souvenir</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Crée automatiquement une vidéo avec les photos et vidéos partagées par vos invités.
            </p>

            <StatusBadge job={videoJob} />

            <div className="flex gap-2 mt-3">
              <Button
                onClick={generateVideo}
                disabled={isGeneratingVideo}
                variant="wedding"
                size="sm"
                className="flex-1"
              >
                {isGeneratingVideo ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rendu en cours...</>
                ) : (
                  <><Video className="h-4 w-4 mr-2" />Créer la vidéo souvenir</>
                )}
              </Button>

              {videoJob?.status === "done" && videoJob.output_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(videoJob.output_url!, "_blank")}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>── */}
          {/* Opacity réduite pour donner l'aspect "inactif" */}
          <div className="p-4 border border-gold/20 rounded-lg bg-gradient-hero flex flex-col justify-between opacity-70 relative">
          {/* Badge "Bientôt disponible" en haut à droite */}
              <div className="absolute top-2 right-2 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-gold text-xs font-medium">
                Bientôt disponible
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Video className="h-5 w-5 text-gold" />
                  <span className="font-semibold text-elegant-black">Vidéo souvenir</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Crée automatiquement une vidéo avec les photos et vidéos partagées par vos invités.
                </p>
              </div>

              <div>
                {/* On n'affiche pas le statut car la fonction n'est pas lancée */}
                {/* <StatusBadge job={videoJob} /> */}

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="wedding"
                    size="sm"
                    className="flex-1"
                    disabled // Bouton désactivé
                  >
                    {/* Texte et icône de cadenas */}
                    <><Lock className="h-4 w-4 mr-2" /> Bientôt disponible</>
                  </Button>
                </div>
              </div>
            </div>

        </div>
      </CardContent>
    </Card>
  );
}

// ── Composant badge de statut ──
function StatusBadge({ job }: { job: { status: string; error_message?: string | null } | null }) {
  if (!job) return null;

  if (job.status === "processing") {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Génération en cours, merci de patienter...</span>
      </div>
    );
  }

  if (job.status === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-md">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Prêt à télécharger !</span>
      </div>
    );
  }

  if (job.status === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-md">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>{job.error_message ?? "Une erreur est survenue, réessayez."}</span>
      </div>
    );
  }

  return null;
}