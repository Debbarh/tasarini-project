import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accommodationService,
  AccommodationBooking,
  AccommodationRatePlan,
  AccommodationRateSeason,
  AccommodationRoom,
  MealPlanPricing,
} from "@/services/accommodationService";

export type PromotionRule = {
  id: string;
  name: string;
  type: 'early_booking' | 'last_minute' | 'long_stay' | 'custom';
  discount_percent: number;
  min_nights?: number | null;
  max_nights?: number | null;
  advance_min_days?: number | null;
  advance_max_days?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  active: boolean;
  created_at: string;
};

type RatePlanWithDetails = AccommodationRatePlan & {
  rate_seasons: AccommodationRateSeason[];
  promotion_rules: PromotionRule[];
};

type RoomWithPlans = AccommodationRoom & {
  rate_plans: RatePlanWithDetails[];
};

interface AccommodationPricingResult {
  rooms: RoomWithPlans[];
  bookings: AccommodationBooking[];
}

const parsePromotionRules = (value: unknown): PromotionRule[] => {
  if (!value) return [];

  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch (error) {
      console.warn("Unable to parse promotion strategy", error);
      return [];
    }
  }

  if (typeof raw !== "object" || raw === null) return [];

  const container = Array.isArray(raw)
    ? raw
    : (raw as { promotions?: unknown }).promotions;

  if (!Array.isArray(container)) return [];

  const now = new Date().toISOString();

  return container
    .map((item) => (typeof item === "object" && item !== null ? item : null))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => {
      const safeNumber = (input: unknown): number | null => {
        const numeric = Number(input);
        return Number.isFinite(numeric) ? numeric : null;
      };

      const ensureId = (): string => {
        const rawId = item.id;
        if (typeof rawId === "string" && rawId.trim().length > 0) {
          return rawId;
        }
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
          return crypto.randomUUID();
        }
        return `promo-${Math.random().toString(36).slice(2, 10)}`;
      };

      const type = (() => {
        const rawType = item.type;
        switch (rawType) {
          case "early_booking":
          case "last_minute":
          case "long_stay":
          case "custom":
            return rawType;
          default:
            return "custom" as const;
        }
      })();

      return {
        id: ensureId(),
        name: typeof item.name === "string" ? item.name : "Promotion",
        type,
        discount_percent: safeNumber(item.discount_percent) ?? 0,
        min_nights: safeNumber(item.min_nights),
        max_nights: safeNumber(item.max_nights),
        advance_min_days: safeNumber(item.advance_min_days),
        advance_max_days: safeNumber(item.advance_max_days),
        start_date: typeof item.start_date === "string" ? item.start_date : null,
        end_date: typeof item.end_date === "string" ? item.end_date : null,
        active: Boolean(item.active ?? true),
        created_at: typeof item.created_at === "string" ? item.created_at : now,
      } satisfies PromotionRule;
    });
};

const normalizeMealPlanPricing = (value: unknown): MealPlanPricing | null => {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeMealPlanPricing(parsed);
    } catch (error) {
      console.warn("Unable to parse meal_plan_pricing", error);
      return null;
    }
  }

  if (typeof value !== "object" || value === null) return null;

  const pricing = value as Record<string, unknown>;
  const result: MealPlanPricing = {};

  (Object.keys(pricing) as Array<keyof MealPlanPricing>).forEach((key) => {
    const raw = pricing[key];
    if (raw === null || raw === undefined || raw === "") {
      result[key] = null;
      return;
    }

    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      result[key] = numeric;
    }
  });

  return Object.keys(result).length > 0 ? result : null;
};

const normalizeSeason = (season: AccommodationRateSeason): AccommodationRateSeason => ({
  ...season,
  meal_plan_pricing: normalizeMealPlanPricing(season.meal_plan_pricing) ?? null,
});

const normalizeRoom = (room: AccommodationRoom & {
  rate_plans?: Array<
    AccommodationRatePlan & {
      rate_seasons?: AccommodationRateSeason[] | null;
    }
  > | null;
}): RoomWithPlans => ({
  ...room,
  rate_plans:
    room.rate_plans?.map((plan) => ({
      ...plan,
      rate_seasons: plan.rate_seasons?.map((season) => normalizeSeason(season)) ?? [],
      promotion_rules: parsePromotionRules(plan.pricing_strategy ?? null),
    })) ?? [],
});

const fetchPricing = async (touristPointId: string): Promise<AccommodationPricingResult> => {
  const [rooms, bookings] = await Promise.all([
    accommodationService.getRoomsByTouristPoint(touristPointId),
    accommodationService.getBookingsByTouristPoint(touristPointId),
  ]);

  const roomsWithPlans: RoomWithPlans[] = await Promise.all(
    rooms.map(async (room) => {
      const ratePlans = await accommodationService.getRatePlansByRoom(touristPointId, room.id);
      const plansWithSeasons = await Promise.all(
        ratePlans.map(async (plan) => ({
          ...plan,
          rate_seasons: await accommodationService.getSeasonsByRatePlan(touristPointId, plan.id),
        }))
      );
      return normalizeRoom({ ...room, rate_plans: plansWithSeasons });
    })
  );

  return { rooms: roomsWithPlans, bookings };
};

export const useAccommodationPricing = (touristPointId?: string | null) => {
  const queryClient = useQueryClient();

  const pricingQuery = useQuery({
    queryKey: ["accommodation-pricing", touristPointId],
    queryFn: () => fetchPricing(touristPointId as string),
    enabled: Boolean(touristPointId),
  });

  const ensureTouristPoint = () => {
    if (!touristPointId) {
      throw new Error("Aucun point d'intérêt sélectionné");
    }
    return touristPointId;
  };

  const invalidatePricing = () => {
    if (!touristPointId) return;
    queryClient.invalidateQueries({ queryKey: ["accommodation-pricing", touristPointId] });
  };

  const createRoom = useMutation({
    mutationFn: (payload: Omit<AccommodationRoom, "id" | "tourist_point_id">) =>
      accommodationService.createRoom(ensureTouristPoint(), payload),
    onSuccess: invalidatePricing,
  });

  const updateRoom = useMutation({
    mutationFn: ({ roomId, updates }: { roomId: string; updates: Partial<AccommodationRoom> }) =>
      accommodationService.updateRoom(ensureTouristPoint(), roomId, updates),
    onSuccess: invalidatePricing,
  });

  const deleteRoom = useMutation({
    mutationFn: (roomId: string) => accommodationService.deleteRoom(ensureTouristPoint(), roomId),
    onSuccess: invalidatePricing,
  });

  const createRatePlan = useMutation({
    mutationFn: (
      payload: Omit<AccommodationRatePlan, "id" | "created_at" | "updated_at">
    ) => accommodationService.createRatePlan(ensureTouristPoint(), payload),
    onSuccess: invalidatePricing,
  });

  const updateRatePlan = useMutation({
    mutationFn: ({ planId, updates }: { planId: string; updates: Partial<AccommodationRatePlan> }) =>
      accommodationService.updateRatePlan(ensureTouristPoint(), planId, updates),
    onSuccess: invalidatePricing,
  });

  const duplicateRatePlan = useMutation({
    mutationFn: ({ planId, overrides }: { planId: string; overrides?: Partial<AccommodationRatePlan> }) =>
      accommodationService.duplicateRatePlan(ensureTouristPoint(), planId, overrides),
    onSuccess: invalidatePricing,
  });

  const deleteRatePlan = useMutation({
    mutationFn: (planId: string) => accommodationService.deleteRatePlan(ensureTouristPoint(), planId),
    onSuccess: invalidatePricing,
  });

  const createRateSeason = useMutation({
    mutationFn: (
      payload: Omit<AccommodationRateSeason, "id" | "created_at" | "updated_at">
    ) => accommodationService.createRateSeason(ensureTouristPoint(), payload),
    onSuccess: invalidatePricing,
  });

  const updateRateSeason = useMutation({
    mutationFn: ({ seasonId, updates }: { seasonId: string; updates: Partial<AccommodationRateSeason> }) =>
      accommodationService.updateRateSeason(ensureTouristPoint(), seasonId, updates),
    onSuccess: invalidatePricing,
  });

  const duplicateRateSeason = useMutation({
    mutationFn: ({ seasonId, overrides }: { seasonId: string; overrides?: Partial<AccommodationRateSeason> }) =>
      accommodationService.duplicateRateSeason(ensureTouristPoint(), seasonId, overrides),
    onSuccess: invalidatePricing,
  });

  const deleteRateSeason = useMutation({
    mutationFn: (seasonId: string) => accommodationService.deleteRateSeason(ensureTouristPoint(), seasonId),
    onSuccess: invalidatePricing,
  });

  return {
    pricingQuery,
    rooms: pricingQuery.data?.rooms ?? [],
    bookings: pricingQuery.data?.bookings ?? [],
    isLoading: pricingQuery.isLoading,
    refetch: pricingQuery.refetch,
    createRoom,
    updateRoom,
    deleteRoom,
    createRatePlan,
    updateRatePlan,
    duplicateRatePlan,
    deleteRatePlan,
    createRateSeason,
    updateRateSeason,
    duplicateRateSeason,
    deleteRateSeason,
  };
};

export type { RoomWithPlans, RatePlanWithDetails };
