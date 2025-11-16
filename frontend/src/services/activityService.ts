import { apiClient } from '@/integrations/api/client';

const ACTIVITY_SECTION_SLUG = {
  equipment: 'equipment',
  requirements: 'requirements',
  timeSlots: 'time-slots',
  pricing: 'pricing',
  bookings: 'bookings',
} as const;

type ActivitySection = keyof typeof ACTIVITY_SECTION_SLUG;

const activityEndpoint = (touristPointId: string, section: ActivitySection, itemId?: string) => {
  const slug = ACTIVITY_SECTION_SLUG[section];
  const base = `/poi/tourist-points/${touristPointId}/activity/${slug}/`;
  return itemId ? `${base}${itemId}/` : base;
};

export interface ActivityEquipment {
  id: string;
  tourist_point_id?: string;
  name: string;
  type: 'provided' | 'required' | 'optional';
  description?: string;
  is_included_in_price: boolean;
  rental_price?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityRequirement {
  id: string;
  tourist_point_id?: string;
  type:
    | 'age_min'
    | 'age_max'
    | 'weight_min'
    | 'weight_max'
    | 'fitness_level'
    | 'medical_condition'
    | 'experience_required'
    | 'other';
  value: string;
  description?: string;
  is_mandatory: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityTimeSlot {
  id: string;
  tourist_point_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_participants: number;
  is_active: boolean;
  seasonal_start_date?: string;
  seasonal_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityPricing {
  id: string;
  tourist_point_id?: string;
  participant_type: 'adult' | 'child' | 'senior' | 'student' | 'group';
  base_price: number;
  min_age?: number | null;
  max_age?: number | null;
  min_group_size?: number | null;
  max_group_size?: number | null;
  seasonal_multiplier: number;
  weekend_multiplier: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityBooking {
  id: string;
  tourist_point_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string;
  time_slot_id: string;
  start_time: string;
  end_time: string;
  adult_participants: number;
  child_participants: number;
  senior_participants: number;
  total_participants: number;
  total_amount: number;
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  equipment_rentals?: string[];
  participant_details?: Array<Record<string, unknown>>;
  created_at?: string;
  updated_at?: string;
}

const listSection = <T>(touristPointId: string, section: ActivitySection) =>
  apiClient.get<T[]>(activityEndpoint(touristPointId, section));

const createSection = <T>(
  touristPointId: string,
  section: ActivitySection,
  payload: Omit<T, 'id'>
) => apiClient.post<T>(activityEndpoint(touristPointId, section), payload);

const updateSection = <T>(
  touristPointId: string,
  section: ActivitySection,
  id: string,
  payload: Partial<T>
) => apiClient.patch<T>(activityEndpoint(touristPointId, section, id), payload);

const deleteSection = (touristPointId: string, section: ActivitySection, id: string) =>
  apiClient.delete<void>(activityEndpoint(touristPointId, section, id));

// Equipment
export const getActivityEquipment = (touristPointId: string) =>
  listSection<ActivityEquipment>(touristPointId, 'equipment');

export const createActivityEquipment = (
  touristPointId: string,
  equipment: Omit<ActivityEquipment, 'id'>
) => createSection<ActivityEquipment>(touristPointId, 'equipment', equipment);

export const updateActivityEquipment = (
  touristPointId: string,
  equipmentId: string,
  updates: Partial<ActivityEquipment>
) => updateSection<ActivityEquipment>(touristPointId, 'equipment', equipmentId, updates);

export const deleteActivityEquipment = (touristPointId: string, equipmentId: string) =>
  deleteSection(touristPointId, 'equipment', equipmentId);

// Requirements
export const getActivityRequirements = (touristPointId: string) =>
  listSection<ActivityRequirement>(touristPointId, 'requirements');

export const createActivityRequirement = (
  touristPointId: string,
  requirement: Omit<ActivityRequirement, 'id'>
) => createSection<ActivityRequirement>(touristPointId, 'requirements', requirement);

export const updateActivityRequirement = (
  touristPointId: string,
  requirementId: string,
  updates: Partial<ActivityRequirement>
) => updateSection<ActivityRequirement>(touristPointId, 'requirements', requirementId, updates);

export const deleteActivityRequirement = (touristPointId: string, requirementId: string) =>
  deleteSection(touristPointId, 'requirements', requirementId);

// Time slots
export const getActivityTimeSlots = (touristPointId: string) =>
  listSection<ActivityTimeSlot>(touristPointId, 'timeSlots');

export const createActivityTimeSlot = (
  touristPointId: string,
  timeSlot: Omit<ActivityTimeSlot, 'id'>
) => createSection<ActivityTimeSlot>(touristPointId, 'timeSlots', timeSlot);

export const updateActivityTimeSlot = (
  touristPointId: string,
  timeSlotId: string,
  updates: Partial<ActivityTimeSlot>
) => updateSection<ActivityTimeSlot>(touristPointId, 'timeSlots', timeSlotId, updates);

export const deleteActivityTimeSlot = (touristPointId: string, timeSlotId: string) =>
  deleteSection(touristPointId, 'timeSlots', timeSlotId);

// Pricing
export const getActivityPricing = (touristPointId: string) =>
  listSection<ActivityPricing>(touristPointId, 'pricing');

export const createActivityPricing = (
  touristPointId: string,
  pricing: Omit<ActivityPricing, 'id'>
) => createSection<ActivityPricing>(touristPointId, 'pricing', pricing);

export const updateActivityPricing = (
  touristPointId: string,
  pricingId: string,
  updates: Partial<ActivityPricing>
) => updateSection<ActivityPricing>(touristPointId, 'pricing', pricingId, updates);

export const deleteActivityPricing = (touristPointId: string, pricingId: string) =>
  deleteSection(touristPointId, 'pricing', pricingId);

// Bookings
export const getActivityBookings = (touristPointId: string) =>
  listSection<ActivityBooking>(touristPointId, 'bookings');

export const createActivityBooking = (
  touristPointId: string,
  booking: Omit<ActivityBooking, 'id'>
) => createSection<ActivityBooking>(touristPointId, 'bookings', booking);

export const updateActivityBooking = (
  touristPointId: string,
  bookingId: string,
  updates: Partial<ActivityBooking>
) => updateSection<ActivityBooking>(touristPointId, 'bookings', bookingId, updates);

// Helpers
export const getAvailableTimeSlots = async (touristPointId: string, date: string) => {
  const dayOfWeek = new Date(date).getDay();
  const slots = await getActivityTimeSlots(touristPointId);
  return slots.filter((slot) => slot.day_of_week === dayOfWeek && slot.is_active);
};

export const calculateBookingPrice = async (
  touristPointId: string,
  adults: number,
  children: number,
  seniors: number,
  date: string,
  equipmentRentals: string[] = []
) => {
  const [pricing, equipment] = await Promise.all([
    getActivityPricing(touristPointId),
    getActivityEquipment(touristPointId),
  ]);

  const isWeekend = [0, 6].includes(new Date(date).getDay());
  let total = 0;

  const adultPrice = pricing.find((p) => p.participant_type === 'adult')?.base_price ?? 0;
  const childPrice = pricing.find((p) => p.participant_type === 'child')?.base_price ?? 0;
  const seniorPrice = pricing.find((p) => p.participant_type === 'senior')?.base_price ?? 0;

  total += adults * adultPrice;
  total += children * childPrice;
  total += seniors * seniorPrice;

  if (isWeekend) {
    const weekendMultiplier = pricing[0]?.weekend_multiplier ?? 1;
    total *= weekendMultiplier;
  }

  equipmentRentals.forEach((equipmentId) => {
    const equipmentItem = equipment.find((item) => item.id === equipmentId);
    if (equipmentItem?.rental_price) {
      total += equipmentItem.rental_price;
    }
  });

  return total;
};

export const validateBookingRequirements = async (
  touristPointId: string,
  participants: { age: number; experience?: string; medicalConditions?: string[] }[]
) => {
  const requirements = await getActivityRequirements(touristPointId);
  const violations: string[] = [];

  requirements.forEach((req) => {
    if (!req.is_mandatory) {
      return;
    }

    switch (req.type) {
      case 'age_min': {
        const minAge = Number.parseInt(req.value, 10);
        if (participants.some((p) => p.age < minAge)) {
          violations.push(`Âge minimum requis: ${minAge} ans`);
        }
        break;
      }
      case 'age_max': {
        const maxAge = Number.parseInt(req.value, 10);
        if (participants.some((p) => p.age > maxAge)) {
          violations.push(`Âge maximum autorisé: ${maxAge} ans`);
        }
        break;
      }
      case 'experience_required': {
        if (participants.some((p) => !p.experience || !p.experience.includes(req.value))) {
          violations.push(`Expérience requise: ${req.value}`);
        }
        break;
      }
      default:
        break;
    }
  });

  return {
    valid: violations.length === 0,
    violations,
  };
};
