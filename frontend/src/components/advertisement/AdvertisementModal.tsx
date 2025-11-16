import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/integrations/api/client";

// Fonction pour convertir URL YouTube en embed
const getYouTubeEmbedUrl = (url: string): string | null => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(youtubeRegex);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${match[1]}`;
  }
  return null;
};

// Fonction pour vérifier si c'est une URL de vidéo directe
const isDirectVideoUrl = (url: string): boolean => {
  return /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(url);
};

interface AdvertisementSettings {
  video_url?: string;
  video_type: 'link' | 'upload';
  is_enabled: boolean;
  title?: string;
  description?: string;
  duration_seconds: number;
}

interface AdvertisementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvertisementModal = ({ isOpen, onClose }: AdvertisementModalProps) => {
  const [settings, setSettings] = useState<AdvertisementSettings | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Démarrer muet pour éviter le blocage autoplay
  const [audioBlocked, setAudioBlocked] = useState(false); // Détecter si l'audio est bloqué
  const [showAudioPrompt, setShowAudioPrompt] = useState(false); // Afficher le prompt pour activer l'audio
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAdvertisementSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (settings && isOpen && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, isOpen, settings, onClose]);

  const loadAdvertisementSettings = async () => {
    try {
      const data = await apiClient.get<any[]>('content/advertisements/', {
        is_enabled: true,
        ordering: '-created_at',
        limit: 1
      });

      if (data && data.length > 0) {
        const adSettings = {
          ...data[0],
          video_type: data[0].video_type as 'link' | 'upload'
        };
        setSettings(adSettings);
        setTimeLeft(adSettings.duration_seconds);
      } else {
        // Pas de publicité activée, fermer immédiatement
        onClose();
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la publicité:', error);
      onClose();
    }
  };

  const handleVideoRef = (video: HTMLVideoElement | null) => {
    setVideoElement(video);
    if (video) {
      video.muted = true; // Toujours démarrer muet
      video.addEventListener('canplay', () => {
        video.play().then(() => {
          setIsPlaying(true);
          // Afficher le prompt pour activer l'audio après 2 secondes
          setTimeout(() => {
            setShowAudioPrompt(true);
          }, 2000);
        }).catch((error) => {
          console.error('Erreur autoplay:', error);
          setAudioBlocked(true);
        });
      });

      // Détecter si l'utilisateur peut interagir avec l'audio
      video.addEventListener('loadedmetadata', () => {
        // Tester la capacité d'autoplay avec son
        const testAudio = video.cloneNode() as HTMLVideoElement;
        testAudio.muted = false;
        testAudio.play().catch(() => {
          setAudioBlocked(true);
        });
      });
    }
  };

  const toggleMute = () => {
    if (videoElement) {
      videoElement.muted = !isMuted;
      setIsMuted(!isMuted);
      setShowAudioPrompt(false); // Cacher le prompt une fois que l'utilisateur a interagi
    }
  };

  const enableAudio = () => {
    if (videoElement) {
      videoElement.muted = false;
      setIsMuted(false);
      setShowAudioPrompt(false);
    }
  };

  const skipAd = () => {
    onClose();
  };

  if (!settings || !settings.video_url) {
    return null;
  }

  const progress = ((settings.duration_seconds - timeLeft) / settings.duration_seconds) * 100;
  const youtubeEmbedUrl = getYouTubeEmbedUrl(settings.video_url);
  const isDirectVideo = isDirectVideoUrl(settings.video_url);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-4xl w-full h-[90vh] p-0 overflow-hidden [&>button]:hidden"
      >
        <div className="relative w-full h-full bg-black">
          {/* Affichage conditionnel selon le type de vidéo */}
          {youtubeEmbedUrl ? (
            // YouTube embed
            <iframe
              src={youtubeEmbedUrl}
              className="w-full h-full"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : isDirectVideo ? (
            // Vidéo directe
            <video
              ref={handleVideoRef}
              src={settings.video_url}
              className="w-full h-full object-contain"
              autoPlay
              muted={isMuted}
              loop
              playsInline
            />
          ) : (
            // Fallback pour URLs non supportées
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-xl mb-2">Format vidéo non supporté</h3>
                <p className="text-sm opacity-75">
                  Veuillez utiliser une URL YouTube ou un fichier vidéo direct (MP4, WebM)
                </p>
              </div>
            </div>
          )}

          {/* Overlay avec contrôles */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30">
            
            {/* Prompt pour activer l'audio - affiché au centre */}
            {showAudioPrompt && isDirectVideo && (
              <div className="absolute inset-0 flex items-center justify-center z-50">
                <div className="bg-black/80 backdrop-blur-sm rounded-lg p-6 max-w-sm mx-4 text-center">
                  <div className="text-white">
                    <div className="text-4xl mb-3">🔊</div>
                    <h3 className="text-lg font-semibold mb-2">Activer le son</h3>
                    <p className="text-sm opacity-90 mb-4">
                      Cliquez pour profiter de la bande sonore de cette vidéo
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={enableAudio}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Volume2 className="w-4 h-4 mr-2" />
                        Activer le son
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAudioPrompt(false)}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        Continuer sans son
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Header */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="text-white">
                {settings.title && (
                  <h3 className="text-lg font-semibold mb-1">{settings.title}</h3>
                )}
                {settings.description && (
                  <p className="text-sm opacity-90">{settings.description}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Bouton mute seulement pour les vidéos directes */}
                {isDirectVideo && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={toggleMute}
                    className="bg-black/50 hover:bg-black/70 text-white"
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-4 h-4 mr-1" />
                        {audioBlocked ? 'Son bloqué' : 'Activer le son'}
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 mr-1" />
                        Couper le son
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={skipAd}
                  className="bg-black/50 hover:bg-black/70"
                >
                  Passer ({timeLeft}s)
                </Button>
              </div>
            </div>

            {/* Footer avec progress */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm">
                    Génération de votre itinéraire en cours...
                  </span>
                  <span className="text-white text-sm">
                    {timeLeft}s restantes
                  </span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-2"
                />
              </div>
            </div>

            {/* Play button si pas en cours de lecture - seulement pour vidéos directes */}
            {isDirectVideo && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 rounded-full p-4">
                  <Play className="w-12 h-12 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvertisementModal;