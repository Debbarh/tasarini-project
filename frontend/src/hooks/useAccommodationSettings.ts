import { useState, useEffect } from 'react';
import { accommodationSettingsService, AccommodationTaxonomyEntry } from '@/services/accommodationSettingsService';

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

      setAccommodationTypes(types ?? []);
      setAccommodationAmenities(amenities ?? []);
      setAccommodationLocations(locations ?? []);
      setAccommodationAccessibility(accessibility ?? []);
      setAccommodationSecurity(security ?? []);
      setAccommodationAmbiance(ambiance ?? []);
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
