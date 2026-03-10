import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {useParams} from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Users, Camera, Mic, MessageSquare, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import weddingHero from "@/assets/wedding-hero.jpg";

const Home = () => {
  const {slug} = useParams()
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [table, setTable] = useState("");
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

    if (!table) {
      toast({
        title: "Table requise",
        description: "Veuillez sélectionner votre numéro de table",
        variant: "destructive",
      });
      return;
    }

    // Sauvegarder le prénom
    localStorage.setItem("wedding-guest-name", name.trim());
    
    // Rediriger vers la page de vœux avec paramètres
    navigate(`/${slug}/voeux?t=${table}&n=${encodeURIComponent(name.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gradient-elegant">
      {/* Hero Section */}
      <div className="relative">
        <div 
          className="h-64 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${weddingHero})` }}
        >
          <div className="absolute inset-0 bg-gradient-hero" />
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-elegant-black">
            <Heart className="mx-auto mb-4 h-12 w-12 text-gold animate-pulse fill-gold" />
            <h1 className="text-4xl md:text-6xl font-bold text-elegant-black mb-4">
              Vœux d'Or
              <span className="ml-2 text-gold animate-pulse">✨</span>
            </h1>
            <p className="text-lg md:text-xl text-elegant-gray mb-8">
              Laissez un souvenir inoubliable aux mariés
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-md -mt-20 relative z-10">
        <Card className="w-full max-w-md shadow-elegant border-gold/20 bg-card/95 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-elegant-black mb-2 flex items-center justify-center gap-2">
              <Heart className="h-6 w-6 text-gold fill-gold" />
              Bienvenue
              <span className="ml-1 text-gold">💕</span>
            </CardTitle>
            <p className="text-elegant-gray">
              Partager votre amour et vos vœux
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-elegant-black font-medium">
                <span className="inline-flex items-center gap-2">
                  Votre prénom <span className="text-gold text-sm">✨</span>
                </span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dites-nous qui vous êtes..."
                className="border-gold/30 focus:border-gold bg-card text-elegant-black"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="table" className="text-elegant-black font-medium">
                <span className="inline-flex items-center gap-2">
                  Votre numéro de table <span className="text-gold">🪑</span>
                </span>
              </Label>
              <Select value={table} onValueChange={setTable} required>
                <SelectTrigger className="border-gold/30 focus:border-gold bg-card text-elegant-black">
                  <SelectValue placeholder="À quelle table êtes-vous assis(e) ?" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(26)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Table {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleContinue}
              variant="wedding" 
              size="lg" 
              className="w-full"
              disabled={!name || !table}
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Commencer l'aventure
              <span className="ml-2 text-sm">🎉</span>
            </Button>

            {/* Features Preview */}
            <div className="mt-8 pt-6 border-t border-gold/20">
              <p className="text-center text-sm text-muted-foreground mb-4">
                Vous pourrez partager :
              </p>
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <Mic className="mx-auto h-8 w-8 text-gold mb-2" />
                  <span className="text-xs text-muted-foreground">Audio</span>
                </div>
                <div className="text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-gold mb-2" />
                  <span className="text-xs text-muted-foreground">Texte</span>
                </div>
                <div className="text-center">
                  <Camera className="mx-auto h-8 w-8 text-gold mb-2" />
                  <span className="text-xs text-muted-foreground">Photo/Vidéo</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;