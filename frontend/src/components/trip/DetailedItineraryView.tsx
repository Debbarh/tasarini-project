import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTypingEffect } from "@/hooks/useTypingEffect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Users, Wallet, ArrowLeft, Download, Share2, Clock, Star, MessageCircle, Facebook, Twitter, Copy, Gift, Utensils, Backpack, Info, Sun, Shield, Save, ShoppingCart, ChevronDown, ChevronUp, Euro, Sparkles, ChevronLeft, ChevronRight, Maximize2, X, Pencil, Lightbulb, AlertTriangle, Landmark, Siren, Camera, Sunrise, Moon, Car, PartyPopper, Globe, FileText, Languages, Cloud, HeartPulse, Drama } from "lucide-react";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/utils/dateLocale";
import { DetailedItinerary, UnsplashImage, ActivityImage } from "@/types/trip";
import { exportItineraryToPDF, shareItinerary, copyItineraryLink } from "@/utils/itineraryExport";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedItineraries } from "@/hooks/useSavedItineraries";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import SaveItineraryDialog from "@/components/itinerary/SaveItineraryDialog";
import { EditableItineraryView } from "@/components/itinerary/EditableItineraryView";
import { useNavigate } from "react-router-dom";
import { UnifiedBookingDialog } from "@/components/booking/UnifiedBookingDialog";
import WidgetBookingDialog, { WidgetTab } from "@/components/trip/WidgetBookingDialog";
import { BookingItem, BookingType } from "@/types/booking";
import { BookingEnrichmentPanel } from "./BookingEnrichmentPanel";
import { EnrichmentOptions } from "@/services/tripEnrichmentService";
import { apiClient } from "@/integrations/api/client";
import {
  WhyVisitSection,
  BestTimeToVisitSection,
  VisaAndEntrySection,
  HealthAndSafetySection,
  MustTryDishesSection,
  GiftIdeasSection,
  SimilarDestinationsSection,
  TransportationAdviceSection,
  CulturalTipsSection,
  LocalEventsSection,
  SustainabilityTipsSection,
  MustSeeSection,
} from "@/components/itinerary/EnrichedSections";

interface DetailedItineraryViewProps {
  itinerary: DetailedItinerary | null;  // Now nullable for partial streaming data
  onStartOver: () => void;
  enrichmentData?: EnrichmentOptions | null;
  isEnriching?: boolean;
  isStreaming?: boolean;  // NEW: Enables typing effects during streaming
  savedItineraryId?: string;  // si fourni : édition d'un itinéraire déjà sauvegardé (PATCH)
}

type GalleryImage = UnsplashImage & { city?: string };

const DestinationGallery = ({ images }: { images: GalleryImage[] }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const total = images.length;

  useEffect(() => {
    if (total < 2 || isPaused) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [isPaused, total]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setLightboxIndex((prev) => {
          if (prev === null) return null;
          return (prev + 1) % total;
        });
      }
      if (event.key === 'ArrowLeft') {
        setLightboxIndex((prev) => {
          if (prev === null) return null;
          return (prev - 1 + total) % total;
        });
      }
      if (event.key === 'Escape') {
        setLightboxIndex(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, total]);

  if (!total) return null;

  const goTo = (next: number) => {
    if (total === 0) return;
    const safeIndex = (next + total) % total;
    setCurrentIndex(safeIndex);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(delta > 0 ? currentIndex - 1 : currentIndex + 1);
    }
    touchStartX.current = null;
  };

  const activeImage = images[currentIndex];

  return (
    <>
      <Card className="overflow-hidden shadow-lg border border-border/60">
        <CardContent className="p-0">
          <div
            className="relative w-full overflow-hidden rounded-none md:rounded-xl bg-muted"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative aspect-[16/9] w-full">
              {images.map((image, index) => (
                <div
                  key={`${image.id}-${index}`}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  <img
                    src={image.url || image.thumbnailUrl}
                    alt={image.description || t('itinerary.galleryPhotoAlt', 'Photo de {{city}}', { city: image.city || t('itinerary.destination', 'destination') })}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-2">
                    <div className="text-xs uppercase tracking-wide text-white/80">
                      {image.city ? image.city : t('itinerary.destinationCapitalized', 'Destination')} • {t('itinerary.inspireYourTrip', 'Inspirez votre voyage')}
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-semibold leading-tight drop-shadow">
                      {image.description || t('itinerary.iconicView', 'Vue emblématique à ne pas manquer')}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                      <span className="flex items-center gap-1"><Camera className="w-4 h-4" /> {image.photographer}</span>
                      {image.photographerUsername && (
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
                          @{image.photographerUsername}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30" onClick={() => setLightboxIndex(currentIndex)}>
                        <Maximize2 className="h-4 w-4 mr-2" />
                        {t('itinerary.viewLarge', 'Voir en grand')}
                      </Button>
                      {isPaused && (
                        <span className="text-xs text-white/80 self-center">{t('itinerary.playbackPaused', 'Lecture en pause')}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {total > 1 && (
              <>
                <button
                  aria-label={t('itinerary.previousImage', 'Image précédente')}
                  onClick={() => goTo(currentIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white p-2 hover:bg-black/60 transition"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  aria-label={t('itinerary.nextImage', 'Image suivante')}
                  onClick={() => goTo(currentIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white p-2 hover:bg-black/60 transition"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/30 px-3 py-2 rounded-full backdrop-blur">
                  {images.map((image, index) => (
                    <button
                      key={`${image.id}-dot-${index}`}
                      onClick={() => goTo(index)}
                      className={`h-2.5 rounded-full transition-all ${index === currentIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/70'}`}
                      aria-label={t('itinerary.goToImage', "Aller à l'image {{number}}", { number: index + 1 })}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {total > 1 && (
            <div className="flex gap-3 overflow-x-auto px-4 py-3 bg-card/70 backdrop-blur">
              {images.map((image, index) => (
                <button
                  key={`${image.id}-thumb-${index}`}
                  onClick={() => goTo(index)}
                  className={`relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg border transition ${index === currentIndex ? 'border-primary shadow-md' : 'border-border/70'}`}
                >
                  <img
                    src={image.thumbnailUrl || image.url}
                    alt={image.description || t('itinerary.thumbnailAlt', 'Miniature {{number}}', { number: index + 1 })}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-1 left-2 right-2 text-[10px] text-white truncate">
                    {image.city || t('itinerary.destinationCapitalized', 'Destination')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => setLightboxIndex(open ? currentIndex : null)}>
        <DialogContent className="max-w-6xl p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center justify-between text-lg">
              <span>
                {activeImage.city || t('itinerary.destinationCapitalized', 'Destination')} — {activeImage.description || t('itinerary.travelInspiration', 'Inspiration de voyage')}
              </span>
              <Button size="icon" variant="ghost" onClick={() => setLightboxIndex(null)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="relative bg-black">
            <div className="relative aspect-[16/9] w-full">
              <img
                src={lightboxIndex !== null ? images[lightboxIndex].url || images[lightboxIndex].thumbnailUrl : activeImage.url}
                alt={lightboxIndex !== null ? images[lightboxIndex].description : activeImage.description}
                className="h-full w-full object-contain bg-black"
              />
              {total > 1 && (
                <>
                  <button
                    aria-label={t('itinerary.previousImage', 'Image précédente')}
                    onClick={() => setLightboxIndex((prev) => {
                      if (prev === null) return 0;
                      return (prev - 1 + total) % total;
                    })}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 text-white p-3 hover:bg-white/25 transition"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    aria-label={t('itinerary.nextImage', 'Image suivante')}
                    onClick={() => setLightboxIndex((prev) => {
                      if (prev === null) return 0;
                      return (prev + 1) % total;
                    })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 text-white p-3 hover:bg-white/25 transition"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white space-y-1">
                <p className="text-sm font-semibold">{lightboxIndex !== null ? images[lightboxIndex].city || t('itinerary.destinationCapitalized', 'Destination') : activeImage.city || t('itinerary.destinationCapitalized', 'Destination')}</p>
                <p className="text-xs text-white/80">
                  {lightboxIndex !== null ? images[lightboxIndex].description || t('itinerary.inspiringSnapshot', 'Instantané inspirant') : activeImage.description || t('itinerary.inspiringSnapshot', 'Instantané inspirant')}
                </p>
                <p className="text-xs text-white/70 flex items-center gap-1"><Camera className="w-4 h-4" /> {lightboxIndex !== null ? images[lightboxIndex].photographer : activeImage.photographer}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Component wrapper for activity title with typing effect
interface ActivityTitleProps {
  title: string;
  isStreaming: boolean;
}

const ActivityTitle: React.FC<ActivityTitleProps> = ({ title, isStreaming }) => {
  const { displayedText, isTyping } = useTypingEffect(title, {
    // Always animate when new text arrives (streaming ou final)
    enabled: true,
    speed: 1,
    delayMs: 50,
  });

  return (
    <h5 className="font-medium">
      {displayedText}
      {isTyping && <span className="animate-blink ml-1">|</span>}
    </h5>
  );
};

// Generic typed text for paragraphs (keeps layout identical)
const TypedText: React.FC<{ text: string; isStreaming: boolean; delay?: number; speed?: number; className?: string }> = ({
  text,
  isStreaming,
  delay = 30,
  speed = 2,
  className,
}) => {
  const { displayedText, isTyping } = useTypingEffect(text, {
    enabled: isStreaming,
    speed,
    delayMs: delay,
  });

  return (
    <span className={className}>
      {displayedText}
      {isTyping && <span className="animate-blink ml-1 align-baseline">|</span>}
    </span>
  );
};

export const DetailedItineraryView = ({ itinerary: itineraryProp, onStartOver, enrichmentData, isEnriching = false, isStreaming = false, savedItineraryId }: DetailedItineraryViewProps) => {
  const { t, i18n } = useTranslation();
  const dfLocale = getDateFnsLocale(i18n.language);
  // Copie locale éditable : reflète les personnalisations sans dépendre du parent.
  const [localItinerary, setLocalItinerary] = useState(itineraryProp);
  useEffect(() => { setLocalItinerary(itineraryProp); }, [itineraryProp]);
  const itinerary = localItinerary;
  // Édition / persistance
  const [isEditing, setIsEditing] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(savedItineraryId ?? null);
  // State for lazy-loaded images
  const [destinationImages, setDestinationImages] = useState<Record<string, UnsplashImage[]>>(itinerary?.destinationImages || {});
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const imagesPollingRef = useRef<NodeJS.Timeout | null>(null);
  // Images d'activités (Wikimedia), indexées par activity.id (ou "dayNumber:index").
  // Hydratées depuis l'itinéraire persisté (activity.image) pour qu'un programme
  // rouvert/sauvegardé affiche ses images sans dépendre du cache de session.
  const [activityImages, setActivityImages] = useState<Record<string, ActivityImage>>(() => {
    const seed: Record<string, ActivityImage> = {};
    (itinerary?.days || []).forEach((d: any, di: number) => {
      (d?.activities || []).forEach((a: any, ai: number) => {
        if (a?.image) seed[a.id || `${d.dayNumber ?? di + 1}:${ai}`] = a.image;
      });
    });
    return seed;
  });
  const activityImagesPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Safety check for itinerary structure
  // During streaming, itinerary can be null or partial - show loading state
  if (!itinerary || !itinerary.trip) {
    if (isStreaming) {
      // Show loading state during streaming
      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Sparkles className="h-12 w-12 animate-pulse text-primary mx-auto" />
                <h3 className="text-lg font-semibold">{t('itinerary.generatingTitle', 'Génération de votre itinéraire...')}</h3>
                <p className="text-muted-foreground">
                  {t('itinerary.generatingDescription', "L'IA prépare votre programme personnalisé. Les sections apparaîtront progressivement.")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Not streaming and no valid itinerary - show error
    console.error('❌ Itinerary structure error:', {
      hasItinerary: !!itinerary,
      hasTrip: !!itinerary?.trip,
      itineraryKeys: itinerary ? Object.keys(itinerary) : [],
      itinerary: itinerary
    });

    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <h3 className="text-lg font-semibold">{t('itinerary.loadingErrorTitle', 'Problème de chargement')}</h3>
              <p className="text-muted-foreground">
                {t('itinerary.loadingErrorDescription', "L'itinéraire n'a pas pu être chargé correctement. Cela peut être dû à un problème temporaire.")}
              </p>
              <div className="flex gap-2 justify-center pt-4">
                <Button onClick={onStartOver} variant="default">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('itinerary.createNewItinerary', 'Créer un nouvel itinéraire')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { trip, totalCost, practicalInfo, recommendations } = itinerary;
  // L'utilisateur a-t-il saisi des dates EXPLICITES ? (mode 'dates' dans le stepper)
  // Sinon → numérotation générique "Jour N" au lieu de dates calendaires.
  const hasUserDates = Array.isArray((trip as any)?.destinations)
    && (trip as any).destinations.some((d: any) => d?.dateMode === 'dates' && d?.startDate);
  const hasEnrichedSections = Boolean(
    itinerary.whyVisit ||
    itinerary.bestTimeToVisit ||
    itinerary.visaAndEntry ||
    itinerary.healthAndSafety ||
    itinerary.mustSee ||
    itinerary.mustTryDishes ||
    itinerary.giftIdeas ||
    itinerary.similarDestinations ||
    itinerary.transportationAdvice ||
    itinerary.culturalTips ||
    itinerary.localEvents ||
    itinerary.sustainabilityTips
  );
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [bookingWidget, setBookingWidget] = useState<{ open: boolean; tab: WidgetTab }>({ open: false, tab: 'tours' });
  const openBooking = (tab: WidgetTab = 'tours') => setBookingWidget({ open: true, tab });
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [bookingDialog, setBookingDialog] = useState<{
    isOpen: boolean;
    item: BookingItem | null;
    type: BookingType;
    dates?: { start?: string; end?: string; time?: string };
  }>({
    isOpen: false,
    item: null,
    type: 'activity'
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { saveItinerary, updateItinerary } = useSavedItineraries();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();

  // Lazy load destination images
  useEffect(() => {
    const sessionId = sessionStorage.getItem('travel_analytics_session');

    // If images are already present, no need to poll
    if (Object.keys(destinationImages).length > 0 || !sessionId) {
      return;
    }

    // Start polling for images
    setIsLoadingImages(true);

    const pollImages = async () => {
      try {
        const response = await apiClient.get<{ images: Record<string, UnsplashImage[]> }>(
          `travel/destination-images/?sessionId=${sessionId}`
        );

        if (response.images && Object.keys(response.images).length > 0) {
          setDestinationImages(response.images);
          setIsLoadingImages(false);

          // Stop polling when images are loaded
          if (imagesPollingRef.current) {
            clearInterval(imagesPollingRef.current);
            imagesPollingRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error polling destination images:', error);
      }
    };

    // Initial poll
    pollImages();

    // Poll every 2 seconds
    imagesPollingRef.current = setInterval(pollImages, 2000);

    // Cleanup on unmount
    return () => {
      if (imagesPollingRef.current) {
        clearInterval(imagesPollingRef.current);
        imagesPollingRef.current = null;
      }
    };
  }, [destinationImages]);

  // Lazy load des images d'activités (Wikimedia)
  useEffect(() => {
    const sessionId = sessionStorage.getItem('travel_analytics_session');
    if (Object.keys(activityImages).length > 0 || !sessionId) return;

    const pollActivityImages = async () => {
      try {
        const response = await apiClient.get<{ images: Record<string, ActivityImage> }>(
          `travel/activity-images/?sessionId=${sessionId}`
        );
        if (response.images && Object.keys(response.images).length > 0) {
          setActivityImages(response.images);
          if (activityImagesPollingRef.current) {
            clearInterval(activityImagesPollingRef.current);
            activityImagesPollingRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error polling activity images:', error);
      }
    };

    pollActivityImages();
    activityImagesPollingRef.current = setInterval(pollActivityImages, 2500);

    return () => {
      if (activityImagesPollingRef.current) {
        clearInterval(activityImagesPollingRef.current);
        activityImagesPollingRef.current = null;
      }
    };
  }, [activityImages]);

  const galleryImages = useMemo<GalleryImage[]>(() => {
    if (!destinationImages || Object.keys(destinationImages).length === 0) return [];
    return Object.entries(destinationImages).flatMap(([city, images]) =>
      (images || []).map((image) => ({ ...image, city }))
    );
  }, [destinationImages]);

  // Helper functions
  const toggleDay = (dayNumber: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayNumber)) {
      newExpanded.delete(dayNumber);
    } else {
      newExpanded.add(dayNumber);
    }
    setExpandedDays(newExpanded);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return '🍽️';
      case 'activity': return '🎯';
      case 'transport': return '🚗';
      case 'accommodation': return '🏨';
      case 'culture': return '🏛️';
      case 'sport': return '⚽';
      case 'nature': return '🌲';
      default: return '📍';
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleExportPDF = async () => {
    try {
      await exportItineraryToPDF(itinerary);
      toast({
        title: t('itinerary.pdfExportSuccessTitle', 'PDF exporté avec succès'),
        description: t('itinerary.pdfExportSuccessDescription', 'Votre itinéraire a été téléchargé en PDF.'),
      });
    } catch (error) {
      toast({
        title: t('itinerary.pdfExportErrorTitle', "Erreur d'export"),
        description: t('itinerary.pdfExportErrorDescription', "Impossible d'exporter le PDF. Veuillez réessayer."),
        variant: "destructive",
      });
    }
  };

  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'twitter') => {
    try {
      await shareItinerary(itinerary, platform);
    } catch (error) {
      toast({
        title: t('itinerary.shareErrorTitle', 'Erreur de partage'),
        description: t('itinerary.shareErrorDescription', 'Impossible de partager. Veuillez réessayer.'),
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyItineraryLink();
      toast({
        title: t('itinerary.linkCopiedTitle', 'Lien copié'),
        description: t('itinerary.linkCopiedDescription', 'Le lien de votre itinéraire a été copié dans le presse-papiers.'),
      });
    } catch (error) {
      toast({
        title: t('itinerary.errorTitle', 'Erreur'),
        description: t('itinerary.copyLinkError', 'Impossible de copier le lien.'),
        variant: "destructive",
      });
    }
  };

  // Fusionne les images d'activités (récupérées en cache) dans l'itinéraire pour
  // les PERSISTER avec la sauvegarde (sinon elles ne vivent que 600s dans le cache).
  const withActivityImages = (it: DetailedItinerary): DetailedItinerary => {
    if (!it?.days || Object.keys(activityImages).length === 0) return it;
    return {
      ...it,
      days: it.days.map((d) => ({
        ...d,
        activities: (d.activities || []).map((a, ai) => {
          const img = activityImages[a.id] || activityImages[`${d.dayNumber}:${ai}`];
          return img ? { ...a, image: img } : a;
        }),
      })),
    };
  };

  // Fusionne activités + galerie de destination (Unsplash) dans l'itinéraire pour
  // tout PERSISTER (sauvegarde + réutilisation dans le PDF même après expiration
  // du cache de session). À utiliser pour toute sauvegarde.
  const withAllImages = (it: DetailedItinerary): DetailedItinerary => {
    const merged = withActivityImages(it);
    const hasDestImgs = destinationImages && Object.keys(destinationImages).length > 0;
    return hasDestImgs ? { ...merged, destinationImages } : merged;
  };

  const handleSaveItinerary = async (title: string, description?: string) => {
    const saved = await saveItinerary(title, withAllImages(itinerary), description);
    if (saved && typeof saved === 'object') setSavedId(saved.id);
    return saved;
  };

  // Sauvegarde depuis l'éditeur : PATCH si déjà sauvegardé, sinon POST.
  const handleEditSave = async (updated: { id: string; title: string; itinerary_data: DetailedItinerary }) => {
    const dataWithImages = withAllImages(updated.itinerary_data);
    setLocalItinerary(dataWithImages); // reflète les modifs dans la vue lecture
    if (savedId) {
      await updateItinerary({
        id: savedId,
        title: updated.title || itinerary.title || 'Mon itinéraire',
        itinerary_data: dataWithImages,
        is_favorite: false,
        created_at: '',
        updated_at: '',
      } as any);
    } else {
      const saved = await saveItinerary(updated.title || itinerary.title || 'Mon itinéraire', dataWithImages);
      if (saved && typeof saved === 'object') setSavedId(saved.id);
    }
  };

  const handleBookActivity = (activity: any, date: string, destination: string) => {
    const bookingItem: BookingItem = {
      id: activity.id || `activity-${Date.now()}`,
      name: activity.title,
      description: activity.description,
      price: {
        amount: activity.cost || 0,
        currency: 'EUR'
      },
      bookingUrl: activity.bookingUrl,
      sourceType: activity.bookingUrl ? 'external' : 'internal',
      sourceProvider: activity.provider || 'partner',
      location: typeof activity.location === 'string' ? activity.location : activity.location?.name || destination,
      duration: activity.duration,
      images: activity.images || [],
      ...activity
    };

    setBookingDialog({
      isOpen: true,
      item: bookingItem,
      type: 'activity',
      dates: {
        start: date,
        time: activity.time
      }
    });
  };

  const handleBookMeal = (meal: any, mealType: 'breakfast' | 'lunch' | 'dinner', date: string, destination: string) => {
    const mealTimes = {
      breakfast: '08:00',
      lunch: '12:30',
      dinner: '19:30'
    };

    const bookingItem: BookingItem = {
      id: `meal-${mealType}-${Date.now()}`,
      name: meal.title,
      description: `${mealType === 'breakfast' ? t('itinerary.breakfast', 'Petit-déjeuner') : mealType === 'lunch' ? t('itinerary.lunch', 'Déjeuner') : t('itinerary.dinner', 'Dîner')} ${t('itinerary.atLocation', 'à')} ${typeof meal.location === 'string' ? meal.location : meal.location?.name || destination}`,
      price: {
        amount: meal.cost || 0,
        currency: 'EUR'
      },
      bookingUrl: meal.bookingUrl,
      sourceType: meal.bookingUrl ? 'external' : 'internal',
      sourceProvider: meal.provider || 'partner',
      location: typeof meal.location === 'string' ? meal.location : meal.location?.name || destination,
      ...meal
    };

    setBookingDialog({
      isOpen: true,
      item: bookingItem,
      type: 'restaurant',
      dates: {
        start: date,
        time: mealTimes[mealType]
      }
    });
  };

  const calculateTotalDuration = () => {
    if (trip.startDate && trip.endDate) {
      try {
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        
        // Vérifier que les dates sont valides
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return 0;
        }
        
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } catch (error) {
        return 0;
      }
    }
    return 0;
  };

  const getTravelGroupDescription = () => {
    switch (trip.travelGroup.type) {
      case 'solo':
        return t('itinerary.soloTrip', 'Voyage solo');
      case 'couple':
        return t('itinerary.coupleTrip', 'Voyage en couple');
      case 'family':
        return trip.travelGroup.children?.count
          ? t('itinerary.familyWithChildren', 'Famille avec {{count}} enfant(s)', { count: trip.travelGroup.children.count })
          : t('itinerary.family', 'Famille');
      case 'group':
        return t('itinerary.groupOfPeople', 'Groupe de {{count}} personnes', { count: trip.travelGroup.size });
      default:
        return '';
    }
  };


  return (
    <div className="space-y-6">
      {/* Message rassurant pendant la génération */}
      {isStreaming && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Sparkles className="h-5 w-5 text-primary animate-pulse shrink-0" />
            <div>
              <p className="font-medium">{t('itinerary.preparingTitle', 'Préparation de votre programme en cours…')}</p>
              <p className="text-sm text-muted-foreground">
                {t('itinerary.preparingDescription', "Notre IA conçoit votre itinéraire sur mesure. Le programme s'affiche au fur et à mesure — encore quelques instants.")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('itinerary.personalizedItineraryTitle', 'Votre itinéraire personnalisé')}</h1>
          <p className="text-muted-foreground">
            <TypedText
              text={t('itinerary.generatedWithPreferences', 'Voyage généré avec vos préférences personnelles')}
              isStreaming={isStreaming}
              delay={20}
              speed={2}
            />
          </p>
        </div>
        <div className="flex gap-2">
          {!isStreaming && (
            <Button onClick={() => openBooking('tours')}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {t('itinerary.bookServices', 'Réserver')}
            </Button>
          )}
          {user && (
            <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
              <Save className="h-4 w-4 mr-2" />
              {t('itinerary.save', 'Sauvegarder')}
            </Button>
          )}
          {!isStreaming && (
            user ? (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('itinerary.customize', 'Personnaliser')}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  // Préserver le programme courant pour le restaurer après connexion
                  // (sinon il disparaît en quittant la page).
                  try { sessionStorage.setItem('tasarini_pending_itinerary', JSON.stringify(itinerary)); } catch { /* quota */ }
                  navigate('/auth?redirectTo=/plan');
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {t('itinerary.loginToEdit', 'Se connecter pour modifier')}
              </Button>
            )
          )}
          <Button variant="outline" onClick={onStartOver}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('itinerary.newTrip', 'Nouveau voyage')}
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            {t('itinerary.exportPdf', 'Exporter PDF')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                {t('itinerary.share', 'Partager')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('facebook')}>
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('twitter')}>
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                {t('itinerary.copyLink', 'Copier le lien')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Destination Images Gallery */}
      {isLoadingImages ? (
        <Card className="overflow-hidden shadow-lg border border-border/60">
          <CardContent className="p-0">
            <Skeleton className="w-full aspect-[16/9] rounded-none md:rounded-xl" />
            <div className="flex gap-3 overflow-x-auto px-4 py-3 bg-card/70">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-28 flex-shrink-0 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : galleryImages.length > 0 ? (
        <DestinationGallery images={galleryImages} />
      ) : (
        <Card className="overflow-hidden shadow-lg border border-border/60">
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <div className="mb-2 flex justify-center"><Camera className="w-5 h-5" /></div>
              <p className="text-sm">{t('itinerary.loadingDestinationImages', 'Chargement des images des destinations...')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score d'adaptation : pourquoi ce programme correspond au voyageur */}
      {((itinerary as any).whyThisTrip || typeof (itinerary as any).matchScore === 'number') && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-success" />
              {t('itinerary.whyThisTripTitle', 'Pourquoi ce programme vous correspond')}
              {typeof (itinerary as any).matchScore === 'number' && (
                <Badge className="ml-auto bg-success text-success-foreground">
                  {t('itinerary.matchPercentage', "{{score}}% d'adéquation", { score: (itinerary as any).matchScore })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(itinerary as any).whyThisTrip && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <TypedText text={(itinerary as any).whyThisTrip} isStreaming={isStreaming} delay={20} speed={2} />
              </p>
            )}
            {Array.isArray((itinerary as any).destinationScores) && (itinerary as any).destinationScores.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {(itinerary as any).destinationScores.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2">
                    <span className="text-sm font-medium truncate">{d.destination}</span>
                    {typeof d.score === 'number' && (
                      <Badge variant="outline" className="text-success border-success/40 shrink-0">{d.score}%</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trip Overview */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('itinerary.tripOverview', 'Aperçu du voyage')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {t('itinerary.dates', 'Dates')}
              </div>
              <p className="font-medium">
                {hasUserDates && trip.startDate && trip.endDate ? (
                  <>
                    {format(new Date(trip.startDate), "dd MMM", { locale: dfLocale })} - {format(new Date(trip.endDate), "dd MMM yyyy", { locale: dfLocale })}
                  </>
                ) : (
                  t('itinerary.flexibleDates', 'Dates flexibles')
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('itinerary.daysCount', '{{count}} jour(s)', { count: calculateTotalDuration() })}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {t('itinerary.group', 'Groupe')}
              </div>
              <p className="font-medium">
                <TypedText text={getTravelGroupDescription()} isStreaming={isStreaming} delay={20} speed={2} />
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                {t('itinerary.budget', 'Budget')}
              </div>
              <p className="font-medium">{trip.budget.level} - {t('itinerary.budgetPerDay', '{{amount}}€/jour', { amount: trip.budget.dailyBudget })}</p>
              <p className="text-sm text-muted-foreground">
                {t('itinerary.estimatedTotal', 'Total estimé: {{amount}}€', { amount: totalCost })}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {t('itinerary.destinations', 'Destinations')}
              </div>
              <div className="space-y-1">
                {trip.destinations.map((dest, index) => (
                  <p key={index} className="text-sm font-medium">
                    <TypedText
                      text={t('itinerary.destinationLine', '{{city}}, {{country}} ({{duration}}j)', { city: dest.city, country: dest.country, duration: dest.duration })}
                      isStreaming={isStreaming}
                      delay={20 + index * 10}
                      speed={2}
                    />
                  </p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Breakdown Grid */}
      {itinerary.budgetBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              {t('itinerary.budgetBreakdownTitle', 'Répartition du budget')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(itinerary.budgetBreakdown).map(([category, amount]) => (
                <div key={category} className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatBudget(amount as number)}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {category === 'accommodation' ? t('itinerary.categoryAccommodation', 'Hébergement') :
                     category === 'food' ? t('itinerary.categoryFood', 'Nourriture') :
                     category === 'activities' ? t('itinerary.categoryActivities', 'Activités') :
                     category === 'transport' ? t('itinerary.categoryTransport', 'Transport') :
                     category === 'shopping' ? t('itinerary.categoryShopping', 'Shopping') :
                     category === 'miscellaneous' ? t('itinerary.categoryMiscellaneous', 'Divers') : category}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Itinerary */}
      {itinerary.days && itinerary.days.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t('itinerary.detailedItinerary', 'Itinéraire détaillé')}</h2>
            <Badge variant="secondary">
              {t('itinerary.daysCount', '{{count}} jour(s)', { count: itinerary.days.length })}
              {isStreaming && <Sparkles className="h-3 w-3 ml-1 inline animate-pulse" />}
            </Badge>
          </div>
          
          <div className="space-y-4">
            {itinerary.days.map((day, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {t('itinerary.dayLabel', 'Jour {{number}}', { number: index + 1 })}
                        {hasUserDates && day.date ? ` - ${format(new Date(day.date), "EEEE dd MMMM", { locale: dfLocale })}` : ''}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">{day.destination}</Badge>
                        <Badge variant="secondary">
                          <TypedText text={day.theme || ''} isStreaming={isStreaming} delay={50} speed={3} />
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t('itinerary.dailyBudget', 'Budget journalier')}</p>
                      <p className="font-bold text-lg">{day.totalCost}€</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Activities */}
                  {day.activities && day.activities.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t('itinerary.scheduledActivities', 'Activités programmées')}
                      </h4>
                      <div className="space-y-3">
                        {day.activities.map((activity, actIndex) => (
                          <div key={actIndex} className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex-shrink-0">
                              <Badge variant="outline" className="font-mono">
                                {activity.time}
                              </Badge>
                            </div>
                            {(() => {
                              const actImg = activityImages[activity.id] || activityImages[`${day.dayNumber}:${actIndex}`] || activity.image;
                              return actImg?.thumbnailUrl ? (
                                <a
                                  href={actImg.descriptionUrl || actImg.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 hidden sm:block"
                                  title={actImg.attribution || activity.title}
                                >
                                  <img
                                    src={actImg.thumbnailUrl}
                                    alt={activity.title}
                                    loading="lazy"
                                    className="w-24 h-20 object-cover rounded-md border"
                                  />
                                </a>
                              ) : null;
                            })()}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between">
                                <ActivityTitle title={activity.title} isStreaming={isStreaming} />
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {activity.type}
                                  </Badge>
                                  <span className="text-sm font-medium">{activity.cost}€</span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <TypedText text={activity.description || ''} isStreaming={isStreaming} delay={60} speed={3} />
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {typeof activity.location === 'string' ? activity.location : activity.location?.name || t('itinerary.locationUnspecified', 'Lieu non spécifié')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {typeof activity.duration === 'string' ? activity.duration : `${Math.floor(Number(activity.duration) / 60)}h${Number(activity.duration) % 60 > 0 ? ` ${Number(activity.duration) % 60}min` : ''}`}
                                </span>
                                <Badge 
                                  variant={activity.difficulty === 'easy' ? 'secondary' : activity.difficulty === 'moderate' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {activity.difficulty === 'easy' ? t('itinerary.difficultyEasy', 'Facile') : activity.difficulty === 'moderate' ? t('itinerary.difficultyModerate', 'Modéré') : t('itinerary.difficultyHard', 'Difficile')}
                                </Badge>
                              </div>
                              {activity.tips && activity.tips.length > 0 && (
                                <div className="mt-2">
                                  <details className="group">
                                    <summary className="cursor-pointer text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                                      <Lightbulb className="h-3.5 w-3.5" />
                                      {t('itinerary.tips', 'Conseils')}
                                    </summary>
                                    <ul className="mt-1 text-xs text-muted-foreground space-y-1 pl-4">
                                      {(typeof activity.tips === 'string' ? [activity.tips] : activity.tips || []).map((tip, tipIndex) => (
                                        <li key={tipIndex} className="list-disc">{tip}</li>
                                      ))}
                                    </ul>
                                  </details>
                                </div>
                              )}

                              {/* Booking Button → popup widgets d'affiliation (onglet activités) */}
                              <Button
                                onClick={() => openBooking('tours')}
                                className="w-full sm:w-auto mt-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                                size="sm"
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                {t('itinerary.bookThisActivity', 'Réserver cette activité')}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meals */}
                  {(day.meals?.breakfast || day.meals?.lunch || day.meals?.dinner) && (
                    <Separator className="my-6" />
                  )}
                  
                  {(day.meals?.breakfast || day.meals?.lunch || day.meals?.dinner) && (
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Utensils className="h-4 w-4" /> {t('itinerary.recommendedMeals', 'Repas recommandés')}
                      </h4>
                      <div className="grid gap-3 md:grid-cols-3">
                        {day.meals?.breakfast && (
                          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 space-y-2">
                            <h5 className="font-medium text-sm mb-1 flex items-center gap-1.5"><Sunrise className="h-3.5 w-3.5" /> {t('itinerary.breakfast', 'Petit-déjeuner')}</h5>
                            <p className="text-sm">
                              <TypedText text={day.meals.breakfast.title || ''} isStreaming={isStreaming} delay={40} speed={2} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <TypedText
                                text={`${typeof day.meals.breakfast.location === 'string' ? day.meals.breakfast.location : day.meals.breakfast.location?.name || t('itinerary.locationUnspecified', 'Lieu non spécifié')} • ${day.meals.breakfast.cost}€`}
                                isStreaming={isStreaming}
                                delay={50}
                                speed={2}
                              />
                            </p>
                            <Button
                              onClick={() => openBooking('dining')}
                              className="w-full mt-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
                              size="sm"
                            >
                              <Utensils className="w-3 h-3 mr-1" />
                              {t('itinerary.book', 'Réserver')}
                            </Button>
                          </div>
                        )}
                        {day.meals?.lunch && (
                          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 space-y-2">
                            <h5 className="font-medium text-sm mb-1 flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" /> {t('itinerary.lunch', 'Déjeuner')}</h5>
                            <p className="text-sm">
                              <TypedText text={day.meals.lunch.title || ''} isStreaming={isStreaming} delay={40} speed={2} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <TypedText
                                text={`${typeof day.meals.lunch.location === 'string' ? day.meals.lunch.location : day.meals.lunch.location?.name || t('itinerary.locationUnspecified', 'Lieu non spécifié')} • ${day.meals.lunch.cost}€`}
                                isStreaming={isStreaming}
                                delay={50}
                                speed={2}
                              />
                            </p>
                            <Button
                              onClick={() => openBooking('dining')}
                              className="w-full mt-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-sm"
                              size="sm"
                            >
                              <Utensils className="w-3 h-3 mr-1" />
                              {t('itinerary.book', 'Réserver')}
                            </Button>
                          </div>
                        )}
                        {day.meals?.dinner && (
                          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-2">
                            <h5 className="font-medium text-sm mb-1 flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> {t('itinerary.dinner', 'Dîner')}</h5>
                            <p className="text-sm">
                              <TypedText text={day.meals.dinner.title || ''} isStreaming={isStreaming} delay={40} speed={2} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <TypedText
                                text={`${typeof day.meals.dinner.location === 'string' ? day.meals.dinner.location : day.meals.dinner.location?.name || t('itinerary.locationUnspecified', 'Lieu non spécifié')} • ${day.meals.dinner.cost}€`}
                                isStreaming={isStreaming}
                                delay={50}
                                speed={2}
                              />
                            </p>
                            <Button
                              onClick={() => openBooking('dining')}
                              className="w-full mt-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-sm"
                              size="sm"
                            >
                              <Utensils className="w-3 h-3 mr-1" />
                              {t('itinerary.book', 'Réserver')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transportation */}
                  {day.transportation && (
                    <>
                      <Separator className="my-6" />
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Car className="w-4 h-4" /> {t('itinerary.transport', 'Transport')}
                        </h4>
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm">
                              <TypedText text={day.transportation || ''} isStreaming={isStreaming} delay={50} speed={2} />
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Day Summary */}
                  {day.walkingDistance && (
                    <>
                      <Separator className="my-6" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('itinerary.estimatedWalkingDistance', 'Distance de marche estimée')}</span>
                        <Badge variant="outline">{day.walkingDistance} km</Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : isStreaming ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 animate-pulse text-primary" />
              {t('itinerary.generatingDayByDay', "Génération de l'itinéraire jour par jour...")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('itinerary.generatingDayByDayDescription', "L'IA crée votre programme personnalisé avec toutes les activités")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('itinerary.daysWillAppear', "Les journées de votre itinéraire apparaîtront progressivement ci-dessus avec l'effet typing...")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('itinerary.detailedItinerary', 'Itinéraire détaillé')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('itinerary.dayByDayProgram', 'Programme jour par jour personnalisé selon vos préférences')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('itinerary.generationImproving', "Génération en cours d'amélioration")}</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('itinerary.generationImprovingDescription', "L'itinéraire détaillé avec activités minute par minute sera bientôt disponible. Pour l'instant, vous pouvez voir le résumé de votre voyage ci-dessus.")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enriched Sections */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t('itinerary.additionalInformation', 'Informations complémentaires')}</h2>
        {hasEnrichedSections ? (
          <>
            <WhyVisitSection whyVisit={itinerary.whyVisit} title={itinerary.title} />
            <BestTimeToVisitSection bestTimeToVisit={itinerary.bestTimeToVisit} />
            <VisaAndEntrySection visaAndEntry={itinerary.visaAndEntry} />
            <HealthAndSafetySection healthAndSafety={itinerary.healthAndSafety} />
            <MustSeeSection mustSee={itinerary.mustSee} title={itinerary.title} />
            <MustTryDishesSection mustTryDishes={itinerary.mustTryDishes} />
            <GiftIdeasSection giftIdeas={itinerary.giftIdeas} />
            <TransportationAdviceSection transportationAdvice={itinerary.transportationAdvice} />
            <CulturalTipsSection culturalTips={itinerary.culturalTips} />
            <SimilarDestinationsSection similarDestinations={itinerary.similarDestinations} />
            <LocalEventsSection localEvents={itinerary.localEvents} />
            <SustainabilityTipsSection sustainabilityTips={itinerary.sustainabilityTips} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('itinerary.enrichedContentPlaceholder', "Ces informations s'afficheront dès que l'itinéraire inclura des contenus enrichis.")}
          </p>
        )}
      </div>

      {/* Recommendations */}
      {(recommendations?.mustTryDishes || recommendations?.giftIdeas || recommendations?.packingList || recommendations?.culturalTips) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">{t('itinerary.personalizedRecommendations', 'Recommandations personnalisées')}</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Culinary Recommendations */}
            {recommendations?.mustTryDishes && Object.keys(recommendations.mustTryDishes).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Utensils className="h-4 w-4" /> {t('itinerary.specialtiesToDiscover', 'Spécialités à découvrir')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.mustTryDishes).map(([destination, dishes]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {dishes.map((dish, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {dish}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gift Ideas */}
            {recommendations?.giftIdeas && Object.keys(recommendations.giftIdeas).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5" /> {t('itinerary.giftIdeas', 'Idées souvenirs')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.giftIdeas).map(([destination, gifts]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {gifts.map((gift, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {gift}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Packing List */}
            {recommendations?.packingList && recommendations.packingList.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Backpack className="w-5 h-5" /> {t('itinerary.packingList', 'Liste de voyage')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recommendations.packingList.map((item, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Cultural Tips */}
            {recommendations?.culturalTips && Object.keys(recommendations.culturalTips).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Landmark className="h-4 w-4" /> {t('itinerary.culturalTips', 'Conseils culturels')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.culturalTips).map(([destination, tips]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {tips.map((tip, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Best Time to Visit */}
            {recommendations?.bestTimeToVisit && Object.keys(recommendations.bestTimeToVisit).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sun className="h-5 w-5" />
                    {t('itinerary.bestPeriods', 'Meilleures périodes')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.bestTimeToVisit).map(([destination, period]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <p className="text-sm text-muted-foreground">{period}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Local Events */}
            {recommendations?.localEvents && Object.keys(recommendations.localEvents).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PartyPopper className="w-5 h-5" /> {t('itinerary.localEvents', 'Événements locaux')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.localEvents).map(([destination, events]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {events.map((event, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {event}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transportation Tips */}
            {recommendations?.transportation && Object.keys(recommendations.transportation).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="w-5 h-5" /> {t('itinerary.transportTips', 'Conseils transport')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.transportation).map(([destination, tips]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <p className="text-sm text-muted-foreground">{tips}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Safety Tips */}
            {recommendations?.safety && Object.keys(recommendations.safety).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t('itinerary.safetyTips', 'Conseils sécurité')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.safety).map(([destination, safetyTips]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <ul className="space-y-1">
                          {safetyTips.map((tip, index) => (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Breakdown */}
            {recommendations?.budget && Object.keys(recommendations.budget).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    {t('itinerary.budgetDistribution', 'Répartition budget')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(recommendations.budget).map(([destination, budgetInfo]) => (
                      <div key={destination}>
                        <h4 className="font-medium mb-2">{destination}</h4>
                        <p className="text-sm text-muted-foreground">{budgetInfo}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Similar Destinations */}
          {recommendations?.similarDestinations && recommendations.similarDestinations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5" /> {t('itinerary.similarDestinations', 'Destinations similaires')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recommendations.similarDestinations.map((destination, index) => (
                    <Badge key={index} variant="secondary">
                      {destination}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Practical Info */}
      {practicalInfo?.destinations && Object.keys(practicalInfo.destinations).length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">{t('itinerary.practicalInformation', 'Informations pratiques')}</h2>
          
          <div className="grid gap-6">
            {Object.entries(practicalInfo.destinations).map(([destination, info]) => (
              <Card key={destination}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-4 h-4" /> {destination}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {info.visa && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" /> {t('itinerary.visaAndDocuments', 'Visa & Documents')}
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.visa}</p>
                      </div>
                    )}

                    {info.currency && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> {t('itinerary.currency', 'Monnaie')}
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.currency}</p>
                      </div>
                    )}

                    {info.language && info.language.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Languages className="w-4 h-4" /> {t('itinerary.languages', 'Langues')}
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.language.join(', ')}</p>
                      </div>
                    )}

                    {info.climate && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Cloud className="w-4 h-4" /> {t('itinerary.climate', 'Climat')}
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.climate}</p>
                      </div>
                    )}

                    {info.emergency && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Siren className="h-4 w-4" /> {t('itinerary.emergencies', 'Urgences')}
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.emergency}</p>
                      </div>
                    )}

                    {info.health && info.health.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <HeartPulse className="w-4 h-4" /> {t('itinerary.health', 'Santé')}
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {info.health.map((healthItem, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {healthItem}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {info.customs && info.customs.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Drama className="w-4 h-4" /> {t('itinerary.localCustoms', 'Coutumes locales')}
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {info.customs.map((custom, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0"></span>
                              {custom}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Booking Enrichment Panel - Controlled by admin settings */}
      {settings.bookingCenterEnabled && (
        <BookingEnrichmentPanel
          itinerary={itinerary}
          tripData={trip}
        />
      )}

      {/* Dialog de sauvegarde */}
      <SaveItineraryDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveItinerary}
      />

      {/* Dialog de réservation (centrale interne, si activée) */}
      <UnifiedBookingDialog
        isOpen={bookingDialog.isOpen}
        onClose={() => setBookingDialog(prev => ({ ...prev, isOpen: false }))}
        item={bookingDialog.item}
        bookingType={bookingDialog.type}
        defaultDates={bookingDialog.dates}
      />

      {/* Popup widgets de réservation (affiliation) — compact, iframe à la demande */}
      <WidgetBookingDialog
        open={bookingWidget.open}
        onOpenChange={(o) => setBookingWidget(prev => ({ ...prev, open: o }))}
        defaultTab={bookingWidget.tab}
      />

      {/* Éditeur de programme (overlay plein écran) */}
      {isEditing && (
        <EditableItineraryView
          itinerary={{
            id: savedId ?? '',
            title: itinerary.title || t('itinerary.personalizedItineraryTitle', 'Votre itinéraire personnalisé'),
            description: itinerary.description || '',
            itinerary_data: itinerary,
            is_favorite: false,
            created_at: '',
            updated_at: '',
          } as any}
          onSave={handleEditSave}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  );
};
