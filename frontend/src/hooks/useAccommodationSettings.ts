import { useState, useEffect } from 'react';
import { accommodationSettingsService, AccommodationTaxonomyEntry } from '@/services/accommodationSettingsService';
import { extractArrayFromResponse } from '@/integrations/api/client';

export const useAccommodationSettings = () => {
  const [accommodationTypes, setAccommodationTypes] = useState<AccommodationTaxonomyEntry[]>([]);
  const [accommodationAmenities, setAccommodationAmenities] = useState<AccommodationTaxonomyEntry[]>([]);
  const [accommodationLocations, setAccommodationLocations] = useState<AccommodationTaxonomyEntry[]>([]);
  const [accommodationAccessibility, setAccommodationAccessibility] = useState<AccommodationTaxonomyEntry[]>([]);
  const [accommodationSecurity, setAccommodationSecurity] = useState<AccommodationTaxonomyEntry[]>([]);
  const [accommodationAmbiance, setAccommodationAmbiance] = useState<AccommodationTaxonomyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        types,
        amenities,
        locations,
        accessibility,
        security,
        ambiance,
      ] = await Promise.all([
        accommodationSettingsService.listTypes(),
        accommodationSettingsService.listAmenities(),
        accommodationSettingsService.listLocations(),
        accommodationSettingsService.listAccessibility(),
        accommodationSettingsService.listSecurity(),
        accommodationSettingsService.listAmbiance(),
      ]);

      // Handle both array and paginated response formats
      setAccommodationTypes(extractArrayFromResponse<AccommodationTaxonomyEntry>(types));
      setAccommodationAmenities(extractArrayFromResponse<AccommodationTaxonomyEntry>(amenities));
      setAccommodationLocations(extractArrayFromResponse<AccommodationTaxonomyEntry>(locations));
      setAccommodationAccessibility(extractArrayFromResponse<AccommodationTaxonomyEntry>(accessibility));
      setAccommodationSecurity(extractArrayFromResponse<AccommodationTaxonomyEntry>(security));
      setAccommodationAmbiance(extractArrayFromResponse<AccommodationTaxonomyEntry>(ambiance));
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
    accommodationTypes,
    accommodationAmenities,
    accommodationLocations,
    accommodationAccessibility,
    accommodationSecurity,
    accommodationAmbiance,
    loading,
    error,
    refetch: fetchData
  };
};
