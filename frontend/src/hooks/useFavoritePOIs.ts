import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { favoritePoiService, FavoritePOIEntry } from '@/services/favoritePoiService';

export const useFavoritePOIs = () => {
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
      setFavorites(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des favoris:', error);
      toast.error('Erreur lors du chargement des favoris');
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (touristPointId: string) => {
    if (!user) {
      toast.error('Vous devez être connecté pour ajouter des favoris');
      return;
    }

    try {
      await favoritePoiService.add(touristPointId);

      toast.success('Point d\'intérêt ajouté aux favoris !');
      fetchFavorites(); // Refresh the list
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      toast.error('Erreur lors de l\'ajout aux favoris');
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

      toast.success('Point d\'intérêt retiré des favoris');
      fetchFavorites(); // Refresh the list
    } catch (error: any) {
      console.error('Erreur lors de la suppression des favoris:', error);
      toast.error('Erreur lors de la suppression des favoris');
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
