import { useCallback } from 'react';
import { UnifiedPOIFormData, POIFormContext, POIFormValidationResult } from '@/types/poi-form';

export const usePOIFormValidation = (context: POIFormContext) => {
  
  const validateBasicFields = useCallback((data: UnifiedPOIFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.name.trim()) {
      errors.name = 'Le nom est requis';
    } else if (data.name.length < 3) {
      errors.name = 'Le nom doit contenir au moins 3 caractères';
    }

    if (!data.description.trim()) {
      errors.description = 'La description est requise';
    } else if (data.description.length < 20) {
      errors.description = 'La description doit contenir au moins 20 caractères';
    }

    if (!data.address.trim()) {
      errors.address = 'L\'adresse est requise';
    }

    if (!data.latitude || !data.longitude) {
      errors.location = 'La localisation GPS est requise';
    }

    return errors;
  }, []);

  const validateContactFields = useCallback((data: UnifiedPOIFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (data.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)) {
      errors.contact_email = 'Email invalide';
    }

    if (data.contact_phone && !/^[\+]?[\d\s\-\(\)]{8,}$/.test(data.contact_phone)) {
      errors.contact_phone = 'Numéro de téléphone invalide';
    }

    if (data.website_url && !/^https?:\/\/.+/.test(data.website_url)) {
      errors.website_url = 'URL invalide (doit commencer par http:// ou https://)';
    }

    return errors;
  }, []);

  const validateCategorizationFields = useCallback((data: UnifiedPOIFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (context.formComplexity !== 'basic' && data.categories.length === 0) {
      errors.categories = 'Au moins une catégorie est requise';
    }

    if (context.formComplexity === 'advanced' && data.tags.length === 0) {
      errors.tags = 'Au moins un tag est requis';
    }

    return errors;
  }, [context.formComplexity]);

  const validateRestaurantFields = useCallback((data: UnifiedPOIFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (data.is_restaurant) {
      if (data.cuisine_types.length === 0) {
        errors.cuisine_types = 'Au moins un type de cuisine est requis pour un restaurant';
      }
      
      if (!data.culinary_adventure_level_id && context.formComplexity === 'advanced') {
        errors.culinary_adventure_level_id = 'Le niveau d\'aventure culinaire est requis';
      }
    }

    return errors;
  }, [context.formComplexity]);

  const validateAccommodationFields = useCallback((data: UnifiedPOIFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (data.is_accommodation) {
      if (data.accommodation_types.length === 0) {
        errors.accommodation_types = 'Au moins un type d\'hébergement est requis';
      }
      
      if (context.formComplexity === 'advanced' && data.accommodation_amenities.length === 0) {
        errors.accommodation_amenities = 'Au moins un équipement est requis';
      }
    }

    return errors;
  }, [context.formComplexity]);

  const validateActivityFields = useCallback((data: UnifiedPOIFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (data.is_activity) {
      if (data.activity_categories.length === 0) {
        errors.activity_categories = 'Au moins une catégorie d\'activité est requise';
      }
      
      if (!data.activity_intensity_level) {
        errors.activity_intensity_level = 'Le niveau d\'intensité est requis';
      }

      if (data.min_age !== null && data.max_age !== null && data.min_age > data.max_age) {
        errors.age_range = 'L\'âge minimum ne peut pas être supérieur à l\'âge maximum';
      }

      if (data.max_participants !== null && data.max_participants <= 0) {
        errors.max_participants = 'Le nombre maximum de participants doit être positif';
      }
    }

    return errors;
  }, []);

  const validateForm = useCallback((data: UnifiedPOIFormData): POIFormValidationResult => {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Validation de base
    Object.assign(errors, validateBasicFields(data));

    // Validation des sections selon le contexte
    if (context.showSections.contact) {
      Object.assign(errors, validateContactFields(data));
    }

    if (context.showSections.categorization) {
      Object.assign(errors, validateCategorizationFields(data));
    }

    if (context.showSections.restaurant) {
      Object.assign(errors, validateRestaurantFields(data));
    }

    if (context.showSections.accommodation) {
      Object.assign(errors, validateAccommodationFields(data));
    }

    if (context.showSections.activity) {
      Object.assign(errors, validateActivityFields(data));
    }

    // Calcul du pourcentage de completion
    const requiredFieldsCount = context.requiredFields.length;
    const completedFieldsCount = context.requiredFields.filter(field => {
      const value = data[field as keyof UnifiedPOIFormData];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'boolean') return true;
      return value !== null && value !== undefined;
    }).length;

    const completionPercentage = requiredFieldsCount > 0 
      ? Math.round((completedFieldsCount / requiredFieldsCount) * 100) 
      : 100;

    // Avertissements pour améliorer la qualité
    if (!data.contact_phone && !data.contact_email) {
      warnings.contact = 'Ajoutez au moins un moyen de contact pour améliorer la visibilité';
    }

    if (data.media_images.length === 0) {
      warnings.media = 'Ajoutez des images pour rendre votre POI plus attractif';
    }

    if (data.description.length < 100) {
      warnings.description = 'Une description plus détaillée améliorerait la qualité';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
      completionPercentage
    };
  }, [
    context,
    validateBasicFields,
    validateContactFields,
    validateCategorizationFields,
    validateRestaurantFields,
    validateAccommodationFields,
    validateActivityFields
  ]);

  const validateField = useCallback((field: keyof UnifiedPOIFormData, data: UnifiedPOIFormData): string | null => {
    const fullValidation = validateForm(data);
    return fullValidation.errors[field] || null;
  }, [validateForm]);

  return {
    validateForm,
    validateField,
    validateBasicFields,
    validateContactFields,
    validateCategorizationFields,
    validateRestaurantFields,
    validateAccommodationFields,
    validateActivityFields
  };
};