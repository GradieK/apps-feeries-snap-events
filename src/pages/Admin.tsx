import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LogIn, 
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
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Types pour les vœux
type WishType = "text" | "audio" | "image" | "video";

interface Wish {
  id: string;
  name: string;
  table_number: number;
  type: WishType;
  content?: string | null;
  file_url?: string | null;
  filename?: string | null;
  created_at: string;
  mime_type?: string | null;
  file_size?: number | null;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Charger les vœux depuis Supabase avec sécurité renforcée
  const loadWishes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_wishes_admin', {
        admin_password: 'Voeuxdor'
      });

      if (error) {
        throw error;
      }

      setWishes((data || []).map(wish => ({
        ...wish,
        type: wish.type as WishType
      })));
    } catch (error) {
      console.error('Error loading wishes:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les vœux",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadWishes();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Authentification simple avec mot de passe unique
    if (password === "Voeuxdor") {
      setIsAuthenticated(true);
      toast({
        title: "Connexion réussie 💕",
        description: "Bienvenue dans le panneau d'administration des vœux",
      });
    } else {
      toast({
        title: "Accès refusé",
        description: "Mot de passe incorrect",
        variant: "destructive",
      });
    }
  };

  const handleExportZip = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      toast({
        title: "Préparation de l'export...",
        description: "Téléchargement des fichiers en cours",
      });

      // Ajouter les messages texte
      const textWishes = wishes.filter(wish => wish.type === "text");
      if (textWishes.length > 0) {
        const textContent = textWishes.map(wish => 
          `=== ${wish.name} - Table ${wish.table_number} ===\n` +
          `Date: ${new Date(wish.created_at).toLocaleString("fr-FR")}\n` +
          `Message: ${wish.content || 'Aucun contenu'}\n\n`
        ).join('');
        zip.file("messages-texte.txt", textContent);
      }

      // Ajouter les fichiers audio et média
      const fileWishes = wishes.filter(wish => wish.file_url && (wish.type === "audio" || wish.type === "image" || wish.type === "video"));
      
      for (const wish of fileWishes) {
        if (wish.file_url) {
          try {
            const response = await fetch(wish.file_url);
            if (response.ok) {
              const blob = await response.blob();
              const extension = wish.filename?.split('.').pop() || (wish.type === 'audio' ? 'webm' : wish.type === 'image' ? 'jpg' : 'mp4');
              const fileName = `${wish.type}s/${wish.name}_table${wish.table_number}_${new Date(wish.created_at).toISOString().split('T')[0]}.${extension}`;
              zip.file(fileName, blob);
            }
          } catch (error) {
            console.error(`Erreur téléchargement ${wish.filename}:`, error);
          }
        }
      }

      // Générer et télécharger le ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `voeux-mariage-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export terminé 📦",
        description: `${wishes.length} vœux exportés avec succès`,
      });
    } catch (error) {
      console.error('Erreur export ZIP:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible de créer l'archive ZIP",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    const textWishes = wishes.filter(wish => wish.type === "text");
    const csvContent = [
      ["Nom", "Table", "Message", "Date"],
      ...textWishes.map(wish => [
        wish.name,
        wish.table_number.toString(),
        wish.content || "",
        new Date(wish.created_at).toLocaleString("fr-FR")
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "vœux_texte_mariage.csv");
    link.click();
    
    toast({
      title: "Export CSV terminé 📊",
      description: "Les messages texte ont été téléchargés",
    });
  };

  const getTypeIcon = (type: WishType) => {
    switch (type) {
      case "text": return <MessageSquare className="h-4 w-4" />;
      case "audio": return <Mic className="h-4 w-4" />;
      case "image": return <Camera className="h-4 w-4" />;
      case "video": return <Camera className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: WishType) => {
    switch (type) {
      case "text": return "default";
      case "audio": return "secondary";
      case "image": return "outline";
      case "video": return "destructive";
      default: return "default";
    }
  };

  const filteredWishes = selectedTable === "all" 
    ? wishes 
    : wishes.filter(wish => wish.table_number.toString() === selectedTable);

  const stats = {
    total: wishes.length,
    text: wishes.filter(w => w.type === "text").length,
    audio: wishes.filter(w => w.type === "audio").length,
    media: wishes.filter(w => w.type === "image" || w.type === "video").length,
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-elegant flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elegant border-gold/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-elegant-black flex items-center justify-center gap-2">
              <Heart className="h-6 w-6 text-gold fill-gold" />
              Accès Sécurisé
            </CardTitle>
            <p className="text-elegant-gray mt-2">
              Cette section est réservée aux mariés.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Veuillez entrer le mot de passe..."
                  className="border-gold/30 focus:border-gold"
                  required
                />
              </div>
              
              <Button type="submit" variant="wedding" size="lg" className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                Entrer
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-elegant">
      {/* Header */}
      <div className="bg-card border-b border-gold/20 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-gold fill-gold" />
              <h1 className="text-2xl font-bold text-elegant-black">
                Panneau d'Administration
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadWishes}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isLoading ? 'Actualisation...' : 'Actualiser'}
              </Button>
              <Button
                onClick={() => setIsAuthenticated(false)}
                variant="outline"
                size="sm"
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="text-center mb-6">
            <p className="text-elegant-gray">
              Retrouvez ici tous les vœux laissés par vos invités
              <span className="ml-2 text-gold">💕</span>
            </p>
          </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-soft border-gold/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total vœux</p>
                  <p className="text-2xl font-bold text-elegant-black">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-gold" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-gold/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages texte</p>
                  <p className="text-2xl font-bold text-elegant-black">{stats.text}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-gold" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-gold/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages audio</p>
                  <p className="text-2xl font-bold text-elegant-black">{stats.audio}</p>
                </div>
                <Mic className="h-8 w-8 text-gold" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft border-gold/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Photos/Vidéos</p>
                  <p className="text-2xl font-bold text-elegant-black">{stats.media}</p>
                </div>
                <Camera className="h-8 w-8 text-gold" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6 shadow-soft border-gold/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Label>Filtrer par table :</Label>
                </div>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les tables</SelectItem>
                    {[...Array(15)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        Table {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleExportCSV} variant="elegant" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV Messages
                </Button>
                <Button onClick={handleExportZip} variant="wedding" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export ZIP Complet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wishes List */}
        <Card className="shadow-elegant border-gold/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-gold" />
              Vœux d'Amour de vos Invités ({filteredWishes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-4"></div>
                  <p className="text-elegant-gray">Chargement des vœux...</p>
                </div>
              ) : (
                filteredWishes.map((wish) => (
                  <div 
                    key={wish.id}
                    className="p-4 border border-gold/20 rounded-lg bg-gradient-hero hover:shadow-soft transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge variant={getTypeBadgeVariant(wish.type)} className="flex items-center gap-1">
                          {getTypeIcon(wish.type)}
                          {wish.type}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TableIcon className="h-4 w-4" />
                          Table {wish.table_number}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(wish.created_at).toLocaleString("fr-FR")}
                        </div>
                      </div>
                      <div className="font-semibold text-elegant-black">{wish.name}</div>
                    </div>
                  
                    <div className="mt-3">
                      {wish.type === "text" && wish.content && (
                        <div className="bg-secondary/30 p-3 rounded border-l-4 border-gold">
                          <p className="text-sm">{wish.content}</p>
                        </div>
                      )}
                      
                      {wish.type === "audio" && wish.file_url && (
                        <div className="bg-secondary/30 p-3 rounded">
                          <audio controls className="w-full">
                            <source src={wish.file_url} type={wish.mime_type || "audio/webm"} />
                            Votre navigateur ne supporte pas l'élément audio.
                          </audio>
                          <p className="text-xs text-muted-foreground mt-1">{wish.filename}</p>
                        </div>
                      )}
                      
                      {wish.type === "image" && wish.file_url && (
                        <div className="bg-secondary/30 p-3 rounded">
                          <img 
                            src={wish.file_url} 
                            alt={`Photo de ${wish.name}`}
                            className="max-w-xs max-h-40 rounded object-cover"
                          />
                          <p className="text-xs text-muted-foreground mt-1">{wish.filename}</p>
                        </div>
                      )}
                      
                      {wish.type === "video" && wish.file_url && (
                        <div className="bg-secondary/30 p-3 rounded">
                          <video 
                            controls 
                            className="max-w-xs max-h-40 rounded"
                          >
                            <source src={wish.file_url} type={wish.mime_type || "video/mp4"} />
                            Votre navigateur ne supporte pas l'élément vidéo.
                          </video>
                          <p className="text-xs text-muted-foreground mt-1">{wish.filename}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {!isLoading && filteredWishes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="mx-auto h-12 w-12 mb-4 opacity-50 text-gold" />
                  <p>Aucun vœu trouvé pour cette sélection.</p>
                  <p className="text-sm mt-2">
                    Les vœux de vos invités apparaîtront ici
                    <span className="ml-1 text-gold">✨</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;