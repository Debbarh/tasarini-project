import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedPOIFormData, POIFormContext, POIStatusEnum } from '@/types/poi-form';
import { toast } from 'sonner';
import { createTouristPoint, updateTouristPoint, TouristPointPayload } from '@/services/poiService';
import { locationService } from '@/services/locationService';

const isValidUUID = (value?: string | null) => {
  if (!value) return false;
  const matcher = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return matcher.test(value);
};

const normalizeArray = <T,>(value?: T[] | null) => (value && value.length > 0 ? value : undefined);

const buildMetadata = (
  formData: UnifiedPOIFormData,
  options: { location?: { country_id?: string; city_id?: string } | null; openingHours?: any; durationMinutes?: number | null },
) => {
  const metadata: Record<string, unknown> = {
    country: formData.country || null,
    city: formData.city || null,
    country_id: options.location?.country_id ?? null,
    city_id: options.location?.city_id ?? null,
    opening_hours: options.openingHours ?? null,
    cuisine_types: formData.cuisine_types ?? [],
    dietary_restrictions_supported: formData.dietary_restrictions_supported ?? [],
    restaurant_categories: formData.restaurant_categories ?? [],
    culinary_adventure_level_id: formData.culinary_adventure_level_id || null,
    media_images: formData.media_images ?? [],
    media_videos: formData.media_videos ?? [],
    accommodation_types: formData.accommodation_types ?? [],
    accommodation_amenities: formData.accommodation_amenities ?? [],
    accommodation_locations: formData.accommodation_locations ?? [],
    accommodation_accessibility: formData.accommodation_accessibility ?? [],
    accommodation_security: formData.accommodation_security ?? [],
    accommodation_ambiance: formData.accommodation_ambiance ?? [],
    accommodation_capacity: formData.accommodation_capacity ?? null,
    accommodation_rooms: formData.accommodation_rooms ?? null,
    activity_categories: formData.activity_categories ?? [],
    activity_intensity_level_id: formData.activity_intensity_level || null,
    activity_interests: formData.activity_interests ?? [],
    activity_avoidances: formData.activity_avoidances ?? [],
    activity_duration_minutes: options.durationMinutes ?? null,
    accessibility: {
      is_wheelchair_accessible: formData.is_wheelchair_accessible || false,
      has_accessible_parking: formData.has_accessible_parking || false,
      has_accessible_restrooms: formData.has_accessible_restrooms || false,
      has_audio_guide: formData.has_audio_guide || false,
      has_sign_language_support: formData.has_sign_language_support || false,
    },
  };

  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
};

export const usePOIFormSubmission = (context: POIFormContext) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const preparePOIData = useCallback(
    async (formData: UnifiedPOIFormData, targetStatus: POIStatusEnum): Promise<TouristPointPayload> => {
      const latitude = formData.latitude ? parseFloat(formData.latitude.toString()) : null;
      const longitude = formData.longitude ? parseFloat(formData.longitude.toString()) : null;

      let locationInfo: { country_id?: string; city_id?: string } | null = null;
      if (formData.country && formData.city) {
        try {
          const resolved = await locationService.resolve({
            country_name: formData.country,
            city_name: formData.city,
            latitude,
            longitude,
          });
          locationInfo = { country_id: resolved.country_id, city_id: resolved.city_id };
        } catch (error) {
          console.error('Unable to resolve location', error);
        }
      }

      let openingHoursJson: any = null;
      if (formData.opening_hours_structured) {
        openingHoursJson = formData.opening_hours_structured;
      } else if (formData.opening_hours && typeof formData.opening_hours === 'string') {
        try {
          openingHoursJson = JSON.parse(formData.opening_hours);
        } catch {
          openingHoursJson = null;
        }
      }

      const durationMinutes = formData.duration_hours ? Math.round(Number(formData.duration_hours) * 60) : null;
      const metadata = buildMetadata(formData, { location: locationInfo, openingHours: openingHoursJson, durationMinutes });

      const payload: TouristPointPayload = {
        name: formData.name,
        description: formData.description || undefined,
        address: formData.address || undefined,
        latitude,
        longitude,
        contact_phone: formData.contact_phone || undefined,
        contact_email: formData.contact_email || undefined,
        website_url: formData.website_url || undefined,
        price_range: formData.price_range || undefined,
        metadata,
        amenities: normalizeArray(formData.amenities),
        is_restaurant: !!formData.is_restaurant,
        is_accommodation: !!formData.is_accommodation,
        is_activity: !!formData.is_activity,
        tag_ids: normalizeArray(formData.tags),
        budget_level_id: isValidUUID(formData.budget_level_id) ? formData.budget_level_id : undefined,
        difficulty_level_id: isValidUUID(formData.difficulty_level_id) ? formData.difficulty_level_id : undefined,
        status_enum: targetStatus,
      };

      return payload;
    },
    [],
  );

  const submitPOI = useCallback(
    async (formData: UnifiedPOIFormData, isDraft: boolean = false) => {
      if (!user) {
        return { success: false, error: 'Utilisateur non connecté' };
      }

      setIsSubmitting(true);

      try {
        const status: POIStatusEnum = isDraft
          ? 'draft'
          : context.userType === 'partner'
            ? 'pending_validation'
            : formData.status_enum || 'pending_validation';

        const poiData = await preparePOIData(formData, status);
        const data = await createTouristPoint(poiData);

        toast.success(isDraft ? 'Brouillon sauvegardé avec succès!' : 'POI soumis avec succès!');
        return { success: true, data };
      } catch (error: any) {
        console.error('Error submitting POI:', error);
        return { success: false, error: error?.message || 'Erreur lors de la soumission' };
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, context.userType, preparePOIData],
  );

  const updatePOIEntry = useCallback(
    async (id: string, formData: UnifiedPOIFormData, isDraft: boolean = false) => {
      if (!user) {
        return { success: false, error: 'Utilisateur non connecté' };
      }

      setIsSubmitting(true);

      try {
        const status: POIStatusEnum = isDraft
          ? 'draft'
          : context.userType === 'partner'
            ? 'pending_validation'
            : formData.status_enum || 'pending_validation';

        const poiData = await preparePOIData(formData, status);
        const data = await updateTouristPoint(id, poiData);

        toast.success(isDraft ? 'Brouillon mis à jour avec succès!' : 'POI mis à jour avec succès!');
        return { success: true, data };
      } catch (error: any) {
        console.error('Error updating POI:', error);
        return { success: false, error: error?.message || 'Erreur lors de la mise à jour' };
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, context.userType, preparePOIData],
  );

  return {
    submitPOI,
    updatePOI: updatePOIEntry,
    isSubmitting,
  };
};
