import React, { useState } from 'react';
import { UnifiedPOIForm } from '@/components/poi/UnifiedPOIForm';
import { UnifiedPOIFormData } from '@/types/poi-form';

interface UserPOIContributionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<UnifiedPOIFormData>;
}

/**
 * Formulaire de contribution POI pour utilisateurs - Remplace les formulaires dans BeInspired/Profile
 * Utilise UnifiedPOIForm avec configuration 'userContribution'
 */
export const UserPOIContributionForm: React.FC<UserPOIContributionFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData
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

  return (
    <UnifiedPOIForm
      configName="userContribution"
      context={{
        mode: 'create',
        userType: 'user',
        formComplexity: 'basic',
        validationLevel: 'basic',
        showSections: {
          basicInfo: true,
          location: true,
          contact: true,
          categorization: true,
          media: true,
          accessibility: false,
          restaurant: false,
          accommodation: false,
          activity: false,
          management: false,
          validation: false,
        },
        requiredFields: ['name', 'description', 'address', 'latitude', 'longitude'],
        conditionalFields: {},
      }}
      initialData={initialData}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
    />
  );
};