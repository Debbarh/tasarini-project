import React, { useState } from 'react';
import { UnifiedPOIForm } from '@/components/poi/UnifiedPOIForm';
import { UnifiedPOIFormData } from '@/types/poi-form';

interface PartnerSimplePOIFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Formulaire POI simplifié pour partenaires - Remplace TouristPointForm.tsx (version partner)
 * Utilise UnifiedPOIForm avec configuration 'partnerSimple'
 */
export const PartnerSimplePOIForm: React.FC<PartnerSimplePOIFormProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (formData: UnifiedPOIFormData, result?: any) => {
    // Called after successful submission by UnifiedPOIForm
    onSuccess();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <UnifiedPOIForm
      configName="partnerSimple"
      context={{
        mode: 'create',
        userType: 'partner',
        formComplexity: 'standard',
        validationLevel: 'standard',
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
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSuccess}
      onCancel={handleCancel}
    />
  );
};