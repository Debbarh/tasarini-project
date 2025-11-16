// Service de géocodage inverse pour récupérer l'adresse depuis des coordonnées
export interface ReverseGeocodingResult {
  address: string;
  city?: string;
  country?: string;
  success: boolean;
}

// Cache simple pour éviter les requêtes répétées
const geocodingCache = new Map<string, ReverseGeocodingResult>();

export const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodingResult> => {
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  
  // Vérifier le cache
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }


  try {
    // Essayer Nominatim d'abord (gratuit et fiable)
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr&addressdetails=1&zoom=16`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VoyageAI/1.0',
        },
      }
    );

    if (nominatimResponse.ok) {
      const data = await nominatimResponse.json();
      
      if (data && data.display_name) {
        const result: ReverseGeocodingResult = {
          address: data.display_name,
          city: data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || data.address?.hamlet || data.address?.suburb,
          country: data.address?.country,
          success: true
        };
        
        // Mettre en cache
        geocodingCache.set(cacheKey, result);
        return result;
      }
    } else {
      console.warn('Échec Nominatim:', nominatimResponse.status, nominatimResponse.statusText);
    }

    // Fallback vers OpenRouteService si Nominatim échoue
    const orsResponse = await fetch(
      `https://api.openrouteservice.org/geocode/reverse?api_key=5b3ce3597851110001cf624822d8c5b0e32f4a3abf5e7e9d6c7b8a9c&point.lon=${lng}&point.lat=${lat}&size=1`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (orsResponse.ok) {
      const data = await orsResponse.json();
      
      if (data && data.features && data.features.length > 0) {
        const feature = data.features[0];
        const properties = feature.properties;
        const result: ReverseGeocodingResult = {
          address: properties.label || properties.name || 'Adresse non trouvée',
          city: properties.locality || properties.county || properties.region,
          country: properties.country,
          success: true
        };
        
        // Mettre en cache
        geocodingCache.set(cacheKey, result);
        return result;
      }
    } else {
      console.warn('Échec OpenRouteService:', orsResponse.status, orsResponse.statusText);
    }

    // Si tout échoue, retourner un résultat d'échec sans coordonnées brutes
    const fallbackResult: ReverseGeocodingResult = {
      address: 'Adresse non disponible',
      city: undefined,
      country: undefined,
      success: false
    };
    
    console.warn('Tous les services de géocodage ont échoué pour:', lat, lng);
    return fallbackResult;

  } catch (error) {
    console.error('Erreur lors du géocodage inverse:', error);
    return {
      address: 'Erreur de géocodage',
      city: undefined,
      country: undefined,
      success: false
    };
  }
};