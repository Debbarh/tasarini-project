import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DetailedItinerary } from "@/types/trip";
import { savedItineraryService, SavedItinerary as ApiSavedItinerary } from "@/services/savedItineraryService";

export interface SavedItinerary {
  id: string;
  title: string;
  description?: string;
  itinerary_data: DetailedItinerary;
  destination_summary?: string;
  trip_duration?: number;
  travel_dates?: any;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export const useSavedItineraries = () => {
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSavedItineraries = async () => {
    try {
      const data = await savedItineraryService.list();
      setSavedItineraries((data || []).map(item => ({
        ...item,
        itinerary_data: item.itinerary_data as DetailedItinerary
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des itinéraires:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos itinéraires sauvegardés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveItinerary = async (
    title: string,
    itinerary: DetailedItinerary,
    description?: string
  ) => {
    try {
      // Créer un résumé des destinations
      const destinations = itinerary.trip?.destinations?.map(d => `${d.city}, ${d.country}`).join(', ') || '';
      const duration = itinerary.trip?.destinations?.reduce((total, dest) => total + (dest.duration || 0), 0) || 0;

      const payload = {
        title,
        description,
        itinerary_data: itinerary,
        destination_summary: destinations,
        trip_duration: duration,
        travel_dates: {
          start_date: itinerary.trip?.startDate ? new Date(itinerary.trip.startDate as any).toISOString() : undefined,
          end_date: itinerary.trip?.endDate ? new Date(itinerary.trip.endDate as any).toISOString() : undefined,
        },
      };

      const data = await savedItineraryService.create(payload);

      setSavedItineraries(prev => [{
        ...data,
        itinerary_data: data.itinerary_data as DetailedItinerary
      }, ...prev]);
      
      toast({
        title: "Itinéraire sauvegardé !",
        description: `"${title}" a été ajouté à vos itinéraires sauvegardés`,
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'itinéraire",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteItinerary = async (id: string) => {
    try {
      await savedItineraryService.delete(id);

      setSavedItineraries(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: "Itinéraire supprimé",
        description: "L'itinéraire a été supprimé de vos sauvegardes",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'itinéraire",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      await savedItineraryService.update(id, { is_favorite: isFavorite });

      setSavedItineraries(prev =>
        prev.map(item =>
          item.id === id ? { ...item, is_favorite: isFavorite } : item
        )
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour des favoris:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les favoris",
        variant: "destructive",
      });
    }
  };

  const updateItinerary = async (updatedItinerary: SavedItinerary) => {
    try {
      await savedItineraryService.update(updatedItinerary.id, {
        title: updatedItinerary.title,
        description: updatedItinerary.description,
        itinerary_data: updatedItinerary.itinerary_data,
      });

      setSavedItineraries(prev =>
        prev.map(item =>
          item.id === updatedItinerary.id ? updatedItinerary : item
        )
      );

      toast({
        title: "Itinéraire mis à jour !",
        description: "Vos modifications ont été sauvegardées avec succès",
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSavedItineraries();
  }, []);

  return {
    savedItineraries,
    loading,
    saveItinerary,
    updateItinerary,
    deleteItinerary,
    toggleFavorite,
    refreshItineraries: fetchSavedItineraries
  };
};
