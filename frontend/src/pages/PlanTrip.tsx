import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { TripWizard } from "@/components/trip/TripWizard";
import { SmartItineraryPreview } from "@/components/trip/SmartItineraryPreview";
import { useToast } from "@/hooks/use-toast";
import { TripFormData as NewTripFormData, DetailedItinerary } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import AdvertisementModal from "@/components/advertisement/AdvertisementModal";
import { TripEnrichmentService, EnrichmentOptions } from "@/services/tripEnrichmentService";
import { tripPlannerService } from "@/services/tripPlannerService";

const PlanTrip = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedItinerary, setGeneratedItinerary] = useState<DetailedItinerary | null>(null);
  const [originalTripData, setOriginalTripData] = useState<NewTripFormData | null>(null);
  const [showAdvertisement, setShowAdvertisement] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentOptions | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const { toast } = useToast();

  const handleTripComplete = async (tripData: NewTripFormData) => {
    if (isLoading) return; // Prevent multiple concurrent calls
    
    setIsLoading(true);
    setShowAdvertisement(true); // Afficher la publicité immédiatement
    
    // Lancer la génération d'itinéraire en parallèle avec la publicité
    const generateItinerary = async () => {
      try {
        const response = await tripPlannerService.planTrip(tripData, user?.id);

        if (!response?.itinerary) {
          throw new Error('Format de réponse invalide');
        }

        setGeneratedItinerary(response.itinerary);
        setOriginalTripData(tripData);
        
        let description = "Votre voyage personnalisé créé par IA est prêt.";
        if (response.hasUserContext) {
          description += " ✨ Basé sur vos préférences !";
        }
        if (response.hasLocalContext) {
          description += " 📍 Avec des lieux locaux authentiques !";
        }
        
        toast({
          title: "Itinéraire généré avec succès !",
          description,
        });

        // Démarrer l'enrichissement avec Amadeus après génération réussie
        startItineraryEnrichment(response.itinerary, tripData);
      } catch (error: any) {
        console.error('❌ Erreur génération:', error);
        toast({
          title: "Erreur",
          description: error?.message || "Impossible de générer l'itinéraire. Veuillez réessayer.",
          variant: "destructive",
        });
        setShowAdvertisement(false); // Cacher la publicité en cas d'erreur
      } finally {
        setIsLoading(false);
      }
    };

    // Démarrer la génération immédiatement sans attendre la fin de la publicité
    generateItinerary();
  };

  // Fonction pour démarrer l'enrichissement Amadeus
  const startItineraryEnrichment = async (itinerary: DetailedItinerary, tripData: NewTripFormData) => {
    setIsEnriching(true);
    
    try {
      const enrichmentService = new TripEnrichmentService((progress) => {
        if (progress.data) {
          setEnrichmentData(progress.data as EnrichmentOptions);
        }
      });

      const finalEnrichmentData = await enrichmentService.enrichItinerary(itinerary, tripData);
      setEnrichmentData(finalEnrichmentData);
      
      toast({
        title: "Options de réservation disponibles !",
        description: "Découvrez les hôtels, vols et restaurants recommandés pour votre voyage.",
      });
    } catch (error) {
      console.error('❌ Erreur enrichissement:', error);
      toast({
        title: "Enrichissement partiel",
        description: "Certaines options de réservation peuvent ne pas être disponibles.",
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  // Fonction pour gérer la fermeture de la publicité
  const handleAdvertisementClose = () => {
    setShowAdvertisement(false);
  };

  return (
    <main className="container mx-auto px-4 py-6 sm:py-8 animate-fade-in">
      <Helmet>
        <title>Planifiez votre échappée parfaite | Voyage AI</title>
        <meta name="description" content="Créez votre itinéraire de rêve en quelques clics. Notre IA conçoit des aventures sur mesure qui transforment vos envies en souvenirs magiques." />
        <link rel="canonical" href="/plan" />
      </Helmet>

      {!generatedItinerary ? (
        <TripWizard 
          onComplete={handleTripComplete}
          isLoading={isLoading}
        />
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <SmartItineraryPreview
            itinerary={generatedItinerary}
            enrichmentData={enrichmentData}
            isEnriching={isEnriching}
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
              <span className="hidden sm:inline">Créer un nouveau voyage</span>
              <span className="sm:hidden">Nouveau voyage</span>
            </Button>
          </div>
        </div>
      )}

      {/* Modal de publicité */}
      <AdvertisementModal 
        isOpen={showAdvertisement} 
        onClose={handleAdvertisementClose}
      />
    </main>
  );
};

export default PlanTrip;
