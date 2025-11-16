import { POIFormContext } from '@/types/poi-form';

export const POI_FORM_CONFIGURATIONS: Record<string, POIFormContext> = {
  // Configuration pour partenaires avancés (remplace POICreationForm.tsx)
  partnerAdvanced: {
    mode: 'create',
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
  },

  // Configuration pour partenaires simplifiée (remplace TouristPointForm.tsx partner)
  partnerSimple: {
    mode: 'create',
    userType: 'partner',
    formComplexity: 'standard',
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
  },

  // Configuration pour utilisateurs (remplace formulaires dans BeInspired/Profile)
  userContribution: {
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
  },

  // Configuration pour admins
  adminComplete: {
    mode: 'create',
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
  },
};

export const getPOIFormConfig = (configName: keyof typeof POI_FORM_CONFIGURATIONS): POIFormContext => {
  return POI_FORM_CONFIGURATIONS[configName];
};