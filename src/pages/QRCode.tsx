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
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `QR-MomentsEvents-${slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  const baseUrl = window.location.origin;
  const qrCodeUrl = slug ? `${baseUrl}/${slug}` : baseUrl;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Barre d'outils */}
      <div className="print:hidden app-nav">
        <div className="app-nav-inner">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
            <img src="/logo.png" alt="Moments Events" className="h-7 w-auto hidden sm:block" />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 text-[10px] uppercase tracking-widest font-bold"
            >
              <Download className="mr-2 h-4 w-4" /> Télécharger PNG HD
            </Button>
            <Button
              onClick={handlePrint}
              className="btn-gold rounded-md text-[10px] uppercase tracking-widest font-black"
            >
              <Printer className="mr-2 h-4 w-4" /> Imprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Zone d'impression */}
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div
          ref={printRef}
          className="max-w-xl w-full bg-white text-black p-12 rounded-[2.5rem] text-center flex flex-col items-center border-[8px] border-primary/10 print:border-none shadow-2xl"
        >
          {/* Logo */}
          <div className="mb-10">
            <div className="bg-black p-3 rounded-xl inline-block">
              <img src="/logo.png" alt="Moments Events" className="h-10 w-auto" />
            </div>
          </div>

          {/* Titre */}
          <h2 className="text-5xl font-serif font-bold mb-4 leading-tight">
            Immortalisez <br />
            <span className="text-gold italic">l'instant</span>
          </h2>

          <p className="text-slate-400 mb-10 uppercase tracking-[0.4em] text-[10px] font-black">
            Scannez pour partager vos souvenirs
          </p>

          {/* QR CODE */}
          <div className="p-10 border border-slate-100 rounded-[3rem] bg-white mb-10 shadow-sm">
            <QRCode value={qrCodeUrl} size={220} level="H" />
          </div>

          <div className="space-y-6 w-full flex flex-col items-center">
            <div className="gold-gradient-bg px-8 py-2 rounded-full flex items-center gap-3 shadow-md">
              <Sparkles className="h-4 w-4 text-black/70" />
              <span className="text-sm font-black uppercase tracking-[0.2em] text-black italic">
                SCAN MOI
              </span>
              <Sparkles className="h-4 w-4 text-black/70" />
            </div>

            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              Moments Events by Bless Events • {slug?.replace(/-/g, " ")}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          .min-h-screen { background: white !important; color: black !important; }
          .text-gold { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .gold-gradient-bg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default QRCodePage;
