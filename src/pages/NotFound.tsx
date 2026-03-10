import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-elegant">
      <div className="text-center max-w-md px-4">
        <div className="mb-8">
          <h1 className="mb-4 text-6xl font-bold text-gold">404</h1>
          <h2 className="mb-4 text-2xl font-semibold text-elegant-black">Page introuvable</h2>
          <p className="text-muted-foreground">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={() => window.history.back()} 
            variant="elegant" 
            size="lg"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          
          <Button 
            onClick={() => window.location.href = "/"} 
            variant="wedding" 
            size="lg"
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Accueil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
