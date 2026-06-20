import { Helmet } from "react-helmet-async";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TripWizard } from "@/components/trip/TripWizard";
import { DetailedItineraryView } from "@/components/trip/DetailedItineraryView";
import { useToast } from "@/hooks/use-toast";
import { TripFormData as NewTripFormData, DetailedItinerary } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AdvertisementModal from "@/components/advertisement/AdvertisementModal";
import { TripEnrichmentService, EnrichmentOptions } from "@/services/tripEnrichmentService";
import { tripPlannerService } from "@/services/tripPlannerService";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { apiClient } from "@/integrations/api/client";
import { useStreamingItinerary } from "@/hooks/useStreamingItinerary";
import { RegenerateDialog, RegenerateValues } from "@/components/trip/RegenerateDialog";

interface GenerationProgress {
  step: string;
  progress: number;
  message: string;
}

const PlanTrip = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedItinerary, setGeneratedItinerary] = useState<DetailedItinerary | null>(null);
  const [originalTripData, setOriginalTripData] = useState<NewTripFormData | null>(null);
  const [showAdvertisement, setShowAdvertisement] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentOptions | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({ step: '', progress: 0, message: '' });
  const [streamingContent, setStreamingContent] = useState('');
  const [showRegenerate, setShowRegenerate] = useState(false);
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

  // Restaurer le programme mis de côté avant une connexion ("Se connecter pour
  // modifier") afin qu'il ne disparaisse pas au retour sur la page.
  useEffect(() => {
    const pending = sessionStorage.getItem('tasarini_pending_itinerary');
    if (pending) {
      try {
        setGeneratedItinerary(JSON.parse(pending));
      } catch { /* JSON invalide : on ignore */ }
      sessionStorage.removeItem('tasarini_pending_itinerary');
      return;
    }
    // Restaurer le dernier programme généré (survit à un rechargement / remontage,
    // notamment sur mobile où un reload renverrait sinon au 1er step du wizard).
    const last = sessionStorage.getItem('tasarini_last_generated');
    if (last) {
      try {
        setGeneratedItinerary(JSON.parse(last));
      } catch { /* ignore */ }
    }
  }, []);

  // Watch for streaming completion
  useEffect(() => {
    if (streamingState.itinerary && !streamingState.isStreaming && !streamingState.error) {
      setGeneratedItinerary(streamingState.itinerary);
      try { sessionStorage.setItem('tasarini_last_generated', JSON.stringify(streamingState.itinerary)); } catch { /* quota */ }
      setIsLoading(false);
      setShowAdvertisement(false);

      toast({
        title: t('planTrip.itineraryGenerated'),
        description: "Itinéraire généré avec streaming en temps réel",
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

    const sessionId = sessionStorage.getItem('travel_analytics_session');
    if (!sessionId) {
      toast({
        title: "Erreur",
        description: "Session ID manquant pour le streaming",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setShowAdvertisement(true);
    setStreamingContent('');
    setOriginalTripData(tripData);

    // Génération TOUJOURS en streaming (effet machine à écrire, rendu progressif)
    startStreaming(tripData, sessionId, i18n.language);
  };

  // « Donne-moi une autre proposition » : réutilise les préférences initiales (originalTripData)
  // en y appliquant le rythme / nb d'activités / demandes ajustés, puis relance la génération.
  const handleRegenerate = (v: RegenerateValues) => {
    if (!originalTripData || isLoading || streamingState.isStreaming) return;
    const sessionId = sessionStorage.getItem('travel_analytics_session');
    if (!sessionId) {
      toast({ title: "Erreur", description: "Session ID manquant pour le streaming", variant: "destructive" });
      return;
    }
    const updated: NewTripFormData = {
      ...originalTripData,
      specialRequests: v.specialRequests,
      activityPreferences: {
        ...originalTripData.activityPreferences,
        intensity: v.intensity,
        activitiesPerDay: v.activitiesPerDay,
      },
    };
    setShowRegenerate(false);
    setGeneratedItinerary(null);
    setEnrichmentData(null);
    setIsEnriching(false);
    setOriginalTripData(updated);
    setIsLoading(true);
    setShowAdvertisement(true);
    setStreamingContent('');
    startStreaming(updated, sessionId, i18n.language);
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
            sessionStorage.removeItem('tasarini_last_generated');
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
              sessionStorage.removeItem('tasarini_last_generated');
              setGeneratedItinerary(null);
              setEnrichmentData(null);
              setIsEnriching(false);
              setOriginalTripData(null);
            }}
            enrichmentData={enrichmentData}
            isEnriching={isEnriching}
            isStreaming={false}
            onItineraryChange={setGeneratedItinerary}
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            {originalTripData && (
              <Button
                onClick={() => setShowRegenerate(true)}
                className="px-6 sm:px-8"
                size="sm"
              >
                {t('planTrip.regenerate.button', 'Donne-moi une autre proposition')}
              </Button>
            )}
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
          {originalTripData && (
            <RegenerateDialog
              open={showRegenerate}
              onOpenChange={setShowRegenerate}
              initial={{
                intensity: originalTripData.activityPreferences?.intensity || 'moderate',
                activitiesPerDay: originalTripData.activityPreferences?.activitiesPerDay,
                specialRequests: originalTripData.specialRequests || '',
              }}
              onSubmit={handleRegenerate}
            />
          )}
        </div>
      ) : (
        // Show TripWizard when no itinerary
        <div className="space-y-6">
          <TripWizard
            onComplete={handleTripComplete}
            isLoading={isLoading || streamingState.isStreaming}
          />
        </div>
      )}

      <AdvertisementModal
        isOpen={showAdvertisement}
        onClose={handleAdvertisementClose}
        generationProgress={{
          step: '',
          progress: streamingState.progress?.progress ?? 0,
          message: streamingState.progress?.message || '',
        }}
      />
    </main>
  );
};

export default PlanTrip;
