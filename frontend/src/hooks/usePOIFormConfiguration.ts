import { useState, useEffect, useMemo, useCallback } from 'react';
import { POIFormContext, UnifiedPOIFormData, POIFormValidationResult } from '@/types/poi-form';
import { POI_FORM_CONFIGURATIONS } from '@/components/poi/configurations/poi-form-configs';

interface ConfigurationHook {
  context: POIFormContext;
  shouldShowSection: (sectionKey: keyof POIFormContext['showSections']) => boolean;
  isFieldRequired: (fieldKey: keyof UnifiedPOIFormData) => boolean;
  getFieldValidationLevel: () => 'basic' | 'standard' | 'advanced' | 'strict';
  getHelpMessage: (fieldKey: keyof UnifiedPOIFormData) => string | null;
  updateConditionalVisibility: (formData: UnifiedPOIFormData) => POIFormContext;
}

export const usePOIFormConfiguration = (
  configName: keyof typeof POI_FORM_CONFIGURATIONS,
  formData?: UnifiedPOIFormData
): ConfigurationHook => {
  const baseContext = POI_FORM_CONFIGURATIONS[configName];
  const [dynamicContext, setDynamicContext] = useState<POIFormContext>(baseContext);

  // Messages d'aide contextuels selon le niveau d'expertise
  const helpMessages = useMemo(() => ({
    name: {
      partner: "Choisissez un nom accrocheur qui reflète l'essence de votre lieu",
      user: "Donnez un nom simple et mémorable à ce lieu",
      admin: "Nom officiel du point d'intérêt pour validation"
    },
    description: {
      partner: "Décrivez votre lieu de manière engageante pour attirer les visiteurs",
      user: "Décrivez ce qui rend ce lieu spécial selon vous",
      admin: "Description objective et complète pour évaluation"
    },
    categories: {
      partner: "Sélectionnez les catégories qui correspondent le mieux à votre offre",
      user: "Aidez-nous à classer ce lieu dans les bonnes catégories",
      admin: "Classification précise selon la taxonomie officielle"
    }
  }), []);

  // Logique de visibilité conditionnelle
  const updateConditionalVisibility = useCallback((currentFormData: UnifiedPOIFormData): POIFormContext => {
    const updatedContext = { ...dynamicContext };
    
    // Restaurant section visibility
    if (currentFormData.is_restaurant) {
      updatedContext.showSections.restaurant = true;
      updatedContext.requiredFields = [
        ...updatedContext.requiredFields,
        'cuisine_types',
        'culinary_adventure_level_id'
      ].filter((field, index, arr) => arr.indexOf(field) === index);
    } else {
      updatedContext.showSections.restaurant = false;
      updatedContext.requiredFields = updatedContext.requiredFields.filter(
        field => !['cuisine_types', 'culinary_adventure_level_id'].includes(field)
      );
    }

    // Accommodation section visibility
    if (currentFormData.is_accommodation) {
      updatedContext.showSections.accommodation = true;
      updatedContext.requiredFields = [
        ...updatedContext.requiredFields,
        'accommodation_types'
      ].filter((field, index, arr) => arr.indexOf(field) === index);
    } else {
      updatedContext.showSections.accommodation = false;
      updatedContext.requiredFields = updatedContext.requiredFields.filter(
        field => !['accommodation_types'].includes(field)
      );
    }

    // Activity section visibility
    if (currentFormData.is_activity) {
      updatedContext.showSections.activity = true;
      updatedContext.requiredFields = [
        ...updatedContext.requiredFields,
        'activity_categories',
        'activity_intensity_level'
      ].filter((field, index, arr) => arr.indexOf(field) === index);
    } else {
      updatedContext.showSections.activity = false;
      updatedContext.requiredFields = updatedContext.requiredFields.filter(
        field => !['activity_categories', 'activity_intensity_level'].includes(field)
      );
    }

    return updatedContext;
  }, [dynamicContext]);

  // Mise à jour automatique de la visibilité
  useEffect(() => {
    if (formData) {
      const updatedContext = updateConditionalVisibility(formData);
      setDynamicContext(updatedContext);
    }
  }, [formData, updateConditionalVisibility]);

  const shouldShowSection = useCallback((sectionKey: keyof POIFormContext['showSections']): boolean => {
    return dynamicContext.showSections[sectionKey];
  }, [dynamicContext]);

  const isFieldRequired = useCallback((fieldKey: keyof UnifiedPOIFormData): boolean => {
    return dynamicContext.requiredFields.includes(fieldKey as string);
  }, [dynamicContext]);

  const getFieldValidationLevel = useCallback((): 'basic' | 'standard' | 'advanced' | 'strict' => {
    return dynamicContext.validationLevel;
  }, [dynamicContext]);

  const getHelpMessage = useCallback((fieldKey: keyof UnifiedPOIFormData): string | null => {
    const fieldMessages = helpMessages[fieldKey as keyof typeof helpMessages];
    if (!fieldMessages) return null;
    
    return fieldMessages[dynamicContext.userType] || null;
  }, [dynamicContext.userType, helpMessages]);

  return {
    context: dynamicContext,
    shouldShowSection,
    isFieldRequired,
    getFieldValidationLevel,
    getHelpMessage,
    updateConditionalVisibility
  };
};