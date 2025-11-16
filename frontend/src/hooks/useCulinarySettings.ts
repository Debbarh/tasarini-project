import { useState, useEffect } from 'react';
import { culinaryAdminService, DietaryRestriction, CuisineType, CulinaryAdventureLevel, RestaurantCategory } from '@/services/culinaryAdminService';

export const useCulinarySettings = () => {
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>([]);
  const [cuisineTypes, setCuisineTypes] = useState<CuisineType[]>([]);
  const [adventureLevels, setAdventureLevels] = useState<CulinaryAdventureLevel[]>([]);
  const [restaurantCategories, setRestaurantCategories] = useState<RestaurantCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dietaryData, cuisineData, adventureData, categoriesData] = await Promise.all([
        culinaryAdminService.listDietaryRestrictions(),
        culinaryAdminService.listCuisineTypes(),
        culinaryAdminService.listAdventureLevels(),
        culinaryAdminService.listRestaurantCategories(),
      ]);

      setDietaryRestrictions(dietaryData || []);
      setCuisineTypes(cuisineData || []);
      setAdventureLevels(adventureData || []);
      setRestaurantCategories(categoriesData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    dietaryRestrictions,
    cuisineTypes,
    adventureLevels,
    restaurantCategories,
    loading,
    error,
    refetch: fetchData
  };
};
