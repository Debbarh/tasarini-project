import React, { useState } from 'react';
import { UnifiedPOIForm } from '@/components/poi/UnifiedPOIForm';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { normalizeOpeningHoursForForm } from '@/utils/poiFormNormalization';

interface AdminPOIFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<UnifiedPOIFormData>;
  mode?: 'create' | 'edit';
}

/**
 * Formulaire POI complet pour administrateurs
 * Utilise UnifiedPOIForm avec configuration 'adminComplete'
 */
export const AdminPOIForm: React.FC<AdminPOIFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  mode = 'create'
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: UnifiedPOIFormData, result?: any) => {
    try {
      setIsLoading(true);
      // La soumission est gérée par UnifiedPOIForm
      await onSuccess();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const normalizedInitialData = initialData
    ? (() => {
        const { openingHoursText, openingHoursStructured } = normalizeOpeningHoursForForm(
          initialData.opening_hours_structured,
          initialData.opening_hours
        );

        return {
          ...initialData,
          opening_hours: openingHoursText || initialData.opening_hours || '',
          opening_hours_structured: openingHoursStructured ?? initialData.opening_hours_structured,
        };
      })()
    : undefined;

  return (
    <UnifiedPOIForm
      configName="adminComplete"
      context={{
        mode,
        userType: 'admin',
        formComplexity: 'advanced',
        validationLevel: 'strict',
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
          management: true,
          validation: true,
        },
        requiredFields: ['name', 'description', 'address', 'latitude', 'longitude', 'categories'],
        conditionalFields: {
          is_restaurant: ['cuisine_types', 'culinary_adventure_level_id'],
          is_accommodation: ['accommodation_types'],
          is_activity: ['activity_categories', 'activity_intensity_level'],
        },
      }}
      initialData={normalizedInitialData}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
    />
  );
};
