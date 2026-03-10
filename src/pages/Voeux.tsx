import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  Square, 
  Send, 
  Upload, 
  Heart, 
  ArrowLeft,
  Camera,
  MessageSquare,
  Play,
  Pause,
  Volume2,
  X
} from 'lucide-react';
import { useEvent } from "@/hooks/useEvent"
import { useToast } from '@/hooks/use-toast';
import { useWishUpload } from '@/hooks/useWishUpload';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

const Voeux = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { event, isLoading: isEventLoading, error: eventError } = useEvent();
  const { toast } = useToast();
  const { uploadWish, isUploading } = useWishUpload(event?.id);
  const { 
    isRecording, 
    audioBlob, 
    audioUrl, 
    duration, 
    startRecording, 
    stopRecording, 
    clearRecording 
  } = useAudioRecorder();
  
  const name = searchParams.get('n');
  const table = searchParams.get('t');
  
  // Text message state
  const [textMessage, setTextMessage] = useState('');
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!name || !table) {
      navigate('/');
    }
  }, [name, table, navigate]);

  useEffect(() => {
    if (!isEventLoading && (eventError || !event)) {
      toast({
        title: "Événement introuvable",
        description: "Le QR code semble invalide ou l'événement n'est pas accessible.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [event, eventError, isEventLoading, navigate, toast]);

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      toast({
        title: "Oops ! Problème de microphone 🎤",
        description: "Vérifiez que vous avez autorisé l'accès au microphone",
        variant: "destructive",
      });
    }
  };

  const handleSendText = async () => {
    if (!event?.id || !textMessage.trim() || !name || !table) return;
    
    const success = await uploadWish({
      name,
      tableNumber: parseInt(table),
      type: 'text',
      content: textMessage.trim()
    });
    
    if (success) {
      setTextMessage('');
    }
  };

  const handleSendAudio = async () => {
    if (!event?.id || !audioBlob || !name || !table) return;
    
    // Create file from blob
    const audioFile = new File([audioBlob], `audio_${name}_${Date.now()}.webm`, {
      type: 'audio/webm'
    });
    
    const success = await uploadWish({
      name,
      tableNumber: parseInt(table),
      type: 'audio',
      file: audioFile
    });
    
    if (success) {
      clearRecording();
    }
  };

  const handleSendFile = async () => {
    if (!event?.id || !selectedFile || !name || !table) return;
    
    const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
    
    const success = await uploadWish({
      name,
      tableNumber: parseInt(table),
      type: fileType,
      file: selectedFile
    });
    
    if (success) {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 50 Mo",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  if (!name || !table) return null;

  return (
    <div className="min-h-screen bg-gradient-elegant">
      {/* Header */}
      <div className="bg-card border-b border-gold/20 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-elegant-black"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            
            <div className="text-center">
              <h1 className="text-lg font-semibold text-elegant-black">
                Table {table} • Invité : {name}
              </h1>
            </div>
            
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center mb-8">
          <Heart className="mx-auto mb-4 h-10 w-10 text-gold animate-pulse fill-gold" />
          <p className="text-center text-elegant-gray mb-6">
            Laissez un vœu plein d'amour pour les mariés
            <span className="ml-2 text-gold">💕</span>
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Audio Card */}
          <div className="space-y-6">
            <Card className="shadow-soft border-gold/20 hover:shadow-elegant transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-elegant-black">
                  <Mic className="h-5 w-5 text-gold" />
                  Vœu Audio
                  <span className="text-gold text-sm ml-1">🎤</span>
                </CardTitle>
                <p className="text-sm text-elegant-gray">
                  Enregistrez un message vocal plein d'émotion pour les mariés
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Button
                    onClick={isRecording ? stopRecording : handleStartRecording}
                    variant={isRecording ? "destructive" : "wedding"}
                    size="lg"
                    className="w-full"
                    disabled={isUploading}
                  >
                    {isRecording ? (
                      <>
                        <Square className="mr-2 h-5 w-5" />
                        Arrêter ({Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')})
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-5 w-5" />
                        Commencer l'enregistrement
                        <span className="ml-2 text-sm">✨</span>
                      </>
                    )}
                  </Button>
                </div>

                {audioUrl && (
                  <div className="space-y-3">
                    <div className="bg-secondary/30 p-3 rounded">
                      <audio controls className="w-full">
                        <source src={audioUrl} type="audio/webm" />
                      </audio>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSendAudio}
                        variant="wedding"
                        size="sm"
                        className="flex-1"
                        disabled={isUploading}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {isUploading ? 'Envoi...' : 'Envoyer avec amour'}
                        {!isUploading && <span className="ml-1 text-sm">💕</span>}
                      </Button>
                      <Button
                        onClick={clearRecording}
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Text Card */}
          <div className="space-y-6">
            <Card className="shadow-soft border-gold/20 hover:shadow-elegant transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-elegant-black">
                  <MessageSquare className="h-5 w-5 text-gold" />
                  Message Écrit
                  <span className="text-gold text-sm ml-1">✍️</span>
                </CardTitle>
                <p className="text-sm text-elegant-gray">
                  Écrivez quelques mots doux qui toucheront le cœur des mariés
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="message" className="sr-only">Votre message</Label>
                  <Textarea
                    id="message"
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    placeholder="Chers amoureux, je vous souhaite..."
                    className="border-gold/30 focus:border-gold min-h-[120px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-elegant-gray mt-1">
                    {textMessage.length}/500 caractères
                  </p>
                </div>
                
                <Button
                  onClick={handleSendText}
                  variant="wedding"
                  size="lg"
                  className="w-full"
                  disabled={!textMessage.trim() || isUploading}
                >
                  <Send className="mr-2 h-5 w-5" />
                  {isUploading ? 'Envoi en cours...' : 'Envoyer mes vœux'}
                  {!isUploading && <span className="ml-1 text-sm">💌</span>}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Media Card */}
          <div className="space-y-6">
            <Card className="shadow-soft border-gold/20 hover:shadow-elegant transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-elegant-black">
                  <Camera className="h-5 w-5 text-gold" />
                  Photos & Vidéos
                  <span className="text-gold text-sm ml-1">📸</span>
                </CardTitle>
                <p className="text-sm text-elegant-gray">
                  Partagez vos plus beaux moments de cette soirée magique
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,video/*"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-gold/30 hover:bg-gold/10 text-elegant-black"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Sélectionner une photo ou vidéo
                    <span className="ml-1 text-sm">✨</span>
                  </Button>
                </div>

                {previewUrl && selectedFile && (
                  <div className="space-y-3">
                    <div className="bg-secondary/30 p-3 rounded">
                      {selectedFile.type.startsWith('image/') ? (
                        <img
                          src={previewUrl}
                          alt="Aperçu"
                          className="max-w-full max-h-32 mx-auto rounded object-cover"
                        />
                      ) : (
                        <video
                          src={previewUrl}
                          controls
                          className="max-w-full max-h-32 mx-auto rounded"
                        />
                      )}
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {selectedFile.name}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSendFile}
                        variant="wedding"
                        size="sm"
                        className="flex-1"
                        disabled={isUploading}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {isUploading ? 'Envoi...' : 'Partager ce moment'}
                        {!isUploading && <span className="ml-1 text-sm">📤</span>}
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-elegant-gray">
            Un souvenir inoubliable pour les mariés
            <span className="ml-2 text-gold">✨💕</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Voeux;