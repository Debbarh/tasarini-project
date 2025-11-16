// Types pour le formulaire POI unifié
export type POIStatusEnum =
  | 'draft'
  | 'pending_validation'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'blocked';

export interface UnifiedPOIFormData {
  // Basic Information
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  country: string;
  city: string;
  
  // Contact Information
  contact_phone: string;
  contact_email: string;
  website_url: string;
  opening_hours: string;
  opening_hours_structured?: any; // JSON data for structured opening hours
  
  // Categorization & Tags
  tags: string[];
  categories: string[];
  difficulty_level_id: string;
  price_range: string;
  budget_level_id: string;
  
  // Media
  media_images: string[];
  media_videos: string[];
  
  // Accessibility
  is_wheelchair_accessible: boolean;
  has_accessible_parking: boolean;
  has_accessible_restrooms: boolean;
  has_audio_guide: boolean;
  has_sign_language_support: boolean;
  
  // Restaurant/Culinary Fields
  is_restaurant: boolean;
  cuisine_types: string[];
  dietary_restrictions_supported: string[];
  restaurant_categories: string[];
  culinary_adventure_level_id: string;
  
  // Accommodation Fields
  is_accommodation: boolean;
  accommodation_types: string[];
  accommodation_amenities: string[];
  accommodation_locations: string[];
  accommodation_accessibility: string[];
  accommodation_security: string[];
  accommodation_ambiance: string[];
  
  // Activity Fields
  is_activity: boolean;
  activity_categories: string[];
  activity_intensity_level: string;
  activity_interests: string[];
  activity_avoidances: string[];
  min_age: number | null;
  max_age: number | null;
  duration_hours: number | null;
  max_participants: number | null;
  
  // Management Fields
  status_enum: POIStatusEnum;
  is_draft: boolean;
  amenities: string;
  special_features: string[];
  target_audience: string[];
  
  // Validation & Quality
  validation_score: number;
  last_validation_date: string | null;
  rejection_reason: string | null;
  
  // Metadata
  submission_count: number;
  view_count: number;
  favorite_count: number;
  review_count: number;
}

export interface POIFormContext {
  mode: 'create' | 'edit' | 'view';
  userType: 'partner' | 'user' | 'admin';
  formComplexity: 'basic' | 'standard' | 'advanced';
  validationLevel: 'basic' | 'standard' | 'advanced' | 'strict';
  showSections: {
    basicInfo: boolean;
    location: boolean;
    contact: boolean;
    categorization: boolean;
    media: boolean;
    accessibility: boolean;
    restaurant: boolean;
    accommodation: boolean;
    activity: boolean;
    management: boolean;
    validation: boolean;
  };
  requiredFields: string[];
  conditionalFields: Record<string, string[]>; // field -> dependent fields
}

export interface POIFormConfiguration {
  context: POIFormContext;
  initialData?: Partial<UnifiedPOIFormData>;
  onSubmit: (data: UnifiedPOIFormData, isDraft?: boolean) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface POIFormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  completionPercentage: number;
}

export interface POIFormSection {
  id: string;
  title: string;
  required: boolean;
  visible: boolean;
  fields: string[];
  validationRules?: Record<string, any>;
}
