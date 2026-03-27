import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type WishType = 'text' | 'audio' | 'image' | 'video';

interface WishData {
  name: string;
  tableNumber: number;
  type: WishType;
  content?: string;
  file?: File;
}

export const useWishUpload = (eventId?: string) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadWish = async (wishData: WishData): Promise<boolean> => {
    setIsUploading(true);
    
    try {
      if (!eventId) {
        throw new Error("Événement introuvable: veuillez recharger la page (QR code) et réessayer.");
      }

      let fileUrl = null;
      let filename = null;
      let mimeType = null;
      let fileSize = null;

      // Handle file upload for audio, image, video
      if (wishData.file && wishData.type !== 'text') {
        const bucket = wishData.type === 'audio' ? 'audio-wishes' : 'media-wishes';
        const folder = `${eventId}/table_${wishData.tableNumber}`;
        const timestamp = Date.now();
        const fileExtension = wishData.file.name.split('.').pop();
        const fileName = `${folder}/${wishData.name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, wishData.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Erreur d'upload: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
        filename = wishData.file.name;
        mimeType = wishData.file.type;
        fileSize = wishData.file.size;
      }

      // Insert wish into database
      const { error: insertError } = await supabase
        .from('wishes')
        .insert({
          event_id: eventId,
          guest_name: wishData.name,
          table_number: wishData.tableNumber || null,
          type: wishData.type,
          content: wishData.content || null,
          file_url: fileUrl,
          filename: filename,
          mime_type: mimeType,
          file_size: fileSize
        });

      if (insertError) {
        const details = [insertError.message, insertError.details, insertError.hint, insertError.code]
          .filter(Boolean)
          .join(" • ");
        throw new Error(`Erreur de sauvegarde: ${details}`);
      }

      toast({
        title: "Vœu envoyé avec succès ! 💕",
        description: "Votre message d'amour a bien été transmis aux mariés.",
      });

      return true;

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Oops ! Une erreur s'est produite",
        description: error instanceof Error ? error.message : "Veuillez réessayer dans quelques instants.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadWish, isUploading };
};