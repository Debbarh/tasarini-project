import React, { useState, useEffect } from 'react';
import { UnifiedPOIForm } from '@/components/poi/UnifiedPOIForm';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { normalizeOpeningHoursForForm } from '@/utils/poiFormNormalization';

interface PartnerPOIEditFormProps {
  poiId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Formulaire d'édition POI pour partenaires - Utilise UnifiedPOIForm en mode édition
 */
export const PartnerPOIEditForm: React.FC<PartnerPOIEditFormProps> = ({
  poiId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [existingData, setExistingData] = useState<Partial<UnifiedPOIFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (poiId && isOpen) {
      fetchPOIData();
    }
  }, [poiId, isOpen]);

  // Helper function to map POI data to main categories
  const mapPOIDataToCategories = (data: any): string[] => {
    const categories: string[] = [];
    
    if (data.is_restaurant) {
      categories.push('restaurant');
    }
    if (data.is_accommodation) {
      categories.push('hébergement');
    }
    if (data.is_activity) {
      categories.push('activité');
    }
    
    return categories;
  };

  const fetchPOIData = async () => {
    if (!poiId) return;

    setIsLoading(true);
    try {
      const data = await apiClient.get<any>(`poi/tourist-points/${poiId}/`);

      const { openingHoursText, openingHoursStructured } = normalizeOpeningHoursForForm(
        data.opening_hours_structured,
        data.opening_hours
      );

      // Map database data to form format
      const formData: Partial<UnifiedPOIFormData> = {
        name: data.name || '',
        description: data.description || '',
        address: data.address || '',
        latitude: data.latitude?.toString() || '',
        longitude: data.longitude?.toString() || '',
        country: data.countries?.name || '',
        city: data.cities?.name || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        website_url: data.website_url || '',
        opening_hours: openingHoursText || '',
        opening_hours_structured: openingHoursStructured,
        tags: data.tags || [],
        categories: mapPOIDataToCategories(data), // Use helper function to map categories
        difficulty_level_id: data.difficulty_level_id || '',
        price_range: data.price_range || '',
        budget_level_id: data.budget_level_id || '',
        media_images: data.media_images || [],
        media_videos: data.media_videos || [],
        is_wheelchair_accessible: data.is_wheelchair_accessible || false,
        has_accessible_parking: data.has_accessible_parking || false,
        has_accessible_restrooms: data.has_accessible_restrooms || false,
        has_audio_guide: data.has_audio_guide || false,
        has_sign_language_support: data.has_sign_language_support || false,
        is_restaurant: data.is_restaurant || false,
        cuisine_types: data.cuisine_types || [],
        dietary_restrictions_supported: data.dietary_restrictions_supported || [],
        restaurant_categories: data.restaurant_categories || [],
        culinary_adventure_level_id: data.culinary_adventure_level_id || '',
        is_accommodation: data.is_accommodation || false,
        accommodation_types: data.accommodation_types || [],
        accommodation_amenities: data.accommodation_amenities || [],
        accommodation_locations: data.accommodation_locations || [],
        accommodation_accessibility: data.accommodation_accessibility || [],
        accommodation_security: data.accommodation_security || [],
        accommodation_ambiance: data.accommodation_ambiance || [],
        is_activity: data.is_activity || false,
        activity_categories: data.activity_categories || [],
        activity_intensity_level: data.activity_intensity_level_id || '',
        activity_interests: data.activity_interests || [],
        activity_avoidances: data.activity_avoidances || [],
        status_enum: data.status_enum || 'draft',
        amenities: Array.isArray(data.amenities) ? data.amenities.join(', ') : (data.amenities || ''),
        special_features: [],
        target_audience: [],
      };

      setExistingData(formData);
    } catch (error) {
      console.error('Error fetching POI data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async (formData: UnifiedPOIFormData, result?: any) => {
    // Called after successful update by UnifiedPOIForm
    onSuccess();
    onClose();
  };

  const handleCancel = () => {
    setExistingData(null);
    onClose();
  };

  if (!poiId) return null;

  // Ne pas afficher le formulaire tant que les données ne sont pas chargées
  if (isLoading || !existingData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogTitle>Chargement</DialogTitle>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des données...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <UnifiedPOIForm
      configName="partnerAdvanced"
      context={{
        mode: 'edit',
        userType: 'partner',
        formComplexity: 'advanced',
        validationLevel: 'advanced',
        showSections: {
          basicInfo: true,
          location: true,
          contact: true,
          categorization: true,
          media: true,
          accessibility: true,
          restaurant: true,
          accommodation: true,
          activity: true,
          management: false,
          validation: false,
        },
        requiredFields: ['name', 'description', 'address', 'latitude', 'longitude', 'categories'],
        conditionalFields: {
          is_restaurant: ['cuisine_types', 'culinary_adventure_level_id'],
          is_accommodation: ['accommodation_types'],
          is_activity: ['activity_categories', 'activity_intensity_level'],
        },
      }}
      isOpen={isOpen}
      onClose={handleCancel}
      onSubmit={handleSuccess}
      onCancel={handleCancel}
      existingData={existingData}
      poiId={poiId}
      isLoading={isLoading}
    />
  );
};
