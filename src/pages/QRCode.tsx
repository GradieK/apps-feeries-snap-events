import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ChevronLeft, Sparkles, Download } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";

const QRCodePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (printRef.current) {
      const canvas = await html2canvas(printRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true, // Aide à charger les polices/images externes
      });
      const link = document.createElement("a");
      link.download = `QR-Féerie-${slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  const baseUrl = window.location.origin;
  const qrCodeUrl = slug ? `${baseUrl}/${slug}` : baseUrl;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      {/* Barre d'outils */}
      <div className="print:hidden border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/${slug}/admin`)} className="text-slate-400">
            <ChevronLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          
          <div className="flex gap-3">
            <Button onClick={handleDownload} variant="outline" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10">
              <Download className="mr-2 h-4 w-4" /> Télécharger (PNG HD)
            </Button>
            <Button onClick={handlePrint} className="bg-[#D4AF37] text-black font-bold hover:bg-[#C5A028]">
              <Printer className="mr-2 h-4 w-4" /> Imprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Zone de capture et d'impression */}
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div 
          ref={printRef}
          className="max-w-xl w-full bg-white text-black p-12 rounded-[2.5rem] text-center flex flex-col items-center border-[8px] border-[#D4AF37]/10 print:border-none shadow-2xl"
        >
          {/* Logo corrigé - Utilisation d'un conteneur discret */}
          <div className="mb-10">
             <div className="bg-black p-3 rounded-xl inline-block">
                <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
             </div>
          </div>

          {/* Titre avec dégradé Or CSS pour éviter le fond noir des images */}
          <h2 className="text-5xl font-serif font-bold mb-4 leading-tight">
            Immortalisez <br /> 
            <span className="gold-text italic">l'instant</span>
          </h2>
          
          <p className="text-slate-500 mb-10 uppercase tracking-[0.4em] text-[10px] font-black">
            Scannez pour partager vos souvenirs
          </p>

          {/* QR CODE */}
          <div className="p-10 border-[1px] border-slate-100 rounded-[3rem] bg-white mb-10 shadow-sm">
            <QRCode value={qrCodeUrl} size={220} level="H" />
          </div>

          <div className="space-y-6 w-full flex flex-col items-center">
            {/* Badge SCAN MOI en pur CSS */}
            <div className="gold-gradient-bg px-8 py-2 rounded-full flex items-center gap-3 shadow-md">
              <Sparkles className="h-4 w-4 text-black/70" />
              <span className="text-sm font-black uppercase tracking-[0.2em] text-black italic">
                SCAN MOI
              </span>
              <Sparkles className="h-4 w-4 text-black/70" />
            </div>

            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              Feerie Snap Event • {slug?.replace(/-/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
        /* Effet de texte doré métallique */
        .gold-text {
          background: linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }

        /* Fond doré métallique pour les badges */
        .gold-gradient-bg {
          background: linear-gradient(135deg, #BF953F 0%, #FCF6BA 45%, #B38728 100%);
        }

        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          .min-h-screen { background: white !important; color: black !important; }
          .gold-text { -webkit-print-color-adjust: exact; }
          .gold-gradient-bg { -webkit-print-color-adjust: exact; }
        }
        `}
      </style>
    </div>
  );
};

export default QRCodePage;