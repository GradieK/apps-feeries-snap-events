import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  Filter, 
  Users, 
  MessageSquare, 
  Mic, 
  Camera, 
  Eye,
  Calendar,
  Table as TableIcon,
  Heart,
  RefreshCw,
  ChevronLeft,
  Sparkles,
  PlayCircle
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

const Admin = () => {
  // Remplacez selectedTable par ceci
  const [selectedType, setSelectedType] = useState<string>("all");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { event, isLoading: isEventLoading, error: eventError } = useEvent();

  const loadWishes = async () => {
    if (!event?.id || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
      .from("wishes")
      .select("*")
      .eq("event_id", event.id)
      .order('created_at', { ascending: false });

      if (error) throw error;

      setWishes((data || []).map(wish => ({
        ...wish,
        type: wish.type as WishType
      })));
    } catch (error) {
      console.error('Error loading wishes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les souvenirs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate("/dashboard");
    }
  }, [isAuthLoading, user, navigate]);

  useEffect(() => {
    if (!isAuthLoading && user && !isEventLoading && event && !eventError) {
      void loadWishes();
    }
  }, [isAuthLoading, user, isEventLoading, event, eventError]);

  const handleExportZip = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      toast({ title: "Préparation de l'archive...", description: "Traitement des souvenirs en cours" });

      const textWishes = wishes.filter(wish => wish.type === "text");
      if (textWishes.length > 0) {
        const textContent = textWishes.map(wish => 
          `=== ${wish.guest_name} - Table ${wish.table_number} ===\n` +
          `Date: ${new Date(wish.created_at).toLocaleString("fr-FR")}\n` +
          `Message: ${wish.content || 'Aucun contenu'}\n\n`
        ).join('');
        zip.file("messages-texte.txt", textContent);
      }

      const fileWishes = wishes.filter(wish => wish.file_url && (wish.type === "audio" || wish.type === "image" || wish.type === "video"));
      for (const wish of fileWishes) {
        if (wish.file_url) {
          try {
            const response = await fetch(wish.file_url);
            if (response.ok) {
              const blob = await response.blob();
              const extension = wish.filename?.split('.').pop() || (wish.type === 'audio' ? 'webm' : wish.type === 'image' ? 'jpg' : 'mp4');
              const fileName = `${wish.type}s/${wish.guest_name}_table${wish.table_number}_${new Date(wish.created_at).getTime()}.${extension}`;
              zip.file(fileName, blob);
            }
          } catch (e) { console.error(e); }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `souvenirs-feerie-${event?.slug}-${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export terminé 📦", description: `${wishes.length} souvenirs sauvegardés` });
    } catch (error) {
      toast({ title: "Erreur d'export", variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    const textWishes = wishes.filter(wish => wish.type === "text");
    const csvContent = [
      ["Nom", "Table", "Message", "Date"],
      ...textWishes.map(wish => [wish.guest_name, wish.table_number.toString(), wish.content || "", new Date(wish.created_at).toLocaleString("fr-FR")])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "messages_texte.csv";
    link.click();
  };

  const getTypeIcon = (type: WishType) => {
    switch (type) {
      case "text": return <MessageSquare className="h-3.5 w-3.5" />;
      case "audio": return <Mic className="h-3.5 w-3.5" />;
      case "image": return <Camera className="h-3.5 w-3.5" />;
      case "video": return <PlayCircle className="h-3.5 w-3.5" />;
      default: return <MessageSquare className="h-3.5 w-3.5" />;
    }
  };

  const filteredWishes = selectedType === "all" 
  ? wishes 
  : wishes.filter(wish => wish.type === selectedType);

  const stats = {
    total: wishes.length,
    text: wishes.filter(w => w.type === "text").length,
    audio: wishes.filter(w => w.type === "audio").length,
    media: wishes.filter(w => w.type === "image" || w.type === "video").length,
  };

  if (isAuthLoading || isEventLoading || !event) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-gold animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 pb-20">
      {/* Header Premium */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div>
              <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-white">Gestion des Souvenirs</h1>
              <p className="text-[10px] text-gold uppercase tracking-widest">{event.name}</p>
            </div>
          </div>
          <Button
            onClick={loadWishes}
            variant="outline"
            size="sm"
            className="rounded-full border-white/10 bg-white/5 text-[10px] uppercase tracking-widest h-9"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", val: stats.total, icon: Users },
            { label: "Textes", val: stats.text, icon: MessageSquare },
            { label: "Audios", val: stats.audio, icon: Mic },
            { label: "Médias", val: stats.media, icon: Camera },
          ].map((item, i) => (
            <Card key={i} className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-2xl font-black text-white">{item.val}</p>
                </div>
                <item.icon className="h-5 w-5 text-gold opacity-50" />
              </CardContent>
            </Card>
          ))}
        </div>

        {event?.id && <GenerationPanel eventId={event.id} />}

        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center gap-3 px-3 py-2 bg-black/40 rounded-xl border border-white/5">
            <Filter className="h-4 w-4 text-gold" />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px] border-none bg-transparent h-8 text-xs focus:ring-0">
                <SelectValue placeholder="Type de souvenir" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0f0f] border-white/10 text-slate-300">
                <SelectItem value="all">Tous les souvenirs</SelectItem>
                <SelectItem value="text">Messages écrits</SelectItem>
                <SelectItem value="image">Photos</SelectItem>
                <SelectItem value="video">Vidéos</SelectItem>
                <SelectItem value="audio">Messages vocaux</SelectItem>
              </SelectContent>
            </Select>
          </div>
  
          <div className="flex gap-3">
            <Button onClick={handleExportCSV} variant="outline" className="rounded-xl border-white/10 text-[10px] font-bold">CSV</Button>
            <Button onClick={handleExportZip} className="btn-gold rounded-xl text-[10px] font-bold tracking-widest uppercase">Archive ZIP</Button>
          </div>
        </div>

        {/* Wishes Feed */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Eye className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-white">Flux des vœux ({filteredWishes.length})</h2>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full py-20 text-center opacity-30 tracking-widest uppercase text-xs">Synchronisation...</div>
            ) : filteredWishes.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
                <Heart className="mx-auto h-8 w-8 mb-4 opacity-20 text-gold" />
                <p className="text-muted-foreground text-sm italic">Aucun souvenir capturé ici pour le moment.</p>
              </div>
            ) : (
              filteredWishes.map((wish) => (
                <Card 
                  key={wish.id}
                  className="group bg-white/[0.03] border-white/5 hover:border-gold/30 transition-all duration-500 rounded-2xl overflow-hidden flex flex-col"
                >
                  <CardHeader className="p-4 pb-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-gold/10 text-gold border-gold/20 text-[9px] uppercase tracking-tighter flex items-center gap-1.5 py-1">
                        {getTypeIcon(wish.type)}
                        {wish.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono opacity-50">
                        #{wish.id.slice(0,5)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-base truncate">{wish.guest_name}</h3>
                      {/*<div className="flex items-center gap-1.5 text-gold bg-gold/5 px-2 py-1 rounded-lg border border-gold/10">
                        <TableIcon className="h-3 w-3" />
                        <span className="text-[10px] font-black">T-{wish.table_number}</span>
                      </div>*/}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-between space-y-4">
                    <div className="relative">
                      {wish.type === "text" && (
                        <p className="text-sm text-slate-400 leading-relaxed italic">"{wish.content}"</p>
                      )}
                      
                      {wish.type === "audio" && wish.file_url && (
                        <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                          <audio controls className="w-full h-8 opacity-70">
                            <source src={wish.file_url} type={wish.mime_type || "audio/webm"} />
                          </audio>
                        </div>
                      )}
                      
                      {wish.type === "image" && wish.file_url && (
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                          <img 
                            src={wish.file_url} 
                            alt={wish.guest_name}
                            className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        </div>
                      )}
                      
                      {wish.type === "video" && wish.file_url && (
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20 relative">
                          <video className="w-full aspect-video object-cover" preload="metadata" controls>
                            <source src={wish.file_url} type={wish.mime_type || "video/mp4"} />
                          </video>
                          {/*<div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                             <PlayCircle className="h-10 w-10 text-white opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                          </div>*/}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[9px] text-muted-foreground uppercase tracking-widest">
                      <Calendar className="h-3 w-3 text-gold/50" />
                      {new Date(wish.created_at).toLocaleDateString("fr-FR")} à {new Date(wish.created_at).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Admin;