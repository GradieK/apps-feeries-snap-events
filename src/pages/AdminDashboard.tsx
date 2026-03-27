import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Heart, 
  Link as LinkIcon, 
  LogOut, 
  PlusCircle, 
  QrCode, 
  Settings2, 
  Users,
  Sparkles,
  ChevronRight,
  User,
  LayoutGrid
} from "lucide-react";

type EventRow = Tables<"events">;
type NewEvent = Pick<TablesInsert<"events">, "name" | "client_name" | "event_date" | "status">;

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const AdminDashboard = () => {
  const { user, isLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [newEvent, setNewEvent] = useState<NewEvent>({
    name: "",
    client_name: "",
    event_date: "",
    status: "draft",
  });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const loadEvents = async () => {
    if (!user) return;
    setIsLoadingEvents(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger vos événements.",
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
    setIsLoadingEvents(false);
  };

  useEffect(() => {
    if (user) {
      loadEvents();
    } else {
      setEvents([]);
    }
  }, [user?.id]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthSubmitting(true);
    try {
      if (!authEmail || !authPassword) return;
  
      // On ne garde QUE la connexion. L'inscription est gérée par toi sur Supabase.
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      
      if (error) throw error;
      
      toast({
        title: "Bienvenue",
        description: "Connexion établie avec succès.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Accès refusé",
        description: "Identifiants invalides ou compte non autorisé.",
        variant: "destructive",
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newEvent.name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }

    setIsCreatingEvent(true);
    try {
      const baseSlug = slugify(newEvent.name);
      let slug = baseSlug;
      let suffix = 1;

      while (true) {
        const { data, error } = await supabase
          .from("events")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (error) throw error;
        if (!data) break;
        slug = `${baseSlug}-${suffix++}`;
      }

      const payload: TablesInsert<"events"> = {
        name: newEvent.name.trim(),
        client_name: newEvent.client_name?.trim() || null,
        event_date: newEvent.event_date || null,
        status: newEvent.status || "draft",
        slug,
        owner_id: user.id,
      };

      const { data, error } = await supabase
        .from("events")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setEvents((prev) => [data as EventRow, ...prev]);
      setNewEvent({ name: "", client_name: "", event_date: "", status: "draft" });

      toast({
        title: "Événement créé",
        description: "Votre nouvel univers Féerie est prêt.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'événement.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="h-8 w-8 text-gold animate-pulse" />
          <p className="text-gold/50 text-xs tracking-[0.3em] uppercase">Initialisation...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/[0.02] border-white/10 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto p-4 rounded-full bg-gold/5 border border-gold/10 w-fit">
              <Heart className="h-8 w-8 text-gold fill-gold/20" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl text-white tracking-tight">Espace Créateur</CardTitle>
              <p className="text-muted-foreground text-sm">Gérez l'élégance de vos événements.</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-widest text-gold/70">Email professionnel</Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-black/40 border-white/5 focus:border-gold/50 h-12 rounded-xl"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="nom@feerie.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" title="Mot de passe" className="text-xs uppercase tracking-widest text-gold/70">Secret</Label>
                <Input
                  id="password"
                  type="password"
                  className="bg-black/40 border-white/5 focus:border-gold/50 h-12 rounded-xl"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full btn-gold h-12 rounded-xl uppercase tracking-widest text-xs font-bold"
                disabled={isAuthSubmitting}
              >
                {isAuthSubmitting ? "Traitement..." : isLoginMode ? "Se connecter" : "Créer mon espace"}
              </Button>
            </form>
            <div className="mt-8 text-center">
              <a
                href="https://wa.me/243993650147?text=Bonjour%20Féerie%20Snap%20Event,%20je%20souhaite%20obtenir%20mes%20accès%20créateur."
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-gold transition-colors underline-offset-4 hover:underline flex items-center justify-center gap-2"
              >
                <Sparkles className="h-3 w-3 text-gold" />
                Devenir partenaire Féerie ? Contactez-nous
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      {/* Header Premium */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-gold/10 border border-gold/20">
              <LayoutGrid className="h-5 w-5 text-gold" />
            </div>
            <h1 className="text-sm font-light tracking-[0.3em] uppercase text-white hidden sm:block">
              Console <span className="text-gold font-medium">Dashboard</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
              <User className="h-3 w-3 text-gold" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-400 hover:bg-red-400/5 transition-all"
              onClick={async () => {
                await signOut();
                navigate("/dashboard");
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Quitter
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-12">
        
        {/* Création d'événement */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <PlusCircle className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-bold tracking-widest uppercase">Nouvel Univers</h2>
          </div>
          
          <Card className="bg-white/[0.02] border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
            <CardContent className="p-8">
              <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nom de l'évènement</Label>
                  <Input
                    className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-gold/50"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="ex: Mariage Royal"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Client / Mariés</Label>
                  <Input
                    className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-gold/50"
                    value={newEvent.client_name ?? ""}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, client_name: e.target.value }))}
                    placeholder="Prénoms"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Date Cérémonie</Label>
                  <Input
                    type="date"
                    className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-gold/50"
                    value={newEvent.event_date ?? ""}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, event_date: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-4 flex justify-end pt-4">
                  <Button
                    type="submit"
                    className="btn-gold px-10 h-12 rounded-full uppercase tracking-[0.2em] text-[10px] font-black"
                    disabled={isCreatingEvent}
                  >
                    {isCreatingEvent ? "Création..." : "Initialiser l'évènement"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Liste des événements */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-gold" />
              <h2 className="text-lg font-bold tracking-widest uppercase">Mes Projets</h2>
              <Badge className="bg-gold/10 text-gold border-gold/20 ml-4 px-3">{events.length}</Badge>
            </div>
          </div>

          {isLoadingEvents ? (
            <div className="py-20 text-center opacity-30">Chargement de la collection...</div>
          ) : events.length === 0 ? (
            <Card className="bg-white/[0.01] border-dashed border-white/10 py-20 text-center">
              <p className="text-muted-foreground italic">Aucun univers créé pour le moment.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events.map((event) => {
                const baseUrl = window.location.origin;
                const guestUrl = `${baseUrl}/${event.slug}`;

                return (
                  <Card
                    key={event.id}
                    className="group bg-white/[0.03] border-white/5 hover:border-gold/30 hover:bg-white/[0.05] transition-all duration-500 rounded-2xl overflow-hidden"
                  >
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-white tracking-wide">{event.name}</h3>
                          <Badge className={event.status === "published" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-muted-foreground"}>
                            {event.status === "published" ? "Actif" : "Brouillon"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-6 text-[11px] text-muted-foreground uppercase tracking-widest">
                          <span className="flex items-center gap-2"><Users className="h-3 w-3 text-gold" /> {event.client_name || "N/A"}</span>
                          <span className="flex items-center gap-2"><Calendar className="h-3 w-3 text-gold" /> {event.event_date || "Date non fixée"}</span>
                          <span className="flex items-center gap-2"><LinkIcon className="h-3 w-3 text-gold" /> /{event.slug}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest"
                          onClick={() => {
                            navigator.clipboard.writeText(guestUrl);
                            toast({ title: "Lien copié" });
                          }}
                        >
                          Lien Invité
                        </Button>
                        <Button
                          className="rounded-xl bg-white text-black hover:bg-gold hover:text-white transition-all text-[10px] uppercase tracking-widest font-bold"
                          size="sm"
                          onClick={() => navigate(`/${event.slug}/admin`)}
                        >
                          Gérer vœux <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          className="rounded-xl bg-gold/10 text-gold hover:bg-gold hover:text-white border border-gold/20 transition-all text-[10px] uppercase tracking-widest font-bold"
                          size="sm"
                          onClick={() => navigate(`/${event.slug}/qr-codes`)}
                        >
                          <QrCode className="mr-2 h-4 w-4" /> QR Codes
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer info */}
        <footer className="pt-20 pb-10 text-center opacity-30">
           <div className="flex justify-center items-center gap-4 mb-4">
              <div className="h-px w-8 bg-gold/50" />
              <Sparkles className="h-3 w-3 text-gold" />
              <div className="h-px w-8 bg-gold/50" />
           </div>
           <p className="text-[9px] uppercase tracking-[0.6em] text-muted-foreground font-serif">
             Féerie Snap Event • Orchestrateur de Souvenirs
           </p>
        </footer>
      </div>
    </div>
  );
};

export default AdminDashboard;