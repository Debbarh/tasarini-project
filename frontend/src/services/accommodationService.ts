import { apiClient } from '@/integrations/api/client';

export type MealPlanType = 'bb' | 'half_board' | 'full_board' | 'all_inclusive';

type SearchParams = Record<string, string | number | boolean | undefined>;

const ACCOMMODATION_SECTION_SLUG = {
  rooms: 'rooms',
  bookings: 'bookings',
  availability: 'availability',
  ratePlans: 'rate-plans',
  rateSeasons: 'rate-seasons',
  legacyRates: 'legacy-rates',
} as const;

type AccommodationSection = keyof typeof ACCOMMODATION_SECTION_SLUG;

const accommodationEndpoint = (touristPointId: string, section: AccommodationSection, itemId?: string) => {
  const slug = ACCOMMODATION_SECTION_SLUG[section];
  const base = `/poi/tourist-points/${touristPointId}/accommodation/${slug}/`;
  return itemId ? `${base}${itemId}/` : base;
};

const listSection = <T>(
  touristPointId: string,
  section: AccommodationSection,
  searchParams?: SearchParams
) => apiClient.get<T[]>(accommodationEndpoint(touristPointId, section), searchParams);

const createSection = <T>(
  touristPointId: string,
  section: AccommodationSection,
  payload: Record<string, unknown>
) => apiClient.post<T>(accommodationEndpoint(touristPointId, section), payload);

const updateSection = <T>(
  touristPointId: string,
  section: AccommodationSection,
  id: string,
  payload: Record<string, unknown>
) => apiClient.patch<T>(accommodationEndpoint(touristPointId, section, id), payload);

const deleteSection = (
  touristPointId: string,
  section: AccommodationSection,
  id: string
) => apiClient.delete<void>(accommodationEndpoint(touristPointId, section, id));

export interface AccommodationRoom {
  id: string;
  tourist_point_id: string;
  room_name: string;
  room_type: string;
  capacity: number;
  base_price_per_night: number;
  amenities: string[];
  description?: string;
  images: string[];
  is_available: boolean;
  inventory_total: number;
  created_at?: string;
  updated_at?: string;
}

export interface AccommodationBooking {
  id: string;
  tourist_point_id: string;
  room_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  total_nights: number;
  total_amount: number;
  booking_status: string;
  special_requests?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccommodationAvailability {
  id: string;
  room_id: string;
  date: string;
  is_available: boolean;
  special_price?: number | null;
  minimum_stay?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface MealPlanPricing {
  bb?: number | null;
  half_board?: number | null;
  full_board?: number | null;
  all_inclusive?: number | null;
}

export interface AccommodationRatePlan {
  id: string;
  tourist_point_id: string;
  room_id: string;
  name: string;
  description?: string | null;
  base_meal_plan: MealPlanType;
  pricing_strategy?: string | null;
  currency: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface AccommodationRateSeason {
  id: string;
  rate_plan_id: string;
  season_name: string;
  start_date: string;
  end_date: string;
  base_price: number;
  currency: string;
  meal_plan_pricing?: MealPlanPricing | null;
  minimum_stay?: number | null;
  maximum_stay?: number | null;
  closed_to_arrival?: boolean | null;
  closed_to_departure?: boolean | null;
  advance_purchase_days?: number | null;
  cutoff_hours?: number | null;
  restrictions?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

const clampMealPlanPricing = (pricing?: MealPlanPricing | null) => {
  if (!pricing) return null;
  const entries = Object.entries(pricing).reduce<Record<string, number>>((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      acc[key] = numeric;
    }
    return acc;
  }, {});
  return Object.keys(entries).length > 0 ? entries : null;
};

const isoDateRange = (start: string, end: string) => {
  const dates: string[] = [];
  const cursor = new Date(start);
  const endDate = new Date(end);
  while (cursor < endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

class AccommodationService {
  async createRoom(
    touristPointId: string,
    room: Omit<AccommodationRoom, 'id' | 'tourist_point_id'>
  ): Promise<AccommodationRoom> {
    return createSection<AccommodationRoom>(touristPointId, 'rooms', {
      ...room,
      tourist_point_id: touristPointId,
    });
  }

  async getRoomsByTouristPoint(touristPointId: string): Promise<AccommodationRoom[]> {
    return listSection<AccommodationRoom>(touristPointId, 'rooms');
  }

  async updateRoom(
    touristPointId: string,
    roomId: string,
    updates: Partial<AccommodationRoom>
  ): Promise<AccommodationRoom> {
    return updateSection<AccommodationRoom>(touristPointId, 'rooms', roomId, updates);
  }

  async deleteRoom(touristPointId: string, roomId: string): Promise<void> {
    await deleteSection(touristPointId, 'rooms', roomId);
  }

  async createBooking(
    touristPointId: string,
    booking: Omit<AccommodationBooking, 'id' | 'tourist_point_id' | 'created_at' | 'updated_at'>
  ): Promise<AccommodationBooking> {
    return createSection<AccommodationBooking>(touristPointId, 'bookings', {
      ...booking,
      tourist_point_id: touristPointId,
    });
  }

  async getBookingsByTouristPoint(touristPointId: string): Promise<AccommodationBooking[]> {
    return listSection<AccommodationBooking>(touristPointId, 'bookings');
  }

  async updateBookingStatus(
    touristPointId: string,
    bookingId: string,
    status: string
  ): Promise<AccommodationBooking> {
    return updateSection<AccommodationBooking>(touristPointId, 'bookings', bookingId, {
      booking_status: status,
    });
  }

  async setRoomAvailability(
    touristPointId: string,
    roomId: string,
    date: string,
    isAvailable: boolean,
    specialPrice?: number
  ): Promise<AccommodationAvailability> {
    const existing = await listSection<AccommodationAvailability>(touristPointId, 'availability', {
      room_id: roomId,
      date,
    });

    const payload = {
      room_id: roomId,
      date,
      is_available: isAvailable,
      special_price: specialPrice ?? null,
    };

    if (existing.length > 0) {
      return updateSection<AccommodationAvailability>(
        touristPointId,
        'availability',
        existing[0].id,
        payload
      );
    }

    return createSection<AccommodationAvailability>(touristPointId, 'availability', payload);
  }

  async getRoomAvailability(
    touristPointId: string,
    roomId: string,
    startDate: string,
    endDate: string
  ): Promise<AccommodationAvailability[]> {
    return listSection<AccommodationAvailability>(touristPointId, 'availability', {
      room_id: roomId,
      start_date: startDate,
      end_date: endDate,
    });
  }

  async getRatePlansByRoom(touristPointId: string, roomId?: string): Promise<AccommodationRatePlan[]> {
    const params = roomId ? { room_id: roomId } : undefined;
    return listSection<AccommodationRatePlan>(touristPointId, 'ratePlans', params);
  }

  async createRatePlan(
    touristPointId: string,
    plan: Omit<AccommodationRatePlan, 'id' | 'tourist_point_id' | 'created_at' | 'updated_at'>
  ): Promise<AccommodationRatePlan> {
    return createSection<AccommodationRatePlan>(touristPointId, 'ratePlans', {
      ...plan,
      tourist_point_id: touristPointId,
    });
  }

  async updateRatePlan(
    touristPointId: string,
    planId: string,
    updates: Partial<AccommodationRatePlan>
  ): Promise<AccommodationRatePlan> {
    return updateSection<AccommodationRatePlan>(touristPointId, 'ratePlans', planId, updates);
  }

  async deleteRatePlan(touristPointId: string, planId: string): Promise<void> {
    await deleteSection(touristPointId, 'ratePlans', planId);
  }

  async duplicateRatePlan(
    touristPointId: string,
    planId: string,
    overrides?: Partial<AccommodationRatePlan>
  ): Promise<{ plan: AccommodationRatePlan; seasons: AccommodationRateSeason[] }> {
    const plans = await this.getRatePlansByRoom(touristPointId);
    const original = plans.find((plan) => plan.id === planId);
    if (!original) {
      throw new Error('Plan tarifaire introuvable');
    }

    const seasons = await this.getSeasonsByRatePlan(touristPointId, planId);

    const duplicatedPlan = await this.createRatePlan(touristPointId, {
      room_id: original.room_id,
      name: overrides?.name ?? `${original.name} (copie)`,
      description: overrides?.description ?? original.description ?? null,
      base_meal_plan: overrides?.base_meal_plan ?? original.base_meal_plan,
      pricing_strategy: overrides?.pricing_strategy ?? original.pricing_strategy ?? null,
      currency: overrides?.currency ?? original.currency,
      is_active: overrides?.is_active ?? original.is_active,
      display_order: overrides?.display_order ?? original.display_order + 1,
    });

    const createdSeasons: AccommodationRateSeason[] = [];
    for (const season of seasons) {
      const payload = {
        rate_plan_id: duplicatedPlan.id,
        season_name: season.season_name,
        start_date: season.start_date,
        end_date: season.end_date,
        base_price: season.base_price,
        currency: season.currency,
        meal_plan_pricing: clampMealPlanPricing(season.meal_plan_pricing) ?? null,
        minimum_stay: season.minimum_stay ?? null,
        maximum_stay: season.maximum_stay ?? null,
        closed_to_arrival: season.closed_to_arrival ?? null,
        closed_to_departure: season.closed_to_departure ?? null,
        advance_purchase_days: season.advance_purchase_days ?? null,
        cutoff_hours: season.cutoff_hours ?? null,
        restrictions: season.restrictions ?? null,
      };
      const created = await this.createRateSeason(touristPointId, payload);
      createdSeasons.push(created);
    }

    return { plan: duplicatedPlan, seasons: createdSeasons };
  }

  async createRateSeason(
    touristPointId: string,
    season: Omit<AccommodationRateSeason, 'id' | 'created_at' | 'updated_at'>
  ): Promise<AccommodationRateSeason> {
    const payload = {
      ...season,
      meal_plan_pricing: clampMealPlanPricing(season.meal_plan_pricing),
    };
    return createSection<AccommodationRateSeason>(touristPointId, 'rateSeasons', payload);
  }

  async updateRateSeason(
    touristPointId: string,
    seasonId: string,
    updates: Partial<AccommodationRateSeason>
  ): Promise<AccommodationRateSeason> {
    const payload = {
      ...updates,
      meal_plan_pricing: clampMealPlanPricing(updates.meal_plan_pricing),
    };
    return updateSection<AccommodationRateSeason>(touristPointId, 'rateSeasons', seasonId, payload);
  }

  async getSeasonsByRatePlan(
    touristPointId: string,
    ratePlanId: string
  ): Promise<AccommodationRateSeason[]> {
    return listSection<AccommodationRateSeason>(touristPointId, 'rateSeasons', {
      rate_plan_id: ratePlanId,
    });
  }

  async deleteRateSeason(touristPointId: string, seasonId: string): Promise<void> {
    await deleteSection(touristPointId, 'rateSeasons', seasonId);
  }

  async duplicateRateSeason(
    touristPointId: string,
    seasonId: string,
    overrides?: Partial<AccommodationRateSeason>
  ): Promise<AccommodationRateSeason> {
    const allSeasons = await listSection<AccommodationRateSeason>(touristPointId, 'rateSeasons');
    const original = allSeasons.find((season) => season.id === seasonId);

    if (!original) {
      throw new Error('Saison introuvable');
    }

    const payload = {
      rate_plan_id: overrides?.rate_plan_id ?? original.rate_plan_id,
      season_name: overrides?.season_name ?? `${original.season_name} (copie)`,
      start_date: overrides?.start_date ?? original.start_date,
      end_date: overrides?.end_date ?? original.end_date,
      base_price: overrides?.base_price ?? original.base_price,
      currency: overrides?.currency ?? original.currency,
      meal_plan_pricing: clampMealPlanPricing(overrides?.meal_plan_pricing ?? original.meal_plan_pricing) ?? null,
      minimum_stay: overrides?.minimum_stay ?? original.minimum_stay ?? null,
      maximum_stay: overrides?.maximum_stay ?? original.maximum_stay ?? null,
      closed_to_arrival: overrides?.closed_to_arrival ?? original.closed_to_arrival ?? null,
      closed_to_departure: overrides?.closed_to_departure ?? original.closed_to_departure ?? null,
      advance_purchase_days: overrides?.advance_purchase_days ?? original.advance_purchase_days ?? null,
      cutoff_hours: overrides?.cutoff_hours ?? original.cutoff_hours ?? null,
      restrictions: overrides?.restrictions ?? original.restrictions ?? null,
    };

    return this.createRateSeason(touristPointId, payload);
  }

  async checkAvailability(
    touristPointId: string,
    roomId: string,
    checkInDate: string,
    checkOutDate: string
  ): Promise<boolean> {
    const bookings = await this.getBookingsByTouristPoint(touristPointId);
    const overlappingBooking = bookings.some((booking) => {
      if (booking.room_id !== roomId) return false;
      if (!['pending', 'confirmed'].includes(booking.booking_status)) return false;
      return !(booking.check_out_date <= checkInDate || booking.check_in_date >= checkOutDate);
    });

    if (overlappingBooking) {
      return false;
    }

    const availability = await this.getRoomAvailability(touristPointId, roomId, checkInDate, checkOutDate);
    return !availability.some((slot) => slot.is_available === false);
  }

  async calculateTotalPrice(
    touristPointId: string,
    roomId: string,
    checkInDate: string,
    checkOutDate: string
  ): Promise<number> {
    const nights = isoDateRange(checkInDate, checkOutDate);
    if (nights.length === 0) {
      return 0;
    }

    const rooms = await this.getRoomsByTouristPoint(touristPointId);
    const room = rooms.find((item) => item.id === roomId);
    const basePrice = room?.base_price_per_night ?? 0;

    const ratePlans = await this.getRatePlansByRoom(touristPointId, roomId);
    const activePlan = ratePlans.find((plan) => plan.is_active) ?? ratePlans[0];
    const seasons = activePlan ? await this.getSeasonsByRatePlan(touristPointId, activePlan.id) : [];

    return nights.reduce((total, date) => {
      const season = seasons.find((entry) => entry.start_date <= date && entry.end_date >= date);
      return total + (season?.base_price ?? basePrice);
    }, 0);
  }
}

export const accommodationService = new AccommodationService();
