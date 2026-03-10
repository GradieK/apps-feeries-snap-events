import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Printer, Download } from "lucide-react";
import { useParams } from "react-router-dom";
import QRCode from "react-qr-code";

const QRCodePage = () => {
  const { slug } = useParams();
  const handlePrint = () => {
    window.print();
  };

  const tables = Array.from({ length: 26 }, (_, i) => i + 1);
  const baseUrl = window.location.origin;
  const qrCodeUrl = slug ? `${baseUrl}/${slug}` : `${baseUrl}/`;

  return (
    <div className="min-h-screen bg-gradient-elegant">
      {/* Header - masqué lors de l'impression */}
      <div className="print:hidden bg-card border-b border-gold/20 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-elegant-black flex items-center gap-2">
              <QrCode className="h-6 w-6 text-gold" />
              QR Codes pour les Tables
            </h1>
            <div className="flex items-center gap-4">
              <Button onClick={handlePrint} variant="wedding" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button 
                onClick={() => window.location.href = slug ? `/${slug}/admin` : "/"} 
                variant="elegant" 
                size="sm"
              >
                Administration
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions - masquées lors de l'impression */}
      <div className="print:hidden container mx-auto px-4 py-4">
        <Card className="shadow-soft border-gold/20 mb-6">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-muted-foreground">
                Imprimez cette page pour obtenir les chevalets QR Code pour chaque table.
                Chaque QR Code redirige vers <strong>{qrCodeUrl}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Codes Grid - optimisé pour l'impression */}
      <div className="container mx-auto px-4 pb-8 print:p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
          {tables.map((tableNumber) => (
            <div
              key={tableNumber}
              className="break-inside-avoid"
            >
              <Card className="shadow-elegant border-gold/20 print:shadow-none print:border-2 print:border-gold print:break-inside-avoid">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl text-elegant-black print:text-2xl">
                    Table {tableNumber.toString().padStart(2, '0')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  {/* QR Code Placeholder */}
                  <div className="mx-auto w-48 h-48 border-2 border-gold/30 rounded-lg flex items-center justify-center bg-cream">
                    <QRCode value={`${qrCodeUrl}?t=${tableNumber}`} size={176} />
                  </div>
                  
                  {/* URL lisible */}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-elegant-black mb-1">
                      Livre d'Or Digital
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      {`${qrCodeUrl}?t=${tableNumber}`}
                    </p>
                  </div>
                  
                  {/* Instructions */}
                  <div className="text-center text-xs text-muted-foreground leading-relaxed">
                    <p>Scannez pour partager</p>
                    <p>vos vœux de bonheur</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Footer - masqué lors de l'impression */}
      <div className="print:hidden text-center py-8 text-sm text-muted-foreground">
        <p>💡 Conseil : Imprimez sur du papier cartonné pour de meilleurs chevalets</p>
      </div>

      {/* Styles d'impression */}
      <style>
        {`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        `}
      </style>
    </div>
  );
};

export default QRCodePage;