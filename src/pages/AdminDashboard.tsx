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
  LayoutGrid,
  Shield,
} from "lucide-react";

type EventRow = Tables<"events">;
type NewEvent = Pick<TablesInsert<"events">, "name" | "client_name" | "event_date" | "status">;

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

  const [newEvent, setNewEvent] = useState<NewEvent>({
    name: "",
    client_name: "",
    event_date: "",
    status: "draft",
  });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const blessRole = (user as any)?.app_metadata?.bless_role as "admin" | "organizer" | undefined;
  const blessEventId = (user as any)?.app_metadata?.bless_event_id as string | undefined;
  const isBlessAdmin = blessRole === "admin";
  const isBlessOrganizer = blessRole === "organizer";
  const isBlessUser = isBlessAdmin || isBlessOrganizer;

  const loadEvents = async () => {
    if (!user) return;
    setIsLoadingEvents(true);

    let query = supabase.from("events").select("*");
    if (isBlessAdmin) {
      query = query.eq("source", "bless_events");
    } else if (isBlessOrganizer) {
      // Lié via bless_event_id (stable), pas via owner_id qui dépend de l'email
      // utilisé lors du provisioning côté Bless Events.
      if (!blessEventId) {
        setEvents([]);
        setIsLoadingEvents(false);
        return;
      }
      query = query.eq("bless_event_id", blessEventId);
    } else {
      query = query.eq("owner_id", user.id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur de chargement", description: "Impossible de charger les événements.", variant: "destructive" });
    } else {
      setEvents(data || []);
    }
    setIsLoadingEvents(false);
  };

  useEffect(() => {
    if (user) loadEvents();
    else setEvents([]);
  }, [user?.id]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthSubmitting(true);
    try {
      if (!authEmail || !authPassword) return;
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) throw error;
      toast({ title: "Bienvenue", description: "Connexion établie avec succès." });
    } catch {
      toast({ title: "Accès refusé", description: "Identifiants invalides ou compte non autorisé.", variant: "destructive" });
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
        const { data, error } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
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

      const { data, error } = await supabase.from("events").insert(payload).select("*").single();
      if (error) throw error;

      setEvents((prev) => [data as EventRow, ...prev]);
      setNewEvent({ name: "", client_name: "", event_date: "", status: "draft" });
      toast({ title: "Événement créé", description: "Votre nouvel événement Moments Events est prêt." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer l'événement.", variant: "destructive" });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="page-loader">
        <div className="page-loader-inner">
          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-primary/50 text-xs tracking-[0.3em] uppercase">Initialisation...</p>
        </div>
      </div>
    );
  }

  // ── Écran de connexion ──
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/[0.02] border-white/10 backdrop-blur-xl">
          <CardHeader className="text-center space-y-6 pt-8">
            <img src="/logo.png" alt="Moments Events" className="h-12 w-auto mx-auto" />
            <div className="space-y-1">
              <CardTitle className="text-xl text-foreground tracking-tight">Espace Créateur</CardTitle>
              <p className="text-muted-foreground text-sm">Gérez l'élégance de vos événements.</p>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleAuthSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-primary/70">Email professionnel</Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-black/40 border-white/5 focus:border-primary/50 h-12 rounded-xl"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="nom@bless-events.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] uppercase tracking-widest text-primary/70">Secret</Label>
                <Input
                  id="password"
                  type="password"
                  className="bg-black/40 border-white/5 focus:border-primary/50 h-12 rounded-xl"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full btn-gold h-12 rounded-xl uppercase tracking-widest text-xs font-black"
                disabled={isAuthSubmitting}
              >
                {isAuthSubmitting ? "Traitement..." : "Se connecter"}
              </Button>
            </form>
            <div className="mt-8 text-center">
              <a
                href="https://wa.me/243993650147?text=Bonjour%20Bless%20Events,%20je%20souhaite%20obtenir%20mes%20accès%20créateur."
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                Devenir partenaire Bless Events ? Contactez-nous
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Moments Events" className="h-8 w-auto" />
            <div className="h-5 w-px bg-white/10 hidden sm:block" />
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              {isBlessAdmin ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <LayoutGrid className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="hidden sm:flex flex-col">
              <h1 className="text-sm font-light tracking-[0.3em] uppercase text-foreground">
                Console <span className="text-gold font-semibold">Dashboard</span>
              </h1>
              {isBlessAdmin && (
                <span className="text-[9px] text-primary/50 uppercase tracking-widest">
                  Vue Bless Events — Tous les événements
                </span>
              )}
              {blessRole === "organizer" && (
                <span className="text-[9px] text-primary/50 uppercase tracking-widest">
                  Espace Organisateur
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
              <User className="h-3 w-3 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-400 hover:bg-red-400/5 transition-all text-[10px] uppercase tracking-widest"
              onClick={async () => { await signOut(); navigate("/dashboard"); }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Quitter
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-12">

        {/* Formulaire de création — masqué pour les utilisateurs Bless Events */}
        {!isBlessUser && (
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <PlusCircle className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-widest uppercase">Nouvel Univers</h2>
            </div>
            <Card className="bg-white/[0.02] border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
              <CardContent className="p-8">
                <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nom de l'évènement</Label>
                    <Input
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                      value={newEvent.name}
                      onChange={(e) => setNewEvent((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="ex: Mariage Royal"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Client / Mariés</Label>
                    <Input
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                      value={newEvent.client_name ?? ""}
                      onChange={(e) => setNewEvent((prev) => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Prénoms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Date Cérémonie</Label>
                    <Input
                      type="date"
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                      value={newEvent.event_date ?? ""}
                      onChange={(e) => setNewEvent((prev) => ({ ...prev, event_date: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-4 flex justify-end pt-2">
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
        )}

        {/* Liste des événements */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-widest uppercase">
                {isBlessAdmin ? "Tous les Événements" : "Mes Projets"}
              </h2>
              <Badge className="bg-primary/10 text-primary border-primary/20 ml-2 px-3 text-xs">
                {events.length}
              </Badge>
            </div>
          </div>

          {isLoadingEvents ? (
            <div className="py-20 text-center">
              <div className="page-loader-inner">
                <Sparkles className="h-6 w-6 text-primary animate-pulse mx-auto" />
                <p className="text-muted-foreground text-xs tracking-widest uppercase mt-3">Chargement de la collection...</p>
              </div>
            </div>
          ) : events.length === 0 ? (
            <Card className="bg-white/[0.01] border-dashed border-white/10 py-20 text-center">
              <Heart className="mx-auto h-7 w-7 mb-4 opacity-20 text-primary" />
              <p className="text-muted-foreground italic text-sm">Aucun événement pour le moment.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events.map((event) => {
                const baseUrl = window.location.origin;
                const guestUrl = `${baseUrl}/${event.slug}/voeux`;

                return (
                  <Card
                    key={event.id}
                    className="group bg-white/[0.03] border-white/5 hover:border-primary/30 hover:bg-white/[0.05] transition-all duration-500 rounded-2xl overflow-hidden"
                  >
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-foreground tracking-wide">{event.name}</h3>
                          <Badge className={event.status === "published"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
                            : "bg-white/5 text-muted-foreground text-[10px]"}>
                            {event.status === "published" ? "Actif" : "Brouillon"}
                          </Badge>
                          {(event as any).source === "bless_events" && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px]">
                              Bless Events
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-5 text-[10px] text-muted-foreground uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Users className="h-3 w-3 text-primary" /> {event.client_name || "N/A"}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-primary" /> {event.event_date || "Date non fixée"}</span>
                          <span className="flex items-center gap-1.5"><LinkIcon className="h-3 w-3 text-primary" /> /{event.slug}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-widest"
                          onClick={() => {
                            navigator.clipboard.writeText(guestUrl);
                            toast({ title: "Lien invité copié" });
                          }}
                        >
                          <LinkIcon className="mr-1.5 h-3 w-3" /> Lien Invité
                        </Button>
                        <Button
                          variant="secondary"
                          className="rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-black border border-primary/20 transition-all text-[10px] uppercase tracking-widest font-bold"
                          size="sm"
                          onClick={() => navigate(`/${event.slug}/qr-codes`)}
                        >
                          <QrCode className="mr-1.5 h-3 w-3" /> QR Code
                        </Button>
                        <Button
                          className="rounded-xl bg-foreground text-background hover:bg-primary hover:text-black transition-all text-[10px] uppercase tracking-widest font-bold"
                          size="sm"
                          onClick={() => navigate(`/${event.slug}/admin`)}
                        >
                          Gérer vœux <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <div className="page-footer-divider">
            <div className="page-footer-line" />
            <Sparkles className="h-3 w-3 text-primary" />
            <div className="page-footer-line" />
          </div>
          <p className="page-footer-text">Moments Events by Bless Events • Orchestrateur de Souvenirs</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminDashboard;
