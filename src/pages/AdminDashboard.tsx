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
import { Calendar, Heart, Link as LinkIcon, LogOut, PlusCircle, QrCode, Settings2, Users } from "lucide-react";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthSubmitting(true);
    try {
      if (!authEmail || !authPassword) return;

      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        toast({
          title: "Connexion réussie",
          description: "Bienvenue dans votre espace d'administration.",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        toast({
          title: "Compte créé",
          description: "Vérifiez vos emails pour confirmer votre compte.",
        });
        setIsLoginMode(true);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur d'authentification",
        description: error instanceof Error ? error.message : "Veuillez réessayer.",
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
      toast({
        title: "Nom requis",
        description: "Veuillez saisir un nom d'événement.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingEvent(true);
    try {
      const baseSlug = slugify(newEvent.name);
      let slug = baseSlug;
      let suffix = 1;

      // s'assurer que le slug est unique
      // (boucle simple côté client, acceptable pour quelques events)
      // eslint-disable-next-line no-constant-condition
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
      setNewEvent({
        name: "",
        client_name: "",
        event_date: "",
        status: "draft",
      });

      toast({
        title: "Événement créé",
        description: "Vous pouvez maintenant partager le lien ou générer les QR codes.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur de création",
        description: error instanceof Error ? error.message : "Impossible de créer l'événement.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-elegant">
        <div className="text-center text-elegant-gray">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-elegant flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elegant border-gold/20">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl text-elegant-black flex items-center justify-center gap-2">
              <Heart className="h-6 w-6 text-gold fill-gold" />
              Espace Mariés
            </CardTitle>
            <p className="text-elegant-gray text-sm">
              Connectez-vous pour créer et gérer vos événements.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="vous@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                variant="wedding"
                disabled={isAuthSubmitting}
              >
                {isAuthSubmitting
                  ? "Veuillez patienter..."
                  : isLoginMode
                    ? "Se connecter"
                    : "Créer un compte"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isLoginMode ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}{" "}
              <button
                type="button"
                className="text-gold underline-offset-2 hover:underline"
                onClick={() => setIsLoginMode((v) => !v)}
              >
                {isLoginMode ? "Créer un compte" : "Se connecter"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-elegant">
      <div className="bg-card border-b border-gold/20 shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-gold fill-gold" />
            <h1 className="text-2xl font-bold text-elegant-black">Tableau de bord</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate("/dashboard");
              }}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Création d'événement */}
        <Card className="shadow-soft border-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-elegant-black">
              <PlusCircle className="h-5 w-5 text-gold" />
              Créer un nouvel événement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1 md:col-span-2">
                <Label>Nom de l'événement</Label>
                <Input
                  value={newEvent.name}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Mariage Sarah & Julien"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Nom des mariés / client</Label>
                <Input
                  value={newEvent.client_name ?? ""}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, client_name: e.target.value }))}
                  placeholder="Sarah & Julien"
                />
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newEvent.event_date ?? ""}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, event_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-4 flex justify-end">
                <Button
                  type="submit"
                  variant="wedding"
                  disabled={isCreatingEvent}
                >
                  {isCreatingEvent ? "Création..." : "Créer l'événement"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Liste des événements */}
        <Card className="shadow-elegant border-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-elegant-black">
              <Settings2 className="h-5 w-5 text-gold" />
              Vos événements
              <Badge variant="outline" className="ml-2">
                {events.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="text-center text-muted-foreground py-8">
                Chargement de vos événements...
              </div>
            ) : events.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Aucun événement pour le moment. Créez votre premier événement ci-dessus.
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => {
                  const baseUrl = window.location.origin;
                  const guestUrl = `${baseUrl}/${event.slug}`;
                  const adminUrl = `${baseUrl}/${event.slug}/admin`;
                  const qrUrl = `${baseUrl}/${event.slug}/qr-codes`;

                  return (
                    <div
                      key={event.id}
                      className="p-4 border border-gold/20 rounded-lg bg-card/80 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-elegant-black">
                            {event.name}
                          </span>
                          <Badge variant={event.status === "published" ? "default" : "outline"}>
                            {event.status || "draft"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {event.client_name && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.client_name}
                            </span>
                          )}
                          {event.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {event.event_date}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            {event.slug}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(guestUrl);
                            toast({
                              title: "Lien copié",
                              description: "Lien invité copié dans le presse-papiers.",
                            });
                          }}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Lien invités
                        </Button>
                        <Button
                          variant="elegant"
                          size="sm"
                          onClick={() => navigate(`/${event.slug}/admin`)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Voir les vœux
                        </Button>
                        <Button
                          variant="wedding"
                          size="sm"
                          onClick={() => navigate(`/${event.slug}/qr-codes`)}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          QR Codes
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          Partagez le lien invité de chaque événement ou imprimez les QR codes pour les tables.
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

