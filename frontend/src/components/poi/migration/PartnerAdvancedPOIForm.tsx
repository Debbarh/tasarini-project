import React, { useState } from 'react';
import { UnifiedPOIForm } from '@/components/poi/UnifiedPOIForm';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { normalizeOpeningHoursForForm } from '@/utils/poiFormNormalization';

interface PartnerAdvancedPOIFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingData?: Partial<UnifiedPOIFormData> | null;
  poiId?: string | null;
  isLoading?: boolean;
}

/**
 * Formulaire POI avancé pour partenaires - Remplace POICreationForm.tsx
 * Utilise UnifiedPOIForm avec configuration 'partnerAdvanced'
 */
export const PartnerAdvancedPOIForm: React.FC<PartnerAdvancedPOIFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingData = null,
  poiId = null,
  isLoading: formLoading = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccess = async (formData: UnifiedPOIFormData, result?: any) => {
    // Called after successful submission by UnifiedPOIForm
    onSuccess();
  };

  const handleCancel = () => {
    onClose();
  };

  const normalizedExistingData = existingData
    ? (() => {
        const { openingHoursText, openingHoursStructured } = normalizeOpeningHoursForForm(
          existingData.opening_hours_structured,
          existingData.opening_hours
        );

        return {
          ...existingData,
          opening_hours: openingHoursText || existingData.opening_hours || '',
          opening_hours_structured: openingHoursStructured ?? existingData.opening_hours_structured,
        };
      })()
    : null;

  return (
    <UnifiedPOIForm
      configName="partnerAdvanced"
      context={{
        mode: poiId ? 'edit' : 'create',
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
      onClose={onClose}
      onSubmit={handleSuccess}
      onCancel={handleCancel}
      existingData={normalizedExistingData}
      poiId={poiId}
      isLoading={formLoading}
    />
  );
};
