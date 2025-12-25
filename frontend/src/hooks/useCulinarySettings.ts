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

      // Handle both array and paginated response formats
      const dietaryArray = Array.isArray(dietaryData)
        ? dietaryData
        : (dietaryData as any)?.results || [];
      const cuisineArray = Array.isArray(cuisineData)
        ? cuisineData
        : (cuisineData as any)?.results || [];
      const adventureArray = Array.isArray(adventureData)
        ? adventureData
        : (adventureData as any)?.results || [];
      const categoriesArray = Array.isArray(categoriesData)
        ? categoriesData
        : (categoriesData as any)?.results || [];

      setDietaryRestrictions(dietaryArray);
      setCuisineTypes(cuisineArray);
      setAdventureLevels(adventureArray);
      setRestaurantCategories(categoriesArray);
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
