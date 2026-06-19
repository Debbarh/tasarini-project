import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Volume2, VolumeX, Loader2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient, extractArrayFromResponse } from "@/integrations/api/client";

const getYouTubeEmbedUrl = (url: string): string | null => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(youtubeRegex);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${match[1]}&enablejsapi=1`;
  }
  return null;
};

const isDirectVideoUrl = (url: string): boolean => /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i.test(url);

interface AdvertisementSettings {
  video_url?: string;
  video_type: "link" | "upload";
  is_enabled: boolean;
  title?: string;
  description?: string;
  duration_seconds: number;
}

interface GenerationProgress {
  step: string;
  progress: number;
  message: string;
}

interface AdvertisementModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationProgress?: GenerationProgress;
}

const AdvertisementModal = ({ isOpen, onClose, generationProgress }: AdvertisementModalProps) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AdvertisementSettings | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const ytRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(null);
      loadAdvertisementSettings();
    }
  }, [isOpen]);

  const loadAdvertisementSettings = async () => {
    try {
      const data = await apiClient.get<any>("content/advertisements/", {
        is_enabled: true,
        ordering: "-created_at",
        limit: 1,
      });
      const list = extractArrayFromResponse<any>(data);
      const active = list.find((a) => a?.is_enabled && a?.video_url);
      // S'il y a une pub valide on l'affiche ; sinon on garde l'écran d'attente
      // rassurant (pas de fermeture — la génération est toujours en cours).
      if (active) {
        setSettings({ ...active, video_type: active.video_type as "link" | "upload" });
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la publicité:", error);
    }
  };

  const handleVideoRef = (video: HTMLVideoElement | null) => {
    setVideoElement(video);
    if (video) {
      video.muted = true;
      video.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    // YouTube : piloté via l'API IFrame (postMessage, enablejsapi=1)
    if (youtubeEmbedUrl) {
      const win = ytRef.current?.contentWindow;
      if (!win) return;
      const cmd = (func: string, args: unknown[] = []) =>
        win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
      if (isMuted) {
        cmd("unMute");
        cmd("setVolume", [100]);
        cmd("playVideo");
      } else {
        cmd("mute");
      }
      setIsMuted(!isMuted);
      return;
    }
    // Vidéo .mp4 directe
    if (videoElement) {
      videoElement.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!isOpen) return null;

  const videoUrl = settings?.video_url;
  const youtubeEmbedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;
  const isDirectVideo = videoUrl ? isDirectVideoUrl(videoUrl) : false;
  const progressValue = generationProgress?.progress || 0;
  const progressMsg = generationProgress?.message || t("itinerary.preparingTitle", "Préparation de votre programme en cours…");

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl w-[95vw] h-[88vh] p-0 overflow-hidden [&>button]:hidden">
        <div className="relative w-full h-full bg-black">
          {youtubeEmbedUrl ? (
            <iframe
              ref={ytRef}
              src={youtubeEmbedUrl}
              className="w-full h-full"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : isDirectVideo && videoUrl ? (
            <video
              ref={handleVideoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              autoPlay
              muted={isMuted}
              loop
              playsInline
            />
          ) : (
            // Écran d'attente rassurant (aucune vidéo configurée / en attente)
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-primary/30 via-black to-black text-white">
              <div className="relative mb-6">
                <Loader2 className="h-14 w-14 animate-spin text-primary" />
                <Plane className="h-6 w-6 text-primary absolute inset-0 m-auto" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold mb-2">
                {t("itinerary.preparingTitle", "Préparation de votre programme en cours…")}
              </h3>
              <p className="text-sm sm:text-base text-white/80 max-w-md">
                {t("itinerary.preparingDescription", "Notre IA conçoit votre itinéraire sur mesure. Le programme s'affiche au fur et à mesure — encore quelques instants.")}
              </p>
            </div>
          )}

          {/* Overlay : titre/desc pub + contrôle son + bouton passer */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30">
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
              <div className="text-white">
                {settings?.title && <h3 className="text-lg font-semibold mb-1">{settings.title}</h3>}
                {settings?.description && <p className="text-sm opacity-90">{settings.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {(youtubeEmbedUrl || isDirectVideo) && (
                  <Button variant="secondary" size="sm" onClick={toggleMute} className="bg-black/50 hover:bg-black/70 text-white">
                    {isMuted ? (
                      <><VolumeX className="w-4 h-4 mr-1" />{t("itinerary.enableSound", "Activer le son")}</>
                    ) : (
                      <><Volume2 className="w-4 h-4 mr-1" />{t("itinerary.muteSound", "Couper le son")}</>
                    )}
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={onClose} className="bg-black/50 hover:bg-black/70 text-white">
                  {t("itinerary.skipAd", "Passer")}
                </Button>
              </div>
            </div>

            {/* Footer : progression réelle de la génération */}
            <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <span className="text-white text-sm truncate">{progressMsg}</span>
                  {progressValue > 0 && <span className="text-white text-sm shrink-0">{Math.round(progressValue)}%</span>}
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvertisementModal;
