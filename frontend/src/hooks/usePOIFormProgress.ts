import { useMemo, useCallback } from 'react';
import { UnifiedPOIFormData, POIFormContext } from '@/types/poi-form';

interface SectionProgress {
  id: string;
  title: string;
  completed: boolean;
  progress: number;
  requiredFields: string[];
  completedFields: string[];
  missingFields: string[];
}

interface ProgressHook {
  overallProgress: number;
  sectionsProgress: SectionProgress[];
  completedSections: number;
  totalSections: number;
  getNextIncompleteSection: () => string | null;
  isFormComplete: () => boolean;
  getSectionProgress: (sectionKey: string) => SectionProgress | null;
}

export const usePOIFormProgress = (
  formData: UnifiedPOIFormData,
  context: POIFormContext
): ProgressHook => {
  // Définition des sections et leurs champs
  const sectionDefinitions = useMemo(() => ({
    basicInfo: {
      title: 'Informations de base',
      fields: ['name', 'description', 'address'],
      requiredFields: ['name', 'description', 'address']
    },
    location: {
      title: 'Localisation',
      fields: ['latitude', 'longitude', 'country', 'city'],
      requiredFields: ['latitude', 'longitude']
    },
    contact: {
      title: 'Contact',
      fields: ['contact_phone', 'contact_email', 'website_url', 'opening_hours'],
      requiredFields: context.validationLevel === 'strict' ? ['contact_phone', 'contact_email'] : []
    },
    categorization: {
      title: 'Catégorisation',
      fields: ['categories', 'tags', 'difficulty_level_id', 'price_range', 'budget_level_id'],
      requiredFields: context.validationLevel !== 'basic' ? ['categories'] : []
    },
    media: {
      title: 'Médias',
      fields: ['media_images', 'media_videos'],
      requiredFields: context.validationLevel === 'strict' ? ['media_images'] : []
    },
    accessibility: {
      title: 'Accessibilité',
      fields: ['is_wheelchair_accessible', 'has_accessible_parking', 'has_accessible_restrooms', 'has_audio_guide', 'has_sign_language_support'],
      requiredFields: []
    },
    restaurant: {
      title: 'Restaurant',
      fields: ['cuisine_types', 'dietary_restrictions_supported', 'restaurant_categories', 'culinary_adventure_level_id'],
      requiredFields: formData.is_restaurant ? ['cuisine_types', 'culinary_adventure_level_id'] : []
    },
    accommodation: {
      title: 'Hébergement',
      fields: ['accommodation_types', 'accommodation_amenities', 'accommodation_locations', 'accommodation_accessibility', 'accommodation_security', 'accommodation_ambiance'],
      requiredFields: formData.is_accommodation ? ['accommodation_types'] : []
    },
    activity: {
      title: 'Activité',
      fields: ['activity_categories', 'activity_intensity_level', 'activity_interests', 'activity_avoidances', 'min_age', 'max_age', 'duration_hours', 'max_participants'],
      requiredFields: formData.is_activity ? ['activity_categories', 'activity_intensity_level'] : []
    }
  }), [context.validationLevel, formData.is_restaurant, formData.is_accommodation, formData.is_activity]);

  // Vérification si un champ est rempli
  const isFieldCompleted = useCallback((fieldKey: string, value: any): boolean => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return true; // Les booléens sont toujours "complétés"
    if (typeof value === 'number') return value > 0;
    return String(value).trim().length > 0;
  }, []);

  // Calcul du progrès pour chaque section
  const sectionsProgress = useMemo((): SectionProgress[] => {
    const visibleSections = Object.keys(sectionDefinitions).filter(
      sectionKey => context.showSections[sectionKey as keyof typeof context.showSections]
    );

    return visibleSections.map(sectionKey => {
      const section = sectionDefinitions[sectionKey as keyof typeof sectionDefinitions];
      const completedFields = section.fields.filter(field => 
        isFieldCompleted(field, formData[field as keyof UnifiedPOIFormData])
      );
      
      const missingRequiredFields = section.requiredFields.filter(field => 
        !isFieldCompleted(field, formData[field as keyof UnifiedPOIFormData])
      );

      const totalRelevantFields = Math.max(section.requiredFields.length, 1);
      const completedRelevantFields = section.requiredFields.length - missingRequiredFields.length;
      const progress = Math.round((completedRelevantFields / totalRelevantFields) * 100);
      
      return {
        id: sectionKey,
        title: section.title,
        completed: missingRequiredFields.length === 0,
        progress,
        requiredFields: section.requiredFields,
        completedFields: completedFields,
        missingFields: missingRequiredFields
      };
    });
  }, [sectionDefinitions, context.showSections, formData, isFieldCompleted]);

  // Calcul du progrès global
  const overallProgress = useMemo((): number => {
    if (sectionsProgress.length === 0) return 0;
    
    const totalProgress = sectionsProgress.reduce((acc, section) => acc + section.progress, 0);
    return Math.round(totalProgress / sectionsProgress.length);
  }, [sectionsProgress]);

  const completedSections = useMemo(
    () => sectionsProgress.filter(section => section.completed).length,
    [sectionsProgress]
  );

  const totalSections = sectionsProgress.length;

  const getNextIncompleteSection = useCallback((): string | null => {
    const incompleteSection = sectionsProgress.find(section => !section.completed);
    return incompleteSection?.id || null;
  }, [sectionsProgress]);

  const isFormComplete = useCallback((): boolean => {
    return sectionsProgress.every(section => section.completed);
  }, [sectionsProgress]);

  const getSectionProgress = useCallback((sectionKey: string): SectionProgress | null => {
    return sectionsProgress.find(section => section.id === sectionKey) || null;
  }, [sectionsProgress]);

  return {
    overallProgress,
    sectionsProgress,
    completedSections,
    totalSections,
    getNextIncompleteSection,
    isFormComplete,
    getSectionProgress
  };
};