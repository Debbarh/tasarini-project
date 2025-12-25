import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { favoritePoiService, FavoritePOIEntry } from '@/services/favoritePoiService';
import { normalizeApiResponse } from '@/utils/apiHelpers';

export const useFavoritePOIs = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoritePOIEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await favoritePoiService.list();
      setFavorites(normalizeApiResponse(data));
    } catch (error: any) {
      console.error('Erreur lors du chargement des favoris:', error);
      toast.error(t('toast.hooks.favorites.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (touristPointId: string) => {
    if (!user) {
      toast.error(t('toast.hooks.favorites.loginRequired'));
      return;
    }

    try {
      await favoritePoiService.add(touristPointId);

      toast.success(t('toast.hooks.favorites.added'));
      fetchFavorites(); // Refresh the list
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      toast.error(t('toast.hooks.favorites.addError'));
    }
  };

  const removeFromFavorites = async (touristPointId: string) => {
    if (!user) return;

    try {
      const existing = favorites.find((fav) => fav.tourist_point_id === touristPointId);
      if (!existing) {
        return;
      }

      await favoritePoiService.remove(existing.id);

      toast.success(t('toast.hooks.favorites.removed'));
      fetchFavorites(); // Refresh the list
    } catch (error: any) {
      console.error('Erreur lors de la suppression des favoris:', error);
      toast.error(t('toast.hooks.favorites.removeError'));
    }
  };

  const isFavorite = (touristPointId: string) => {
    return favorites.some(fav => fav.tourist_point_id === touristPointId);
  };

  const toggleFavorite = async (touristPointId: string) => {
    if (isFavorite(touristPointId)) {
      await removeFromFavorites(touristPointId);
    } else {
      await addToFavorites(touristPointId);
    }
  };

  return {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    fetchFavorites
  };
};
