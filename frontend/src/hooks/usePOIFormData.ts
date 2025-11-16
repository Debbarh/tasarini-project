import { useState, useCallback, useEffect } from 'react';
import { UnifiedPOIFormData, POIFormContext } from '@/types/poi-form';
import { normalizeOpeningHoursForForm } from '@/utils/poiFormNormalization';

const getInitialFormData = (context: POIFormContext): UnifiedPOIFormData => {
  return {
    // Basic Information
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    country: '',
    city: '',
    
    // Contact Information
    contact_phone: '',
    contact_email: '',
    website_url: '',
    opening_hours: '',
    
    // Categorization & Tags
    tags: [],
    categories: [],
    difficulty_level_id: '',
    price_range: '',
    budget_level_id: '',
    
    // Media
    media_images: [],
    media_videos: [],
    
    // Accessibility
    is_wheelchair_accessible: false,
    has_accessible_parking: false,
    has_accessible_restrooms: false,
    has_audio_guide: false,
    has_sign_language_support: false,
    
    // Restaurant/Culinary Fields
    is_restaurant: false,
    cuisine_types: [],
    dietary_restrictions_supported: [],
    restaurant_categories: [],
    culinary_adventure_level_id: '',
    
    // Accommodation Fields
    is_accommodation: false,
    accommodation_types: [],
    accommodation_amenities: [],
    accommodation_locations: [],
    accommodation_accessibility: [],
    accommodation_security: [],
    accommodation_ambiance: [],
    
    // Activity Fields
    is_activity: false,
    activity_categories: [],
    activity_intensity_level: '',
    activity_interests: [],
    activity_avoidances: [],
    min_age: null,
    max_age: null,
    duration_hours: null,
    max_participants: null,
    
    // Management Fields
    status_enum: context.userType === 'partner' ? 'draft' : 'pending_validation',
    is_draft: true,
    amenities: '',
    special_features: [],
    target_audience: [],
    
    // Validation & Quality
    validation_score: 0,
    last_validation_date: null,
    rejection_reason: null,
    
    // Metadata
    submission_count: 0,
    view_count: 0,
    favorite_count: 0,
    review_count: 0,
  };
};

const buildInitialFormData = (
  context: POIFormContext,
  data?: Partial<UnifiedPOIFormData>
): UnifiedPOIFormData => {
  const baseData = getInitialFormData(context);
  if (!data) {
    return baseData;
  }

  const { openingHoursText, openingHoursStructured } = normalizeOpeningHoursForForm(
    data.opening_hours_structured,
    data.opening_hours
  );

  return {
    ...baseData,
    ...data,
    opening_hours: openingHoursText || data.opening_hours || '',
    opening_hours_structured: openingHoursStructured ?? data.opening_hours_structured,
  };
};

export const usePOIFormData = (context: POIFormContext, initialData?: Partial<UnifiedPOIFormData>) => {
  const [formData, setFormData] = useState<UnifiedPOIFormData>(() => buildInitialFormData(context, initialData));

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData(buildInitialFormData(context, initialData));
    }
  }, [initialData, context]);

  const updateField = useCallback(<K extends keyof UnifiedPOIFormData>(
    field: K,
    value: UnifiedPOIFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateMultipleFields = useCallback((updates: Partial<UnifiedPOIFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData(context));
  }, [context]);

  const isDirty = useCallback(() => {
    const initial = getInitialFormData(context);
    return JSON.stringify(formData) !== JSON.stringify(initial);
  }, [formData, context]);

  return {
    formData,
    updateField,
    updateMultipleFields,
    resetForm,
    isDirty,
    setFormData
  };
};
