import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Mic, MessageSquare, ArrowRight, Sparkles, Stars } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Importation du nouveau logo or sur fond noir
import feerieLogo from "/logo.png"; 

const Home = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [table, setTable] = useState<string | null>(null);;
  const navigate = useNavigate();
  const { toast } = useToast();

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

    {/*if (!table) {
      toast({
        title: "Table requise",
        description: "Veuillez sélectionner votre numéro de table",
        variant: "destructive",
      });
      return;
    }*/}

    localStorage.setItem("wedding-guest-name", name.trim());
    // Rediriger vers la page de vœux avec paramètres
    navigate(`/${slug}/voeux?t=${table}&n=${encodeURIComponent(name.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section Premium */}
      <div className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black z-0">
           {/* Texture de fond subtile */}
           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--primary)_0%,_transparent_70%)]" />
        </div>
        
        <div className="relative z-10 text-center px-4">
          <img 
            src={feerieLogo} 
            alt="Féerie Snap Event" 
            className="mx-auto mb-6 h-24 md:h-32 logo-feerie"
          />
          <h1 className="text-4xl md:text-6xl font-bold mb-2 tracking-tight">
            <span className="text-gold">Féerie Snap Event</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto">
            Immortalisez l'événement. Partagez vos plus beaux souvenirs.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-md -mt-12 relative z-20">
        <Card className="card-premium backdrop-blur-md bg-card/80 border-primary/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl mb-2 flex items-center justify-center gap-2">
              <Stars className="h-6 w-6 text-primary" />
              <span className="text-gold">Bienvenue</span>
              <Sparkles className="h-6 w-6 text-primary" />
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Identifiez-vous pour commencer à partager
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="name" className="text-foreground font-medium flex items-center gap-2">
                Votre prénom <Sparkles className="h-4 w-4 text-primary" />
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dites-nous qui vous êtes..."
                className="bg-black/40 border-border focus:border-primary text-foreground"
                required
              />
            </div>

            {/*<div className="space-y-2 text-left">
              <Label htmlFor="table" className="text-foreground font-medium flex items-center gap-2">
                Votre emplacement <span className="text-primary">📍</span>
              </Label>
              <Select value={table} onValueChange={setTable} required>
                <SelectTrigger className="bg-black/40 border-border focus:border-primary text-foreground">
                  <SelectValue placeholder="À quelle table êtes-vous ?" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {[...Array(30)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Table {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>*/}

            <button 
              onClick={handleContinue}
              className="btn-gold w-full flex items-center justify-center gap-2 mt-4"
              disabled={!name}
            >
              <ArrowRight className="h-5 w-5" />
              Partager mes souvenirs
            </button>

            {/* Features Preview */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-center text-xs text-muted-foreground mb-6 uppercase tracking-widest">
                Options de partage disponibles
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-white/5 border border-white/10">
                    <Mic className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase">Audio</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-white/5 border border-white/10">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase">Récit</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-white/5 border border-white/10">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase">Visuel</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <footer className="mt-12 pb-8 text-center">
        <p className="text-xs text-muted-foreground/50 italic font-serif">
          Une expérience signée Féerie Event
        </p>
      </footer>
    </div>
  );
};

export default Home;