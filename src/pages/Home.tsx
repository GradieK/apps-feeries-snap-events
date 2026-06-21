import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Mic, MessageSquare, ArrowRight, Sparkles, Stars } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEvent } from "@/hooks/useEvent";

const Home = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [table, setTable] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { event } = useEvent();

  useEffect(() => {
    const savedName = localStorage.getItem("wedding-guest-name");
    if (savedName) setName(savedName);
  }, []);

  useEffect(() => {
    const t = searchParams.get("t");
    if (t && /^\d+$/.test(t)) setTable(t);
  }, [searchParams]);

  const handleContinue = () => {
    if (!name.trim()) {
      toast({
        title: "Prénom requis",
        description: "Veuillez saisir votre prénom pour continuer",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("wedding-guest-name", name.trim());
    navigate(`/${slug}/voeux?t=${table}&n=${encodeURIComponent(name.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[45vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-background z-0">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--primary)_0%,_transparent_65%)]" />
        </div>

        <div className="relative z-10 text-center px-4 space-y-5">
          {/* Ornement supérieur */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-12 bg-primary/40" />
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            <div className="h-px w-12 bg-primary/40" />
          </div>

          <div className="space-y-1">
            <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-[0.06em] text-gold leading-none">
              Moments
            </h1>
            <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-[0.06em] text-gold leading-none">
              Events
            </h1>
          </div>

          {event?.name ? (
            <p className="text-[11px] text-primary/50 uppercase tracking-[0.5em] font-light pt-1">
              {event.name}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.4em] font-light pt-1">
              by Bless Events
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 max-w-md -mt-10 relative z-20 pb-16">
        <Card className="card-premium backdrop-blur-md bg-card/80 border-primary/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl mb-1 flex items-center justify-center gap-2">
              <Stars className="h-5 w-5 text-primary" />
              <span className="text-gold">Bienvenue</span>
              <Sparkles className="h-5 w-5 text-primary" />
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Identifiez-vous pour commencer à partager
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="name" className="text-foreground font-medium flex items-center gap-2 text-xs uppercase tracking-widest">
                Votre prénom
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                placeholder="Dites-nous qui vous êtes..."
                className="bg-black/40 border-border focus:border-primary text-foreground h-12 rounded-xl"
                required
              />
            </div>

            <button
              onClick={handleContinue}
              className="btn-gold w-full flex items-center justify-center gap-2 h-12 rounded-full uppercase tracking-widest text-xs font-black"
              disabled={!name}
            >
              <ArrowRight className="h-4 w-4" />
              Partager mes souvenirs
            </button>

            {/* Options disponibles */}
            <div className="pt-5 border-t border-white/8">
              <p className="text-center text-[10px] text-muted-foreground mb-5 uppercase tracking-widest">
                Options de partage disponibles
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { Icon: Mic, label: "Audio" },
                  { Icon: MessageSquare, label: "Récit" },
                  { Icon: Camera, label: "Photo" },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-white/5 border border-white/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="page-footer">
        <div className="page-footer-divider">
          <div className="page-footer-line" />
          <Sparkles className="h-3 w-3 text-primary" />
          <div className="page-footer-line" />
        </div>
        <p className="page-footer-text">Une expérience signée Bless Events</p>
      </footer>
    </div>
  );
};

export default Home;
