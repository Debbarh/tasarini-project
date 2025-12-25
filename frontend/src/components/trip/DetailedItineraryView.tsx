import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTypingEffect } from "@/hooks/useTypingEffect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Users, Wallet, ArrowLeft, Download, Share2, Clock, Star, MessageCircle, Facebook, Twitter, Copy, Gift, Utensils, Backpack, Info, Sun, Shield, Save, ShoppingCart, ChevronDown, ChevronUp, Euro, Sparkles, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DetailedItinerary, UnsplashImage } from "@/types/trip";
import { exportItineraryToPDF, shareItinerary, copyItineraryLink } from "@/utils/itineraryExport";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedItineraries } from "@/hooks/useSavedItineraries";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import SaveItineraryDialog from "@/components/itinerary/SaveItineraryDialog";
import { UnifiedBookingDialog } from "@/components/booking/UnifiedBookingDialog";
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
}

type GalleryImage = UnsplashImage & { city?: string };

const DestinationGallery = ({ images }: { images: GalleryImage[] }) => {
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
                    alt={image.description || `Photo de ${image.city || 'destination'}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-2">
                    <div className="text-xs uppercase tracking-wide text-white/80">
                      {image.city ? image.city : 'Destination'} • Inspirez votre voyage
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-semibold leading-tight drop-shadow">
                      {image.description || "Vue emblématique à ne pas manquer"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                      <span>📷 {image.photographer}</span>
                      {image.photographerUsername && (
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
                          @{image.photographerUsername}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30" onClick={() => setLightboxIndex(currentIndex)}>
                        <Maximize2 className="h-4 w-4 mr-2" />
                        Voir en grand
                      </Button>
                      {isPaused && (
                        <span className="text-xs text-white/80 self-center">Lecture en pause</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {total > 1 && (
              <>
                <button
                  aria-label="Image précédente"
                  onClick={() => goTo(currentIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white p-2 hover:bg-black/60 transition"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  aria-label="Image suivante"
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
                      aria-label={`Aller à l'image ${index + 1}`}
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
                    alt={image.description || `Miniature ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-1 left-2 right-2 text-[10px] text-white truncate">
                    {image.city || 'Destination'}
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
                {activeImage.city || 'Destination'} — {activeImage.description || 'Inspiration de voyage'}
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
                    aria-label="Image précédente"
                    onClick={() => setLightboxIndex((prev) => {
                      if (prev === null) return 0;
                      return (prev - 1 + total) % total;
                    })}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 text-white p-3 hover:bg-white/25 transition"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    aria-label="Image suivante"
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
                <p className="text-sm font-semibold">{lightboxIndex !== null ? images[lightboxIndex].city || 'Destination' : activeImage.city || 'Destination'}</p>
                <p className="text-xs text-white/80">
                  {lightboxIndex !== null ? images[lightboxIndex].description || 'Instantané inspirant' : activeImage.description || 'Instantané inspirant'}
                </p>
                <p className="text-xs text-white/70">📷 {lightboxIndex !== null ? images[lightboxIndex].photographer : activeImage.photographer}</p>
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

export const DetailedItineraryView = ({ itinerary, onStartOver, enrichmentData, isEnriching = false, isStreaming = false }: DetailedItineraryViewProps) => {
  // State for lazy-loaded images
  const [destinationImages, setDestinationImages] = useState<Record<string, UnsplashImage[]>>(itinerary?.destinationImages || {});
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const imagesPollingRef = useRef<NodeJS.Timeout | null>(null);

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
                <h3 className="text-lg font-semibold">Génération de votre itinéraire...</h3>
                <p className="text-muted-foreground">
                  L'IA prépare votre programme personnalisé. Les sections apparaîtront progressivement.
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
              <div className="text-4xl">⚠️</div>
              <h3 className="text-lg font-semibold">Problème de chargement</h3>
              <p className="text-muted-foreground">
                L'itinéraire n'a pas pu être chargé correctement. Cela peut être dû à un problème temporaire.
              </p>
              <div className="flex gap-2 justify-center pt-4">
                <Button onClick={onStartOver} variant="default">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Créer un nouvel itinéraire
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { trip, totalCost, practicalInfo, recommendations } = itinerary;
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
  const { saveItinerary } = useSavedItineraries();
  const { settings } = useSystemSettings();

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
        title: "PDF exporté avec succès",
        description: "Votre itinéraire a été téléchargé en PDF.",
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le PDF. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'twitter') => {
    try {
      await shareItinerary(itinerary, platform);
    } catch (error) {
      toast({
        title: "Erreur de partage",
        description: "Impossible de partager. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyItineraryLink();
      toast({
        title: "Lien copié",
        description: "Le lien de votre itinéraire a été copié dans le presse-papiers.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien.",
        variant: "destructive",
      });
    }
  };

  const handleSaveItinerary = async (title: string, description?: string) => {
    return await saveItinerary(title, itinerary, description);
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
      description: `${mealType === 'breakfast' ? 'Petit-déjeuner' : mealType === 'lunch' ? 'Déjeuner' : 'Dîner'} à ${typeof meal.location === 'string' ? meal.location : meal.location?.name || destination}`,
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
        return 'Voyage solo';
      case 'couple':
        return 'Voyage en couple';
      case 'family':
        return `Famille${trip.travelGroup.children?.count ? ` avec ${trip.travelGroup.children.count} enfant${trip.travelGroup.children.count > 1 ? 's' : ''}` : ''}`;
      case 'group':
        return `Groupe de ${trip.travelGroup.size} personnes`;
      default:
        return '';
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Votre itinéraire personnalisé</h1>
          <p className="text-muted-foreground">
            <TypedText
              text="Voyage généré avec vos préférences personnelles"
              isStreaming={isStreaming}
              delay={20}
              speed={2}
            />
          </p>
        </div>
        <div className="flex gap-2">
          {user && (
            <Button onClick={() => setShowSaveDialog(true)}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          )}
          <Button variant="outline" onClick={onStartOver}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nouveau voyage
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exporter PDF
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Partager
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
                Copier le lien
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
              <div className="mb-2">📸</div>
              <p className="text-sm">Chargement des images des destinations...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Overview */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Aperçu du voyage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Dates
              </div>
              <p className="font-medium">
                {trip.startDate && trip.endDate ? (
                  <>
                    {format(new Date(trip.startDate), "dd MMM", { locale: fr })} - {format(new Date(trip.endDate), "dd MMM yyyy", { locale: fr })}
                  </>
                ) : (
                  'Dates à définir'
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {calculateTotalDuration()} jour{calculateTotalDuration() > 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Groupe
              </div>
              <p className="font-medium">
                <TypedText text={getTravelGroupDescription()} isStreaming={isStreaming} delay={20} speed={2} />
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Budget
              </div>
              <p className="font-medium">{trip.budget.level} - {trip.budget.dailyBudget}€/jour</p>
              <p className="text-sm text-muted-foreground">
                Total estimé: {totalCost}€
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Destinations
              </div>
              <div className="space-y-1">
                {trip.destinations.map((dest, index) => (
                  <p key={index} className="text-sm font-medium">
                    <TypedText
                      text={`${dest.city}, ${dest.country} (${dest.duration}j)`}
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
              Répartition du budget
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
                    {category === 'accommodation' ? 'Hébergement' :
                     category === 'food' ? 'Nourriture' :
                     category === 'activities' ? 'Activités' :
                     category === 'transport' ? 'Transport' :
                     category === 'shopping' ? 'Shopping' :
                     category === 'miscellaneous' ? 'Divers' : category}
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
            <h2 className="text-2xl font-bold">Itinéraire détaillé</h2>
            <Badge variant="secondary">
              {itinerary.days.length} jour{itinerary.days.length > 1 ? 's' : ''}
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
                        Jour {index + 1} - {format(new Date(day.date), "EEEE dd MMMM", { locale: fr })}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">{day.destination}</Badge>
                        <Badge variant="secondary">
                          <TypedText text={day.theme || ''} isStreaming={isStreaming} delay={50} speed={3} />
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Budget journalier</p>
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
                        Activités programmées
                      </h4>
                      <div className="space-y-3">
                        {day.activities.map((activity, actIndex) => (
                          <div key={actIndex} className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex-shrink-0">
                              <Badge variant="outline" className="font-mono">
                                {activity.time}
                              </Badge>
                            </div>
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
                                  {typeof activity.location === 'string' ? activity.location : activity.location?.name || 'Lieu non spécifié'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {typeof activity.duration === 'string' ? activity.duration : `${Math.floor(Number(activity.duration) / 60)}h${Number(activity.duration) % 60 > 0 ? ` ${Number(activity.duration) % 60}min` : ''}`}
                                </span>
                                <Badge 
                                  variant={activity.difficulty === 'easy' ? 'secondary' : activity.difficulty === 'moderate' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {activity.difficulty === 'easy' ? 'Facile' : activity.difficulty === 'moderate' ? 'Modéré' : 'Difficile'}
                                </Badge>
                              </div>
                              {activity.tips && activity.tips.length > 0 && (
                                <div className="mt-2">
                                  <details className="group">
                                    <summary className="cursor-pointer text-xs text-primary hover:text-primary/80">
                                      💡 Conseils ({activity.tips.length})
                                    </summary>
                                    <ul className="mt-1 text-xs text-muted-foreground space-y-1 pl-4">
                                      {(typeof activity.tips === 'string' ? [activity.tips] : activity.tips || []).map((tip, tipIndex) => (
                                        <li key={tipIndex} className="list-disc">{tip}</li>
                                      ))}
                                    </ul>
                                  </details>
                                </div>
                              )}

                              {/* Booking Button */}
                              <Button
                                onClick={() => handleBookActivity(activity, day.date, day.destination)}
                                className="w-full sm:w-auto mt-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                                size="sm"
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Réserver cette activité
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
                        🍽️ Repas recommandés
                      </h4>
                      <div className="grid gap-3 md:grid-cols-3">
                        {day.meals?.breakfast && (
                          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 space-y-2">
                            <h5 className="font-medium text-sm mb-1">🌅 Petit-déjeuner</h5>
                            <p className="text-sm">
                              <TypedText text={day.meals.breakfast.title || ''} isStreaming={isStreaming} delay={40} speed={2} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <TypedText
                                text={`${typeof day.meals.breakfast.location === 'string' ? day.meals.breakfast.location : day.meals.breakfast.location?.name || 'Lieu non spécifié'} • ${day.meals.breakfast.cost}€`}
                                isStreaming={isStreaming}
                                delay={50}
                                speed={2}
                              />
                            </p>
                            <Button
                              onClick={() => handleBookMeal(day.meals.breakfast, 'breakfast', day.date, day.destination)}
                              className="w-full mt-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
                              size="sm"
                            >
                              <Utensils className="w-3 h-3 mr-1" />
                              Réserver
                            </Button>
                          </div>
                        )}
                        {day.meals?.lunch && (
                          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 space-y-2">
                            <h5 className="font-medium text-sm mb-1">☀️ Déjeuner</h5>
                            <p className="text-sm">
                              <TypedText text={day.meals.lunch.title || ''} isStreaming={isStreaming} delay={40} speed={2} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <TypedText
                                text={`${typeof day.meals.lunch.location === 'string' ? day.meals.lunch.location : day.meals.lunch.location?.name || 'Lieu non spécifié'} • ${day.meals.lunch.cost}€`}
                                isStreaming={isStreaming}
                                delay={50}
                                speed={2}
                              />
                            </p>
                            <Button
                              onClick={() => handleBookMeal(day.meals.lunch, 'lunch', day.date, day.destination)}
                              className="w-full mt-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-sm"
                              size="sm"
                            >
                              <Utensils className="w-3 h-3 mr-1" />
                              Réserver
                            </Button>
                          </div>
                        )}
                        {day.meals?.dinner && (
                          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-2">
                            <h5 className="font-medium text-sm mb-1">🌙 Dîner</h5>
                            <p className="text-sm">
                              <TypedText text={day.meals.dinner.title || ''} isStreaming={isStreaming} delay={40} speed={2} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <TypedText
                                text={`${typeof day.meals.dinner.location === 'string' ? day.meals.dinner.location : day.meals.dinner.location?.name || 'Lieu non spécifié'} • ${day.meals.dinner.cost}€`}
                                isStreaming={isStreaming}
                                delay={50}
                                speed={2}
                              />
                            </p>
                            <Button
                              onClick={() => handleBookMeal(day.meals.dinner, 'dinner', day.date, day.destination)}
                              className="w-full mt-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-sm"
                              size="sm"
                            >
                              <Utensils className="w-3 h-3 mr-1" />
                              Réserver
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
                          🚗 Transport
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
                        <span className="text-muted-foreground">Distance de marche estimée</span>
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
              Génération de l'itinéraire jour par jour...
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              L'IA crée votre programme personnalisé avec toutes les activités
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Les journées de votre itinéraire apparaîtront progressivement ci-dessus avec l'effet typing...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Itinéraire détaillé</CardTitle>
            <p className="text-sm text-muted-foreground">
              Programme jour par jour personnalisé selon vos préférences
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Génération en cours d'amélioration</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  L'itinéraire détaillé avec activités minute par minute sera bientôt disponible.
                  Pour l'instant, vous pouvez voir le résumé de votre voyage ci-dessus.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enriched Sections */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Informations complémentaires</h2>
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
            Ces informations s'afficheront dès que l'itinéraire inclura des contenus enrichis.
          </p>
        )}
      </div>

      {/* Recommendations */}
      {(recommendations?.mustTryDishes || recommendations?.giftIdeas || recommendations?.packingList || recommendations?.culturalTips) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Recommandations personnalisées</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Culinary Recommendations */}
            {recommendations?.mustTryDishes && Object.keys(recommendations.mustTryDishes).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    🍽️ Spécialités à découvrir
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
                    🎁 Idées souvenirs
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
                    🎒 Liste de voyage
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
                    🏛️ Conseils culturels
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
                    Meilleures périodes
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
                    🎪 Événements locaux
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
                    🚗 Conseils transport
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
                    Conseils sécurité
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
                    Répartition budget
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
                  🌍 Destinations similaires
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
          <h2 className="text-2xl font-bold">Informations pratiques</h2>
          
          <div className="grid gap-6">
            {Object.entries(practicalInfo.destinations).map(([destination, info]) => (
              <Card key={destination}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ℹ️ {destination}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {info.visa && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          📄 Visa & Documents
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.visa}</p>
                      </div>
                    )}

                    {info.currency && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          💰 Monnaie
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.currency}</p>
                      </div>
                    )}

                    {info.language && info.language.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          🗣️ Langues
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.language.join(', ')}</p>
                      </div>
                    )}

                    {info.climate && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          🌤️ Climat
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.climate}</p>
                      </div>
                    )}

                    {info.emergency && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          🚨 Urgences
                        </h4>
                        <p className="text-sm text-muted-foreground">{info.emergency}</p>
                      </div>
                    )}

                    {info.health && info.health.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          🏥 Santé
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
                          🎭 Coutumes locales
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

      {/* Dialog de réservation */}
      <UnifiedBookingDialog
        isOpen={bookingDialog.isOpen}
        onClose={() => setBookingDialog(prev => ({ ...prev, isOpen: false }))}
        item={bookingDialog.item}
        bookingType={bookingDialog.type}
        defaultDates={bookingDialog.dates}
      />
    </div>
  );
};
