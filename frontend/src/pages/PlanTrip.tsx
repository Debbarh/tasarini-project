import { Helmet } from "react-helmet-async";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TripWizard } from "@/components/trip/TripWizard";
import { DetailedItineraryView } from "@/components/trip/DetailedItineraryView";
import { useToast } from "@/hooks/use-toast";
import { TripFormData as NewTripFormData, DetailedItinerary } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AdvertisementModal from "@/components/advertisement/AdvertisementModal";
import { TripEnrichmentService, EnrichmentOptions } from "@/services/tripEnrichmentService";
import { tripPlannerService } from "@/services/tripPlannerService";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { apiClient } from "@/integrations/api/client";
import { useStreamingItinerary } from "@/hooks/useStreamingItinerary";
import { Zap } from "lucide-react";

interface GenerationProgress {
  step: string;
  progress: number;
  message: string;
}

const PlanTrip = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedItinerary, setGeneratedItinerary] = useState<DetailedItinerary | null>(null);
  const [originalTripData, setOriginalTripData] = useState<NewTripFormData | null>(null);
  const [showAdvertisement, setShowAdvertisement] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentOptions | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({ step: '', progress: 0, message: '' });
  const [useStreaming, setUseStreaming] = useState(true); // Enable streaming by default
  const [streamingContent, setStreamingContent] = useState('');
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { streamingState, startStreaming, cancelStreaming } = useStreamingItinerary();

  // Cleanup progress polling and streaming on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      cancelStreaming();
    };
  }, [cancelStreaming]);

  // Watch for streaming completion
  useEffect(() => {
    if (streamingState.itinerary && !streamingState.isStreaming && !streamingState.error) {
      setGeneratedItinerary(streamingState.itinerary);
      setIsLoading(false);
      setShowAdvertisement(false);

      toast({
        title: t('planTrip.itineraryGenerated'),
        description: "Itinéraire généré avec streaming en temps réel ⚡",
      });
    }

    if (streamingState.error) {
      setIsLoading(false);
      setShowAdvertisement(false);

      toast({
        title: t('planTrip.generationError'),
        description: streamingState.error,
        variant: "destructive",
      });
    }

    // Update progress from streaming
    if (streamingState.isStreaming) {
      setProgress({
        step: 'streaming',
        progress: streamingState.progress.progress,
        message: streamingState.progress.message,
      });
      setStreamingContent(streamingState.partialContent);
    }
  }, [streamingState, t, toast]);

  // Function to poll progress from backend
  const startProgressPolling = (sessionId: string) => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Poll every second
    progressIntervalRef.current = setInterval(async () => {
      try {
        const response = await apiClient.get<GenerationProgress>(
          `travel/planner/progress/?sessionId=${sessionId}`
        );
        setProgress(response);

        // Stop polling when complete
        if (response.progress >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
      }
    }, 1000);
  };

  const stopProgressPolling = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress({ step: '', progress: 0, message: '' });
  };

  const handleTripComplete = async (tripData: NewTripFormData) => {
    if (isLoading || streamingState.isStreaming) return;

    setIsLoading(true);
    setShowAdvertisement(true);
    setStreamingContent('');

    const sessionId = sessionStorage.getItem('travel_analytics_session');

    // Use streaming mode if enabled
    if (useStreaming) {
      if (!sessionId) {
        toast({
          title: "Erreur",
          description: "Session ID manquant pour le streaming",
          variant: "destructive",
        });
        setIsLoading(false);
        setShowAdvertisement(false);
        return;
      }

      // Start streaming
      startStreaming(tripData, sessionId);
      return;
    }

    // Use normal (non-streaming) mode
    if (sessionId) {
      startProgressPolling(sessionId);
    }

    const generateItinerary = async () => {
      try {
        const response = await tripPlannerService.planTrip(tripData, user?.id);

        if (!response?.itinerary) {
          throw new Error('Format de réponse invalide');
        }

        setGeneratedItinerary(response.itinerary);
        setOriginalTripData(tripData);

        let description = t('planTrip.personalizedTravel');
        if (response.hasUserContext) {
          description += " " + t('planTrip.withPreferences');
        }
        if (response.hasLocalContext) {
          description += " " + t('planTrip.withLocalPlaces');
        }

        toast({
          title: t('planTrip.itineraryGenerated'),
          description,
        });
      } catch (error: any) {
        console.error('❌ Erreur génération:', error);
        toast({
          title: t('planTrip.generationError'),
          description: error?.message || t('planTrip.tryAgainLater'),
          variant: "destructive",
        });
        setShowAdvertisement(false);
      } finally {
        setIsLoading(false);
        stopProgressPolling();
      }
    };

    generateItinerary();
  };

  const startItineraryEnrichment = async (itinerary: DetailedItinerary, tripData: NewTripFormData) => {
    setIsEnriching(true);

    try {
      const enrichmentService = new TripEnrichmentService({
        onProgress: (progress) => {
          if (progress.data) {
            setEnrichmentData(progress.data as EnrichmentOptions);
          }
        },
        enablePersonalization: Boolean(user),
      });

      const finalEnrichmentData = await enrichmentService.enrichItinerary(itinerary, tripData);
      setEnrichmentData(finalEnrichmentData);

      toast({
        title: t('planTrip.enrichmentComplete'),
        description: "Découvrez les hôtels, vols et restaurants recommandés pour votre voyage.",
      });
    } catch (error) {
      console.error('❌ Erreur enrichissement:', error);
      toast({
        title: t('planTrip.enrichmentError'),
        description: "Certaines options de réservation peuvent ne pas être disponibles.",
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleAdvertisementClose = () => {
    setShowAdvertisement(false);
  };

  // Don't render if module is disabled in admin settings
  if (!settings.planYourTripEnabled) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-6 sm:py-8 animate-fade-in">
      <Helmet>
        <title>{t('planTrip.pageTitle')}</title>
        <meta name="description" content={t('planTrip.pageDescription')} />
        <link rel="canonical" href="/plan" />
      </Helmet>

      {streamingState.isStreaming && streamingState.partialItinerary ? (
        // Show partial itinerary during streaming with typing effects
        <DetailedItineraryView
          itinerary={streamingState.partialItinerary}
          onStartOver={() => {
            cancelStreaming();
            setGeneratedItinerary(null);
          }}
          isStreaming={true}
        />
      ) : generatedItinerary ? (
        // Show complete itinerary after streaming finishes
        <div className="space-y-4 sm:space-y-6">
          <DetailedItineraryView
            itinerary={generatedItinerary}
            onStartOver={() => {
              setGeneratedItinerary(null);
              setEnrichmentData(null);
              setIsEnriching(false);
              setOriginalTripData(null);
            }}
            enrichmentData={enrichmentData}
            isEnriching={isEnriching}
            isStreaming={false}
          />
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => {
                setGeneratedItinerary(null);
                setEnrichmentData(null);
                setIsEnriching(false);
                setOriginalTripData(null);
              }}
              className="px-6 sm:px-8"
              size="sm"
            >
              <span className="hidden sm:inline">{t('planTrip.createNewTrip')}</span>
              <span className="sm:hidden">{t('planTrip.newTrip')}</span>
            </Button>
          </div>
        </div>
      ) : (
        // Show TripWizard when no itinerary
        <div className="space-y-6">
          {/* Streaming Mode Toggle */}
          <div className="flex items-center justify-end space-x-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <Label htmlFor="streaming-mode" className="flex items-center gap-2 cursor-pointer">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Mode Streaming en temps réel</span>
              <span className="text-xs text-muted-foreground">(Génération token-by-token)</span>
            </Label>
            <Switch
              id="streaming-mode"
              checked={useStreaming}
              onCheckedChange={setUseStreaming}
              disabled={isLoading || streamingState.isStreaming}
            />
          </div>

          <TripWizard
            onComplete={handleTripComplete}
            isLoading={isLoading || streamingState.isStreaming}
          />
        </div>
      )}

      <AdvertisementModal
        isOpen={showAdvertisement}
        onClose={handleAdvertisementClose}
        generationProgress={progress}
      />
    </main>
  );
};

export default PlanTrip;
