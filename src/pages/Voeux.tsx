import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  Square,
  Send,
  Upload,
  ArrowLeft,
  Camera,
  MessageSquare,
  Sparkles,
  Stars,
  Music,
  X
} from 'lucide-react';
import { useEvent } from "@/hooks/useEvent";
import { useToast } from '@/hooks/use-toast';
import { useWishUpload } from '@/hooks/useWishUpload';
import imageCompression from 'browser-image-compression';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

const Voeux = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { slug } = useParams();
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

  const [textMessage, setTextMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const compressImage = async (file: File) => {
    try {
      return await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8,
      });
    } catch {
      return file;
    }
  };

  useEffect(() => {
    if (!name) navigate(`/${slug || ''}`);
  }, [name, navigate, slug]);

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
    } catch {
      toast({
        title: "Problème de microphone",
        description: "Vérifiez que vous avez autorisé l'accès au microphone.",
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
      content: textMessage.trim(),
    });
    if (success) setTextMessage('');
  };

  const handleSendAudio = async () => {
    if (!event?.id || !audioBlob || !name || !table) return;
    const audioFile = new File([audioBlob], `audio_${name}_${Date.now()}.webm`, { type: 'audio/webm' });
    const success = await uploadWish({
      name,
      tableNumber: parseInt(table),
      type: 'audio',
      file: audioFile,
    });
    if (success) clearRecording();
  };

  const handleSendFile = async () => {
    if (!event?.id || !selectedFile || !name || !table) return;
    const isImage = selectedFile.type.startsWith('image/');
    const fileToUpload = isImage ? await compressImage(selectedFile) : selectedFile;
    const success = await uploadWish({
      name,
      tableNumber: parseInt(table),
      type: isImage ? 'image' : 'video',
      file: fileToUpload,
    });
    if (success) { setSelectedFile(null); setPreviewUrl(null); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 50 Mo", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  if (!name) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/${slug || ''}`)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <img src="/logo.png" alt="Moments Events" className="h-6 w-auto hidden sm:block" />
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary font-light tracking-widest px-3 py-1">
            • {name}
          </Badge>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-10 max-w-6xl">
        <header className="text-center mb-12 space-y-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/5 border border-primary/10">
              <Stars className="h-9 w-9 text-primary animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.2em] uppercase text-gold">
            Partagez l'Instant
          </h1>
          {event?.name && (
            <p className="text-xs text-primary/50 uppercase tracking-[0.4em]">{event.name}</p>
          )}
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed text-sm">
            Laissez un souvenir précieux. Votre contribution rend cet événement éternel.
          </p>
        </header>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

          {/* Audio Card */}
          <Card className="card-premium h-full flex flex-col group">
            <CardHeader className="text-center space-y-4 pt-10">
              <div className="mx-auto p-4 rounded-full bg-white/5 border border-white/10 group-hover:border-primary/40 transition-all">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base uppercase tracking-widest text-gold">Souvenir Vocal</CardTitle>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enregistrez un message plein d'émotion.
              </p>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-end space-y-4 pb-10">
              <Button
                onClick={isRecording ? stopRecording : handleStartRecording}
                className={`w-full h-12 rounded-full uppercase tracking-widest font-bold text-xs shadow-lg transition-all ${
                  isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse" : "btn-gold"
                }`}
                disabled={isUploading}
              >
                {isRecording ? (
                  <><Square className="mr-3 h-4 w-4 fill-current" /> {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</>
                ) : (
                  <><Mic className="mr-3 h-4 w-4" /> Enregistrer</>
                )}
              </Button>

              {audioUrl && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-black/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                    <Music className="h-4 w-4 text-primary flex-shrink-0" />
                    <audio src={audioUrl} controls className="h-8 w-full opacity-80" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSendAudio} className="btn-gold flex-1 h-11 rounded-xl text-xs font-black" disabled={isUploading}>
                      {isUploading ? 'Envoi...' : 'Partager'} <Send className="ml-2 h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={clearRecording} variant="outline" className="border-white/10 h-11 w-11 rounded-xl" disabled={isUploading}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Text Card */}
          <Card className="card-premium h-full flex flex-col group">
            <CardHeader className="text-center space-y-4 pt-10">
              <div className="mx-auto p-4 rounded-full bg-white/5 border border-white/10 group-hover:border-primary/40 transition-all">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base uppercase tracking-widest text-gold">Petit Message</CardTitle>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Écrivez quelques mots qui resteront gravés.
              </p>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col space-y-4 pb-10">
              <div className="relative">
                <Textarea
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  placeholder="Écrivez ici votre plus beau souvenir..."
                  className="bg-black/30 border-white/10 focus:border-primary min-h-[150px] p-4 leading-relaxed rounded-2xl resize-none transition-all placeholder:text-muted-foreground/30 text-sm"
                  maxLength={500}
                />
                <span className="absolute bottom-3 right-4 text-[10px] text-muted-foreground/40 font-mono">
                  {textMessage.length}/500
                </span>
              </div>
              <Button
                onClick={handleSendText}
                className="btn-gold w-full h-12 rounded-full uppercase tracking-widest font-black text-xs shadow-lg"
                disabled={!textMessage.trim() || isUploading}
              >
                {isUploading ? 'Transmission...' : 'Envoyer'}
                {!isUploading && <Send className="ml-3 h-3.5 w-3.5" />}
              </Button>
            </CardContent>
          </Card>

          {/* Media Card */}
          <Card className="card-premium h-full flex flex-col group">
            <CardHeader className="text-center space-y-4 pt-10">
              <div className="mx-auto p-4 rounded-full bg-white/5 border border-white/10 group-hover:border-primary/40 transition-all">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base uppercase tracking-widest text-gold">Captures</CardTitle>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Partagez l'image ou la vidéo de l'instant.
              </p>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-end space-y-4 pb-10">
              <input id="file-upload" type="file" accept="image/*,video/*" className="sr-only" onChange={handleFileSelect} />

              {!previewUrl ? (
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-full border-white/10 hover:border-primary/50 bg-white/5 uppercase tracking-widest font-bold text-xs"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isUploading}
                >
                  <Upload className="mr-3 h-4 w-4" /> Sélectionner
                </Button>
              ) : (
                <div className="space-y-3 animate-in zoom-in-95 duration-300">
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                    {selectedFile?.type.startsWith('image/') ? (
                      <img src={previewUrl} alt="Aperçu" className="w-full h-full object-cover" />
                    ) : (
                      <video src={previewUrl} className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Button onClick={handleSendFile} className="btn-gold w-full h-11 rounded-xl text-xs font-black" disabled={isUploading}>
                    {isUploading ? 'Partage en cours...' : 'Partager ce moment'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <footer className="page-footer">
          <div className="page-footer-divider">
            <div className="page-footer-line" />
            <Sparkles className="h-3 w-3 text-primary" />
            <div className="page-footer-line" />
          </div>
          <p className="page-footer-text">Moments Events by Bless Events • Vos souvenirs sont sacrés</p>
        </footer>
      </div>
    </div>
  );
};

export default Voeux;
