// Types for the advanced opening hours system

export interface TimeSlot {
  start: string; // Format: "HH:MM" (24h format)
  end: string;   // Format: "HH:MM" (24h format)
}

export type DaySchedule = TimeSlot[] | "closed" | "legacy";

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface SeasonalHours {
  [seasonKey: string]: {
    start_date: string; // ISO date format
    end_date: string;   // ISO date format
    hours: WeeklySchedule;
    name?: string;
  };
}

export interface SpecialDate {
  date: string; // ISO date format
  closed?: boolean;
  hours?: TimeSlot[];
  reason?: string;
}

export interface OpeningHoursData {
  regular_hours: WeeklySchedule;
  seasonal_hours?: SeasonalHours;
  special_dates?: SpecialDate[];
  timezone: string;
  last_updated?: string;
  migrated?: boolean; // Flag for migrated legacy data
  legacy_text?: string; // Original text for migrated data
}

export interface OpeningHoursTemplate {
  id: string;
  name: string;
  description?: string;
  poi_type: string; // 'restaurant' | 'commerce' | 'museum' | 'accommodation' | 'activity' | 'generic'
  hours_data: OpeningHoursData;
  is_system: boolean;
  display_order: number;
}

// Helper types for validation
export interface TimeValidationResult {
  isValid: boolean;
  error?: string;
}

export interface DayValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// UI State types
export interface OpeningHoursViewMode {
  mode: 'compact' | 'edit' | 'preview';
  activeTab: 'regular' | 'seasonal' | 'special';
}

// Days of week helper
export type DayOfWeek = keyof WeeklySchedule;

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday'
];

export const DAY_LABELS_FR: Record<DayOfWeek, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche'
};

export const DAY_LABELS_SHORT_FR: Record<DayOfWeek, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mer',
  thursday: 'Jeu',
  friday: 'Ven',
  saturday: 'Sam',
  sunday: 'Dim'
};