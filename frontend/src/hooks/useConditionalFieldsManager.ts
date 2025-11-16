import { useCallback, useEffect } from 'react';
import { UnifiedPOIFormData } from '@/types/poi-form';

interface ConditionalRule {
  triggerField: keyof UnifiedPOIFormData;
  triggerValue: any;
  affectedFields: (keyof UnifiedPOIFormData)[];
  action: 'show' | 'hide' | 'require' | 'clear';
}

interface ConditionalFieldsHook {
  handleFieldChange: (
    field: keyof UnifiedPOIFormData,
    value: any,
    updateField: (field: keyof UnifiedPOIFormData, value: any) => void,
    updateMultiple: (updates: Partial<UnifiedPOIFormData>) => void
  ) => void;
  isFieldVisible: (field: keyof UnifiedPOIFormData, formData: UnifiedPOIFormData) => boolean;
  isFieldRequired: (field: keyof UnifiedPOIFormData, formData: UnifiedPOIFormData) => boolean;
  getFieldDependencies: (field: keyof UnifiedPOIFormData) => (keyof UnifiedPOIFormData)[];
}

export const useConditionalFieldsManager = (): ConditionalFieldsHook => {
  // Règles de champs conditionnels
  const conditionalRules: ConditionalRule[] = [
    // Restaurant fields
    {
      triggerField: 'is_restaurant',
      triggerValue: true,
      affectedFields: ['cuisine_types', 'dietary_restrictions_supported', 'restaurant_categories', 'culinary_adventure_level_id'],
      action: 'show'
    },
    {
      triggerField: 'is_restaurant',
      triggerValue: false,
      affectedFields: ['cuisine_types', 'dietary_restrictions_supported', 'restaurant_categories', 'culinary_adventure_level_id'],
      action: 'clear'
    },
    
    // Accommodation fields
    {
      triggerField: 'is_accommodation',
      triggerValue: true,
      affectedFields: ['accommodation_types', 'accommodation_amenities', 'accommodation_locations', 'accommodation_accessibility', 'accommodation_security', 'accommodation_ambiance'],
      action: 'show'
    },
    {
      triggerField: 'is_accommodation',
      triggerValue: false,
      affectedFields: ['accommodation_types', 'accommodation_amenities', 'accommodation_locations', 'accommodation_accessibility', 'accommodation_security', 'accommodation_ambiance'],
      action: 'clear'
    },
    
    // Activity fields
    {
      triggerField: 'is_activity',
      triggerValue: true,
      affectedFields: ['activity_categories', 'activity_intensity_level', 'activity_interests', 'activity_avoidances', 'min_age', 'max_age', 'duration_hours', 'max_participants'],
      action: 'show'
    },
    {
      triggerField: 'is_activity',
      triggerValue: false,
      affectedFields: ['activity_categories', 'activity_intensity_level', 'activity_interests', 'activity_avoidances', 'min_age', 'max_age', 'duration_hours', 'max_participants'],
      action: 'clear'
    }
  ];

  const getDefaultValueForField = useCallback((field: keyof UnifiedPOIFormData): any => {
    const fieldType = typeof field;
    
    // Déterminer le type de valeur par défaut basé sur le nom du champ
    if (field.includes('_id') || field === 'validation_score' || field === 'submission_count' || 
        field === 'view_count' || field === 'favorite_count' || field === 'review_count') {
      return field.includes('_id') ? '' : 0;
    }
    
    if (['categories', 'tags', 'cuisine_types', 'dietary_restrictions_supported', 'restaurant_categories',
         'accommodation_types', 'accommodation_amenities', 'accommodation_locations', 'accommodation_accessibility',
         'accommodation_security', 'accommodation_ambiance', 'activity_categories', 'activity_interests',
         'activity_avoidances', 'special_features', 'target_audience', 'media_images', 'media_videos'].includes(field)) {
      return [];
    }
    
    if (['is_restaurant', 'is_accommodation', 'is_activity', 'is_wheelchair_accessible', 
         'has_accessible_parking', 'has_accessible_restrooms', 'has_audio_guide', 
         'has_sign_language_support', 'is_draft'].includes(field)) {
      return false;
    }
    
    if (['min_age', 'max_age', 'duration_hours', 'max_participants'].includes(field)) {
      return null;
    }
    
    return '';
  }, []);

  const handleFieldChange = useCallback((
    field: keyof UnifiedPOIFormData,
    value: any,
    updateField: (field: keyof UnifiedPOIFormData, value: any) => void,
    updateMultiple: (updates: Partial<UnifiedPOIFormData>) => void
  ) => {
    // Mise à jour du champ principal
    updateField(field, value);

    // Vérification des règles conditionnelles
    const applicableRules = conditionalRules.filter(rule => 
      rule.triggerField === field && rule.triggerValue === value
    );

    if (applicableRules.length > 0) {
      const updates: Partial<UnifiedPOIFormData> = {};
      
      applicableRules.forEach(rule => {
        if (rule.action === 'clear') {
        rule.affectedFields.forEach(affectedField => {
            (updates as any)[affectedField] = getDefaultValueForField(affectedField);
          });
        }
      });

      if (Object.keys(updates).length > 0) {
        updateMultiple(updates);
      }
    }
  }, [conditionalRules, getDefaultValueForField]);

  const isFieldVisible = useCallback((
    field: keyof UnifiedPOIFormData,
    formData: UnifiedPOIFormData
  ): boolean => {
    // Restaurant fields visibility
    if (['cuisine_types', 'dietary_restrictions_supported', 'restaurant_categories', 'culinary_adventure_level_id'].includes(field)) {
      return formData.is_restaurant === true;
    }
    
    // Accommodation fields visibility
    if (['accommodation_types', 'accommodation_amenities', 'accommodation_locations', 
         'accommodation_accessibility', 'accommodation_security', 'accommodation_ambiance'].includes(field)) {
      return formData.is_accommodation === true;
    }
    
    // Activity fields visibility
    if (['activity_categories', 'activity_intensity_level', 'activity_interests', 'activity_avoidances',
         'min_age', 'max_age', 'duration_hours', 'max_participants'].includes(field)) {
      return formData.is_activity === true;
    }
    
    return true; // Par défaut, tous les autres champs sont visibles
  }, []);

  const isFieldRequired = useCallback((
    field: keyof UnifiedPOIFormData,
    formData: UnifiedPOIFormData
  ): boolean => {
    // Champs toujours requis
    const alwaysRequired = ['name', 'description', 'address', 'latitude', 'longitude'];
    if (alwaysRequired.includes(field)) return true;
    
    // Champs conditionnellement requis
    if (formData.is_restaurant) {
      if (['cuisine_types', 'culinary_adventure_level_id'].includes(field)) return true;
    }
    
    if (formData.is_accommodation) {
      if (['accommodation_types'].includes(field)) return true;
    }
    
    if (formData.is_activity) {
      if (['activity_categories', 'activity_intensity_level'].includes(field)) return true;
    }
    
    return false;
  }, []);

  const getFieldDependencies = useCallback((field: keyof UnifiedPOIFormData): (keyof UnifiedPOIFormData)[] => {
    const dependencies: (keyof UnifiedPOIFormData)[] = [];
    
    // Trouver les champs qui déclenchent la visibilité de ce champ
    conditionalRules.forEach(rule => {
      if (rule.affectedFields.includes(field)) {
        dependencies.push(rule.triggerField);
      }
    });
    
    return dependencies;
  }, []);

  return {
    handleFieldChange,
    isFieldVisible,
    isFieldRequired,
    getFieldDependencies
  };
};