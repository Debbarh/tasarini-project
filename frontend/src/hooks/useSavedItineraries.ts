import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DetailedItinerary } from "@/types/trip";
import { useTranslation } from 'react-i18next';
import { savedItineraryService, SavedItinerary as ApiSavedItinerary } from "@/services/savedItineraryService";
import { extractArrayFromResponse } from "@/integrations/api/client";

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
  const { t } = useTranslation();
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSavedItineraries = async () => {
    // Skip call when not authenticated to avoid 401 spam
    const token = typeof window !== 'undefined' ? localStorage.getItem('tasarini_access_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await savedItineraryService.list();
      // Handle both array and paginated response formats
      const itinerariesArray = extractArrayFromResponse<ApiSavedItinerary>(data);
      setSavedItineraries(itinerariesArray.map(item => ({
        ...item,
        itinerary_data: item.itinerary_data as DetailedItinerary
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des itinéraires:', error);
      toast({
        title: t('toast.hooks.savedItineraries.loadError'),
        description: t('toast.hooks.savedItineraries.loadError'),
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

      const saved: SavedItinerary = {
        ...data,
        itinerary_data: data.itinerary_data as DetailedItinerary,
      };
      setSavedItineraries(prev => [saved, ...prev]);

      toast({
        title: t('toast.hooks.savedItineraries.saved'),
        description: `"${title}" ${t('toast.hooks.savedItineraries.saved')}`,
      });

      // Renvoie l'objet créé (avec son id) pour permettre le passage en mode PATCH
      return saved;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: t('toast.hooks.savedItineraries.saveError'),
        description: t('toast.hooks.savedItineraries.saveError'),
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteItinerary = async (id: string) => {
    try {
      await savedItineraryService.delete(id);

      setSavedItineraries(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: t('toast.hooks.savedItineraries.deleted'),
        description: t('toast.hooks.savedItineraries.deleted'),
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: t('toast.hooks.savedItineraries.deleteError'),
        description: t('toast.hooks.savedItineraries.deleteError'),
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
        title: t('toast.hooks.savedItineraries.updated'),
        description: t('toast.hooks.savedItineraries.updated'),
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: t('toast.hooks.savedItineraries.updateError'),
        description: t('toast.hooks.savedItineraries.updateError'),
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
