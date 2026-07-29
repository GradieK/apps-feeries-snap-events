import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Download,
  Filter,
  Users,
  MessageSquare,
  Mic,
  Camera,
  Eye,
  Calendar,
  Heart,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PlayCircle,
  Maximize2,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEvent } from "@/hooks/useEvent";
import { useAuth } from "@/hooks/useAuth";
import { GenerationPanel } from "@/components/GenerationPanel";

type WishType = "text" | "audio" | "image" | "video";

interface Wish {
  id: string;
  guest_name: string;
  table_number: number | null;
  type: WishType;
  content?: string | null;
  file_url?: string | null;
  filename?: string | null;
  created_at: string;
  mime_type?: string | null;
  file_size?: number | null;
}

const MEDIA_BUCKET = "media-wishes";
const PAGE_SIZE = 24;

const Admin = () => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, text: 0, audio: 0, media: 0 });
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [wishToDelete, setWishToDelete] = useState<Wish | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { event, isLoading: isEventLoading, error: eventError } = useEvent();

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const loadWishes = async (targetPage = page) => {
    if (!event?.id || !user) return;
    setIsLoading(true);
    try {
      const from = (targetPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("wishes")
        .select("*", { count: "exact" })
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (selectedType !== "all") query = query.eq("type", selectedType);

      const { data, error, count } = await query;
      if (error) throw error;
      setWishes((data || []).map((wish) => ({ ...wish, type: wish.type as WishType })));
      setTotalCount(count ?? 0);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les souvenirs", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!event?.id || !user) return;
    const countFor = async (type?: WishType | WishType[]) => {
      let q = supabase.from("wishes").select("id", { count: "exact", head: true }).eq("event_id", event.id);
      q = Array.isArray(type) ? q.in("type", type) : type ? q.eq("type", type) : q;
      const { count } = await q;
      return count ?? 0;
    };
    const [total, text, audio, media] = await Promise.all([
      countFor(), countFor("text"), countFor("audio"), countFor(["image", "video"]),
    ]);
    setStats({ total, text, audio, media });
  };

  // Récupère tous les vœux (hors pagination) pour les exports CSV/ZIP
  const fetchAllWishes = async (): Promise<Wish[]> => {
    if (!event?.id) return [];
    const BATCH = 1000;
    let all: Wish[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("wishes")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
        .range(from, from + BATCH - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data.map((w) => ({ ...w, type: w.type as WishType })));
      if (data.length < BATCH) break;
      from += BATCH;
    }
    return all;
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    setPage(1);
  };

  const refresh = () => {
    void loadWishes(page);
    void loadStats();
  };

  useEffect(() => {
    if (!isAuthLoading && !user) navigate("/dashboard");
  }, [isAuthLoading, user, navigate]);

  useEffect(() => {
    if (!isAuthLoading && user && !isEventLoading && event && !eventError) {
      void loadWishes(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, user, isEventLoading, event, eventError, page, selectedType]);

  useEffect(() => {
    if (!isAuthLoading && user && !isEventLoading && event && !eventError) {
      void loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, user, isEventLoading, event, eventError]);

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      toast({ title: "Préparation de l'archive...", description: "Traitement des souvenirs en cours" });

      const allWishes = await fetchAllWishes();

      const textWishes = allWishes.filter((w) => w.type === "text");
      if (textWishes.length > 0) {
        const textContent = textWishes
          .map((w) =>
            `=== ${w.guest_name} ===\nDate: ${new Date(w.created_at).toLocaleString("fr-FR")}\nMessage: ${w.content || ""}\n\n`
          )
          .join("");
        zip.file("messages-texte.txt", textContent);
      }

      const fileWishes = allWishes.filter((w) => w.file_url && w.type !== "text");
      for (const wish of fileWishes) {
        if (wish.file_url) {
          try {
            const response = await fetch(wish.file_url);
            if (response.ok) {
              const blob = await response.blob();
              const ext = wish.filename?.split(".").pop() || (wish.type === "audio" ? "webm" : wish.type === "image" ? "jpg" : "mp4");
              zip.file(`${wish.type}s/${wish.guest_name}_${new Date(wish.created_at).getTime()}.${ext}`, blob);
            }
          } catch (e) { console.error(e); }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `souvenirs-moments-events-${event?.slug}-${new Date().toISOString().split("T")[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export terminé", description: `${allWishes.length} souvenirs sauvegardés` });
    } catch {
      toast({ title: "Erreur d'export", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const allWishes = await fetchAllWishes();
      const textWishes = allWishes.filter((w) => w.type === "text");
      const csvContent = [
        ["Nom", "Table", "Message", "Date"],
        ...textWishes.map((w) => [
          w.guest_name,
          String(w.table_number ?? ""),
          w.content || "",
          new Date(w.created_at).toLocaleString("fr-FR"),
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "messages_texte.csv";
      link.click();
    } catch {
      toast({ title: "Erreur d'export", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const getTypeIcon = (type: WishType) => {
    const icons = { text: MessageSquare, audio: Mic, image: Camera, video: PlayCircle };
    const Icon = icons[type] ?? MessageSquare;
    return <Icon className="h-3.5 w-3.5" />;
  };

  const galleryItems = wishes.filter(
    (w) => (w.type === "image" || w.type === "video") && !!w.file_url
  );

  const activeWish = viewerIndex !== null ? galleryItems[viewerIndex] : null;

  const openViewer = (wish: Wish) => {
    const idx = galleryItems.findIndex((w) => w.id === wish.id);
    if (idx !== -1) setViewerIndex(idx);
  };

  useEffect(() => {
    if (viewerIndex === null) return;
    if (galleryItems.length === 0) {
      setViewerIndex(null);
      return;
    }
    if (viewerIndex >= galleryItems.length) {
      setViewerIndex(galleryItems.length - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryItems.length]);

  useEffect(() => {
    if (viewerIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setViewerIndex((i) => (i === null ? i : Math.min(i + 1, galleryItems.length - 1)));
      if (e.key === "ArrowLeft") setViewerIndex((i) => (i === null ? i : Math.max(i - 1, 0)));
      if (e.key === "Escape") setViewerIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewerIndex, galleryItems.length]);

  const handleDownloadWish = async (wish: Wish) => {
    if (!wish.file_url) return;
    try {
      const response = await fetch(wish.file_url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const ext = wish.filename?.split(".").pop() || (wish.type === "video" ? "mp4" : "jpg");
      link.href = url;
      link.download = wish.filename || `${wish.guest_name}_${new Date(wish.created_at).getTime()}.${ext}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erreur", description: "Impossible de télécharger ce fichier", variant: "destructive" });
    }
  };

  const getStoragePathFromUrl = (url: string) => {
    const marker = `/object/public/${MEDIA_BUCKET}/`;
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  };

  const handleDeleteWish = async (wish: Wish) => {
    setDeletingId(wish.id);
    try {
      if (wish.file_url) {
        const path = getStoragePathFromUrl(wish.file_url);
        if (path) {
          await supabase.storage.from(MEDIA_BUCKET).remove([path]);
        }
      }

      const { error } = await supabase.from("wishes").delete().eq("id", wish.id);
      if (error) throw error;

      setWishes((prev) => prev.filter((w) => w.id !== wish.id));
      toast({ title: "Souvenir supprimé" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer ce souvenir", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setWishToDelete(null);
    }
  };

  // ── Loading ──
  if (isAuthLoading || isEventLoading || !event) {
    return (
      <div className="page-loader">
        <div className="page-loader-inner">
          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-primary/50 text-xs tracking-[0.3em] uppercase">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Navbar */}
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="h-6 w-px bg-white/10" />
            <img src="/logo.png" alt="Moments Events" className="h-7 w-auto hidden sm:block" />
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div>
              <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-foreground">Gestion des Souvenirs</h1>
              <p className="text-[10px] text-primary uppercase tracking-widest">{event.name}</p>
            </div>
          </div>
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="rounded-full border-white/10 bg-white/5 text-[10px] uppercase tracking-widest h-9 hover:border-primary/30"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", val: stats.total, Icon: Users },
            { label: "Textes", val: stats.text, Icon: MessageSquare },
            { label: "Audios", val: stats.audio, Icon: Mic },
            { label: "Médias", val: stats.media, Icon: Camera },
          ].map(({ label, val, Icon }) => (
            <Card key={label} className="bg-white/[0.02] border-white/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                  <p className="text-2xl font-black text-foreground">{val}</p>
                </div>
                <Icon className="h-5 w-5 text-primary opacity-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {event?.id && <GenerationPanel eventId={event.id} />}

        {/* Filtres et actions */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center gap-3 px-3 py-2 bg-black/40 rounded-xl border border-white/5">
            <Filter className="h-4 w-4 text-primary" />
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-[180px] border-none bg-transparent h-8 text-xs focus:ring-0">
                <SelectValue placeholder="Type de souvenir" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10 text-foreground">
                <SelectItem value="all">Tous les souvenirs</SelectItem>
                <SelectItem value="text">Messages écrits</SelectItem>
                <SelectItem value="image">Photos</SelectItem>
                <SelectItem value="video">Vidéos</SelectItem>
                <SelectItem value="audio">Messages vocaux</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => void handleExportCSV()}
              variant="outline"
              disabled={isExporting}
              className="rounded-xl border-white/10 text-[10px] font-bold uppercase tracking-widest hover:border-primary/30"
            >
              <Download className="mr-2 h-3 w-3" /> CSV
            </Button>
            <Button
              onClick={() => void handleExportZip()}
              disabled={isExporting}
              className="btn-gold rounded-xl text-[10px] font-black tracking-widest uppercase"
            >
              <Download className="mr-2 h-3 w-3" /> {isExporting ? "Export en cours..." : "Archive ZIP"}
            </Button>
          </div>
        </div>

        {/* Flux des vœux */}
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-foreground">
              Flux des vœux ({totalCount})
            </h2>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {isLoading ? (
              <div className="col-span-full py-20 text-center">
                <Sparkles className="h-6 w-6 text-primary animate-pulse mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground text-xs tracking-widest uppercase">Synchronisation...</p>
              </div>
            ) : wishes.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
                <Heart className="mx-auto h-8 w-8 mb-4 opacity-20 text-primary" />
                <p className="text-muted-foreground text-sm italic">Aucun souvenir capturé ici pour le moment.</p>
              </div>
            ) : (
              wishes.map((wish) => (
                <Card
                  key={wish.id}
                  className="group bg-white/[0.03] border-white/5 hover:border-primary/30 transition-all duration-500 rounded-2xl overflow-hidden flex flex-col"
                >
                  <CardHeader className="p-4 pb-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase tracking-tighter flex items-center gap-1.5 py-1">
                        {getTypeIcon(wish.type)}
                        {wish.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono opacity-40">
                        #{wish.id.slice(0, 5)}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-base truncate">{wish.guest_name}</h3>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      {wish.type === "text" && (
                        <p className="text-sm text-muted-foreground leading-relaxed italic">"{wish.content}"</p>
                      )}
                      {wish.type === "audio" && wish.file_url && (
                        <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                          <audio controls className="w-full h-8 opacity-70">
                            <source src={wish.file_url} type={wish.mime_type || "audio/webm"} />
                          </audio>
                        </div>
                      )}
                      {wish.type === "image" && wish.file_url && (
                        <div
                          className="relative rounded-xl overflow-hidden border border-white/10 bg-black/20 cursor-pointer"
                          onClick={() => openViewer(wish)}
                        >
                          <img
                            src={wish.file_url}
                            alt={wish.guest_name}
                            loading="lazy"
                            className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                            <Maximize2 className="h-5 w-5 text-white opacity-0 group-hover:opacity-90 transition-opacity duration-300" />
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void handleDownloadWish(wish); }}
                              title="Télécharger"
                              className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-primary hover:text-black transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setWishToDelete(wish); }}
                              title="Supprimer"
                              className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                      {wish.type === "video" && wish.file_url && (
                        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/20">
                          <video className="w-full aspect-video object-cover" preload="metadata" controls>
                            <source src={wish.file_url} type={wish.mime_type || "video/mp4"} />
                          </video>
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                              type="button"
                              onClick={() => openViewer(wish)}
                              title="Agrandir"
                              className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-primary hover:text-black transition-colors"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownloadWish(wish)}
                              title="Télécharger"
                              className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-primary hover:text-black transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setWishToDelete(wish)}
                              title="Supprimer"
                              className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[9px] text-muted-foreground uppercase tracking-widest">
                      <Calendar className="h-3 w-3 text-primary/50" />
                      {new Date(wish.created_at).toLocaleDateString("fr-FR")} à{" "}
                      {new Date(wish.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {!isLoading && totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-white/10 bg-white/5 hover:border-primary/30"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-white/10 bg-white/5 hover:border-primary/30"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Visualiseur plein écran type story */}
      <Dialog open={viewerIndex !== null} onOpenChange={(open) => !open && setViewerIndex(null)}>
        <DialogContent className="max-w-none w-screen h-screen sm:h-screen p-0 border-none bg-black/95 rounded-none flex items-center justify-center [&>button]:hidden">
          {activeWish && (
            <div className="contents">
              <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-3 p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase tracking-tighter flex items-center gap-1.5 py-1 shrink-0">
                    {getTypeIcon(activeWish.type)}
                    {activeWish.type}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{activeWish.guest_name}</p>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest">
                      {new Date(activeWish.created_at).toLocaleDateString("fr-FR")} à{" "}
                      {new Date(activeWish.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-white/50 font-mono tracking-widest hidden sm:inline">
                    {viewerIndex !== null ? viewerIndex + 1 : 0}/{galleryItems.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full border-white/20 bg-white/5 text-white hover:border-primary/40 hover:text-primary"
                    onClick={() => void handleDownloadWish(activeWish)}
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full border-white/20 bg-white/5 text-white hover:border-destructive hover:text-destructive"
                    onClick={() => setWishToDelete(activeWish)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full border-white/20 bg-white/5 text-white hover:border-primary/40 hover:text-primary"
                    onClick={() => setViewerIndex(null)}
                    title="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {viewerIndex !== null && viewerIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setViewerIndex((i) => (i === null ? i : Math.max(i - 1, 0)))}
                  className="absolute left-2 sm:left-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-primary hover:text-black transition-colors"
                  title="Précédent"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {viewerIndex !== null && viewerIndex < galleryItems.length - 1 && (
                <button
                  type="button"
                  onClick={() => setViewerIndex((i) => (i === null ? i : Math.min(i + 1, galleryItems.length - 1)))}
                  className="absolute right-2 sm:right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-primary hover:text-black transition-colors"
                  title="Suivant"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              <div className="w-full h-full flex items-center justify-center p-4 sm:p-12">
                {activeWish.type === "image" ? (
                  <img
                    src={activeWish.file_url!}
                    alt={activeWish.guest_name}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <video
                    key={activeWish.id}
                    src={activeWish.file_url!}
                    controls
                    autoPlay
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation de suppression */}
      <AlertDialog open={!!wishToDelete} onOpenChange={(open) => !open && setWishToDelete(null)}>
        <AlertDialogContent className="bg-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce souvenir ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le {wishToDelete?.type === "video" ? "vidéo" : "photo"} de {wishToDelete?.guest_name} sera définitivement
              supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (wishToDelete) void handleDeleteWish(wishToDelete);
              }}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Admin;
