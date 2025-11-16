import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Save, Send } from 'lucide-react';
import { toast } from 'sonner';

import { POIFormConfiguration, POIFormContext } from '@/types/poi-form';
import { POI_FORM_CONFIGURATIONS } from './configurations/poi-form-configs';
import { usePOIFormData } from '@/hooks/usePOIFormData';
import { usePOIFormValidation } from '@/hooks/usePOIFormValidation';
import { usePOIFormSubmission } from '@/hooks/usePOIFormSubmission';

import { BasicInfoSection } from './sections/BasicInfoSection';
import { ContactSection } from './sections/ContactSection';
import { LocationSection } from './sections/LocationSection';
import { MediaSection } from './sections/MediaSection';
import { RestaurantSection } from './sections/RestaurantSection';
import { AccommodationSection } from './sections/AccommodationSection';
import { ActivitySection } from './sections/ActivitySection';
import { CategorizationSection } from './sections/CategorizationSection';
import { AccessibilitySection } from './sections/AccessibilitySection';
import { OpeningHoursSection } from './sections/OpeningHoursSection';

interface UnifiedPOIFormProps extends POIFormConfiguration {
  isOpen: boolean;
  onClose: () => void;
  configName?: keyof typeof POI_FORM_CONFIGURATIONS;
  existingData?: any;
  poiId?: string | null;
}

export const UnifiedPOIForm: React.FC<UnifiedPOIFormProps> = ({
  isOpen,
  onClose,
  context,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  existingData,
  poiId
}) => {
  const { formData, updateField, resetForm } = usePOIFormData(context, existingData || initialData);
  const { validateForm } = usePOIFormValidation(context);
  const { submitPOI, updatePOI, isSubmitting } = usePOIFormSubmission(context);

  const validationResult = validateForm(formData);

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validationResult.isValid) {
      toast.error('Veuillez corriger les erreurs avant de continuer');
      return;
    }

    try {
      let result;
      if (poiId && context.mode === 'edit') {
        result = await updatePOI(poiId, formData, isDraft);
      } else {
        result = await submitPOI(formData, isDraft);
      }
      
      if (result.success) {
        onSubmit?.(formData, result.data);
        if (!isDraft) {
          resetForm();
          onClose();
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Une erreur est survenue lors de la soumission');
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {context.mode === 'create' ? 'Créer un nouveau POI' : 'Modifier le POI'}
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations pour {context.mode === 'create' ? 'créer' : 'modifier'} votre point d'intérêt.
            Les champs marqués d'un astérisque (*) sont obligatoires.
          </DialogDescription>
          <div className="flex items-center gap-2 mt-2">
            <Progress value={validationResult.completionPercentage} className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {validationResult.completionPercentage}% complété
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {context.showSections.basicInfo && (
            <BasicInfoSection
              formData={formData}
              updateField={updateField}
              errors={validationResult.errors}
              required={context.requiredFields.includes('name')}
            />
          )}

          {context.showSections.location && (
            <LocationSection
              formData={formData}
              updateField={updateField}
              errors={validationResult.errors}
            />
          )}

          {context.showSections.contact && (
            <ContactSection
              formData={formData}
              updateField={updateField}
              errors={validationResult.errors}
              warnings={validationResult.warnings}
            />
          )}

          <OpeningHoursSection
            value={formData.opening_hours}
            structuredValue={formData.opening_hours_structured}
            onChange={(legacyValue, structuredValue) => {
              updateField('opening_hours', legacyValue);
              updateField('opening_hours_structured', structuredValue);
            }}
            poiType={formData.is_restaurant ? 'restaurant' : formData.is_accommodation ? 'accommodation' : formData.is_activity ? 'activity' : undefined}
            errors={validationResult.errors}
            warnings={validationResult.warnings}
          />

          {context.showSections.media && (
            <MediaSection
              formData={formData}
              updateField={updateField}
              warnings={validationResult.warnings}
            />
          )}

          {context.showSections.categorization && (
            <CategorizationSection
              formData={formData}
              updateField={updateField}
              errors={validationResult.errors}
            />
          )}

          {context.showSections.accessibility && (
            <AccessibilitySection
              formData={formData}
              updateField={updateField}
              errors={validationResult.errors}
            />
          )}

          {context.showSections.restaurant && (
            <RestaurantSection
              formData={formData}
              updateField={updateField}
              errors={validationResult.errors}
            />
          )}

          {context.showSections.accommodation && (
            <AccommodationSection
              formData={formData}
              updateField={updateField}
              errors={validationResult.errors}
            />
          )}

          {context.showSections.activity && (
            <ActivitySection
              formData={formData}
              updateField={updateField}
              errors={validationResult.errors}
            />
          )}
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting || isLoading}>
            Annuler
          </Button>
          
          <div className="flex gap-2">
            {context.userType === 'partner' && (
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting || isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder brouillon
              </Button>
            )}
            
            <Button
              onClick={() => handleSubmit(false)}
              disabled={!validationResult.isValid || isSubmitting || isLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              {context.mode === 'create' ? 'Créer' : 'Mettre à jour'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};