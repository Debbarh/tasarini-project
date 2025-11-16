import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Users,
  Coins,
  Calendar as CalendarIcon,
  Bed,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import type {
  AccommodationRoom,
  AccommodationBooking,
  AccommodationRatePlan,
  AccommodationRateSeason,
  MealPlanPricing,
  MealPlanType,
} from "@/services/accommodationService";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useAccommodationPricing, RoomWithPlans, RatePlanWithDetails, PromotionRule } from "@/hooks/useAccommodationPricing";
import { useCurrencySettings, type CurrencySettingsHook } from "@/hooks/useCurrencySettings";
import OverviewTab from "./tabs/OverviewTab";

type AccommodationManagementTab = 'overview' | 'rates' | 'bookings' | 'calendar' | 'restrictions' | 'promotions';

interface AccommodationManagementProps {
  touristPointId: string;
  poiName?: string;
}

const OPTIONAL_MEAL_PLANS: Array<{ value: MealPlanType; label: string; description: string }> = [
  { value: 'half_board', label: 'Demi-pension (HB)', description: 'Petit-déjeuner et dîner inclus' },
  { value: 'full_board', label: 'Pension complète (FB)', description: 'Petit-déjeuner, déjeuner et dîner inclus' },
  { value: 'all_inclusive', label: 'All Inclusive (AI)', description: 'Repas et boissons à volonté' },
];

const MEAL_PLAN_LABELS: Record<MealPlanType, string> = {
  bb: 'Bed & Breakfast',
  half_board: 'Demi-pension',
  full_board: 'Pension complète',
  all_inclusive: 'Tout compris',
};

const buildInitialSeasonForm = (basePrice = 0) => ({
  season_name: '',
  start_date: new Date(),
  end_date: addDays(new Date(), 7),
  base_price: basePrice,
  minimum_stay: 1,
  meal_plan_pricing: {
    half_board: null,
    full_board: null,
    all_inclusive: null,
  } satisfies MealPlanPricing,
});

const composeMealPlanPricing = (basePrice: number, extras: MealPlanPricing): MealPlanPricing => {
  const payload: MealPlanPricing = {
    bb: basePrice,
  };

  OPTIONAL_MEAL_PLANS.forEach(({ value }) => {
    const price = extras[value];
    if (typeof price === 'number' && !Number.isNaN(price)) {
      payload[value] = price;
    }
  });

  return payload;
};

const normalizeOptionalMealPlans = (pricing?: MealPlanPricing | null): MealPlanPricing => ({
  half_board: pricing?.half_board ?? null,
  full_board: pricing?.full_board ?? null,
  all_inclusive: pricing?.all_inclusive ?? null,
});

type DayBaseStatus = 'open' | 'booked' | 'missing_plan';

interface CalendarSeasonInterval {
  start: Date;
  end: Date;
  price: number;
  seasonName: string | null;
  planName: string;
  currency?: string | null;
}

interface CalendarDayInfo {
  date: Date;
  status: DayBaseStatus;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  season?: CalendarSeasonInterval;
  hasBooking: boolean;
}

type ConvertAmountFn = CurrencySettingsHook['convertAmount'];
type FormatCurrencyFn = CurrencySettingsHook['formatCurrency'];

interface RoomAvailabilityCalendarProps {
  room: RoomWithPlans;
  bookings: AccommodationBooking[];
  displayCurrency: string;
  convertAmount: ConvertAmountFn;
  formatDisplayCurrency: FormatCurrencyFn;
}

type BulkSeasonForm = {
  range: DateRange;
  planIds: string[];
  seasonName: string;
  basePrice: number;
  currency: string;
  minimumStay: number;
  overwriteExisting: boolean;
  mealPlanPricing: MealPlanPricing;
};

const createBulkFormDefaults = (basePrice: number, currency = 'EUR'): BulkSeasonForm => ({
  range: { from: undefined, to: undefined },
  planIds: [],
  seasonName: '',
  basePrice,
  currency,
  minimumStay: 1,
  overwriteExisting: false,
  mealPlanPricing: {
    half_board: null,
    full_board: null,
    all_inclusive: null,
  },
});

type PromotionFormState = {
  name: string;
  type: PromotionRule['type'];
  discountPercent: number;
  minNights: number | null;
  advanceMinDays: number | null;
  advanceMaxDays: number | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
};

const buildPromotionForm = (promotion?: PromotionRule | null): PromotionFormState => ({
  name: promotion?.name ?? '',
  type: promotion?.type ?? 'early_booking',
  discountPercent: promotion?.discount_percent ?? 10,
  minNights: promotion?.min_nights ?? null,
  advanceMinDays: promotion?.advance_min_days ?? null,
  advanceMaxDays: promotion?.advance_max_days ?? null,
  startDate: promotion?.start_date ?? null,
  endDate: promotion?.end_date ?? null,
  active: promotion?.active ?? true,
});

const generatePromotionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `promo-${Math.random().toString(36).slice(2, 10)}`;
};

const PROMOTION_TYPE_LABELS: Record<PromotionRule['type'], string> = {
  early_booking: 'Réservation anticipée',
  last_minute: 'Dernière minute',
  long_stay: 'Long séjour',
  custom: 'Personnalisée',
};

type SeasonRestrictionsForm = {
  minimumStay: number;
  maximumStay: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  advancePurchaseDays: number | null;
  cutoffHours: number | null;
};

const buildRestrictionsForm = (season?: AccommodationRateSeason | null): SeasonRestrictionsForm => ({
  minimumStay: season?.minimum_stay ?? 1,
  maximumStay: season?.maximum_stay ?? null,
  closedToArrival: Boolean(season?.closed_to_arrival ?? false),
  closedToDeparture: Boolean(season?.closed_to_departure ?? false),
  advancePurchaseDays: season?.advance_purchase_days ?? null,
  cutoffHours: season?.cutoff_hours ?? null,
});

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function RoomAvailabilityCalendar({
  room,
  bookings,
  displayCurrency,
  convertAmount,
  formatDisplayCurrency,
}: RoomAvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const today = startOfDay(new Date());
  const todayTs = today.getTime();

  const seasons = useMemo<CalendarSeasonInterval[]>(() => {
    const intervals: CalendarSeasonInterval[] = [];
    room.rate_plans
      .filter((plan) => plan.is_active !== false)
      .forEach((plan) => {
        (plan.rate_seasons ?? []).forEach((season) => {
          const start = startOfDay(new Date(season.start_date));
          const end = endOfDay(new Date(season.end_date));
          intervals.push({
            start,
            end,
            price: Number(season.base_price) || 0,
            seasonName: season.season_name,
            planName: plan.name,
            currency: plan.currency,
          });
        });
      });
    return intervals;
  }, [room.rate_plans]);

  const bookingIntervals = useMemo(() => {
    return bookings
      .filter(
        (booking) =>
          booking.room_id === room.id &&
          (booking.booking_status === 'confirmed' || booking.booking_status === 'pending')
      )
      .map((booking) => ({
        start: startOfDay(new Date(booking.check_in_date)).getTime(),
        end: startOfDay(new Date(booking.check_out_date)).getTime(),
      }));
  }, [bookings, room.id]);

  const calendarDays = useMemo<CalendarDayInfo[]>(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end }).map((date) => {
      const dayStartDate = startOfDay(date);
      const dayStartTs = dayStartDate.getTime();
      const season = seasons.find((interval) =>
        isWithinInterval(dayStartDate, { start: interval.start, end: interval.end })
      );
      const hasBooking = bookingIntervals.some(
        (interval) => dayStartTs >= interval.start && dayStartTs < interval.end
      );
      const status: DayBaseStatus = season ? (hasBooking ? 'booked' : 'open') : 'missing_plan';
      return {
        date,
        status,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isPast: dayStartTs < todayTs,
        isToday: dayStartTs === todayTs,
        season,
        hasBooking,
      } satisfies CalendarDayInfo;
    });
  }, [bookingIntervals, currentMonth, seasons, todayTs]);

  const weeks = useMemo(() => {
    const chunked: CalendarDayInfo[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      chunked.push(calendarDays.slice(i, i + 7));
    }
    return chunked;
  }, [calendarDays]);

  const monthLabel = useMemo(() => {
    const label = format(currentMonth, 'MMMM yyyy', { locale: fr });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [currentMonth]);

  const baseStatusClasses: Record<DayBaseStatus, string> = {
    open:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100',
    booked:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100',
    missing_plan:
      'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100',
  };

  const legendColors: Record<DayBaseStatus, string> = {
    open: 'bg-emerald-500 dark:bg-emerald-400',
    booked: 'bg-amber-500 dark:bg-amber-400',
    missing_plan: 'bg-rose-500 dark:bg-rose-400',
  };

  const renderPrice = (amount: number, currency?: string | null) => {
    if (!Number.isFinite(amount)) return '—';
    const origin = currency && currency.trim().length ? currency : 'EUR';
    const originalLabel = formatDisplayCurrency(amount, origin);
    if (origin === displayCurrency) {
      return originalLabel;
    }
    const converted = convertAmount(amount, origin, displayCurrency);
    if (!Number.isFinite(converted)) {
      return originalLabel;
    }
    return `${formatDisplayCurrency(converted, displayCurrency)} · ${originalLabel}`;
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b bg-muted/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Calendrier d'occupation</CardTitle>
            <CardDescription>
              Suivez l'ouverture des dates, les réservations et les plans tarifaires actifs.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center text-sm font-medium capitalize">{monthLabel}</div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-y-auto px-6 py-4">
          {!room.rate_plans.length && (
            <div className="mb-4 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              Créez un plan tarifaire pour ouvrir vos dates à la réservation.
            </div>
          )}

          <div className="grid grid-cols-7 gap-2 text-xs font-medium uppercase text-muted-foreground">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {weeks.map((week, weekIndex) => (
              <React.Fragment key={weekIndex}>
                {week.map((dayInfo) => {
                  const { date, status, season, isPast, isToday, isCurrentMonth } = dayInfo;
                  const cellClass = cn(
                    'flex min-h-[120px] flex-col rounded-lg border p-3 text-xs transition',
                    baseStatusClasses[status],
                    !isCurrentMonth && 'opacity-60',
                    isPast && 'opacity-70',
                    isToday && 'ring-2 ring-primary'
                  );

                  const seasonLabel = season?.seasonName || season?.planName;

                  return (
                    <div key={date.toISOString()} className={cellClass}>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{format(date, 'd')}</span>
                        {isToday && (
                          <span className="text-[10px] font-medium uppercase text-primary">Aujourd'hui</span>
                        )}
                      </div>
                      <div className="mt-1 text-xs font-medium text-muted-foreground">
                        {seasonLabel ?? 'Aucun plan actif'}
                      </div>
                      {status === 'booked' ? (
                        <span className="mt-auto text-xs font-semibold">Réservé</span>
                      ) : season ? (
                        <span className="mt-auto text-sm font-semibold">
                          {renderPrice(season.price, season.currency)}
                        </span>
                      ) : (
                        <span className="mt-auto text-xs font-semibold">Configurer un tarif</span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {(
              [
                { status: 'open' as DayBaseStatus, label: 'Ouvert' },
                { status: 'booked' as DayBaseStatus, label: 'Réservé' },
                { status: 'missing_plan' as DayBaseStatus, label: 'Plan manquant' },
              ]
            ).map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <span className={cn('h-3 w-3 rounded-sm', legendColors[item.status])} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const AccommodationManagement = ({ touristPointId, poiName }: AccommodationManagementProps) => {
  const {
    pricingQuery,
    rooms,
    bookings,
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
  } = useAccommodationPricing(touristPointId);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AccommodationManagementTab>('rates');
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isRatePlanDialogOpen, setIsRatePlanDialogOpen] = useState(false);
  const [isSeasonDialogOpen, setIsSeasonDialogOpen] = useState(false);
  const [roomDialogMode, setRoomDialogMode] = useState<'create' | 'edit'>('create');
  const [ratePlanDialogMode, setRatePlanDialogMode] = useState<'create' | 'edit'>('create');
  const [seasonDialogMode, setSeasonDialogMode] = useState<'create' | 'edit'>('create');
  const [editingRatePlan, setEditingRatePlan] = useState<AccommodationRatePlan | null>(null);
  const [editingSeason, setEditingSeason] = useState<AccommodationRateSeason | null>(null);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkSeasonForm>(() => createBulkFormDefaults(0, 'EUR'));
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [promotionDialogMode, setPromotionDialogMode] = useState<'create' | 'edit'>('create');
  const [promotionPlan, setPromotionPlan] = useState<RatePlanWithDetails | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRule | null>(null);
  const [promotionForm, setPromotionForm] = useState<PromotionFormState>(buildPromotionForm());
  const [isRestrictionsDialogOpen, setIsRestrictionsDialogOpen] = useState(false);
  const [restrictionsSeason, setRestrictionsSeason] = useState<AccommodationRateSeason | null>(null);
  const [restrictionsPlan, setRestrictionsPlan] = useState<AccommodationRatePlan | null>(null);
  const [restrictionsForm, setRestrictionsForm] = useState<SeasonRestrictionsForm>(buildRestrictionsForm());
  const [roomForm, setRoomForm] = useState({
    room_name: '',
    room_type: '',
    capacity: 2,
    inventory_total: 1,
    base_price_per_night: 0,
    amenities: [] as string[],
    description: '',
    images: [] as string[],
  });
  const [ratePlanForm, setRatePlanForm] = useState({
    name: '',
    description: '',
    base_meal_plan: 'bb' as MealPlanType,
    currency: 'EUR',
  });
  const [seasonPlanId, setSeasonPlanId] = useState<string>('');
  const [seasonForm, setSeasonForm] = useState(() => buildInitialSeasonForm());

  const rateDateRange: DateRange = {
    from: seasonForm.start_date,
    to: seasonForm.end_date,
  };

  const bulkDateRange = bulkForm.range;

  const {
    currency: displayCurrency,
    setCurrency: setDisplayCurrency,
    convertAmount,
    formatCurrency: formatDisplayCurrency,
    availableCurrencies,
  } = useCurrencySettings();

  const formatPrice = useCallback(
    (amount?: number | null, sourceCurrency?: string | null) => {
      if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
      const origin = sourceCurrency && sourceCurrency.trim().length ? sourceCurrency : 'EUR';
      const originalLabel = formatDisplayCurrency(amount, origin);
      if (origin === displayCurrency) {
        return originalLabel;
      }
      const converted = convertAmount(amount, origin, displayCurrency);
      return `${formatDisplayCurrency(converted, displayCurrency)} · ${originalLabel}`;
    },
    [displayCurrency, convertAmount, formatDisplayCurrency]
  );

  useEffect(() => {
    if (pricingQuery.error) {
      console.error('Erreur lors du chargement des données hébergement:', pricingQuery.error);
      toast.error('Erreur lors du chargement des données');
    }
  }, [pricingQuery.error]);

  useEffect(() => {
    if (rooms.length === 0) {
      setSelectedRoomId(null);
      return;
    }

    if (!selectedRoomId || !rooms.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const selectedRoom: RoomWithPlans | null = useMemo(() => {
    if (!rooms.length) return null;
    if (!selectedRoomId) return rooms[0];
    return rooms.find((room) => room.id === selectedRoomId) ?? rooms[0];
  }, [rooms, selectedRoomId]);

  const resetSeasonForm = useCallback(
    (basePrice = selectedRoom?.base_price_per_night ?? 0) => {
      setSeasonForm(buildInitialSeasonForm(basePrice));
      setEditingSeason(null);
      setSeasonDialogMode('create');
    },
    [selectedRoom?.base_price_per_night]
  );

  useEffect(() => {
    if (selectedRoom) {
      resetSeasonForm(selectedRoom.base_price_per_night);
    } else {
      setSeasonPlanId('');
    }
  }, [resetSeasonForm, selectedRoom, selectedRoom?.base_price_per_night, selectedRoom?.id]);

  const ratePlans = useMemo<RatePlanWithDetails[]>(
    () => selectedRoom?.rate_plans ?? [],
    [selectedRoom]
  );

  const findCurrencyMeta = useCallback(
    (code: string | null | undefined) =>
      availableCurrencies.find((currency) => currency.code === code) ?? null,
    [availableCurrencies]
  );

  const activeSeasonPlan = useMemo(
    () => ratePlans.find((plan) => plan.id === seasonPlanId) ?? ratePlans[0] ?? null,
    [ratePlans, seasonPlanId]
  );
  const activeSeasonCurrency = activeSeasonPlan?.currency ?? 'EUR';
  const displayCurrencyMeta = findCurrencyMeta(displayCurrency);
  const activeSeasonCurrencyMeta = findCurrencyMeta(activeSeasonCurrency);
  const displayCurrencySymbol = displayCurrencyMeta?.symbol ?? displayCurrency;
  const activeSeasonCurrencySymbol = activeSeasonCurrencyMeta?.symbol ?? activeSeasonCurrency;

  const buildBulkDefaults = useCallback((): BulkSeasonForm => {
    const basePrice = selectedRoom?.base_price_per_night ?? 0;
    const primaryPlanCurrency = ratePlans[0]?.currency ?? 'EUR';
    const convertedBasePrice = convertAmount(basePrice, primaryPlanCurrency, displayCurrency);
    const normalizedBasePrice = Number.isFinite(convertedBasePrice)
      ? Number.parseFloat(convertedBasePrice.toFixed(2))
      : basePrice;
    const defaults = createBulkFormDefaults(normalizedBasePrice, displayCurrency);
    if (ratePlans.length) {
      defaults.planIds = ratePlans.map((plan) => plan.id);
      defaults.seasonName = ratePlans.length === 1 ? ratePlans[0].name : '';
    }
    return defaults;
  }, [convertAmount, displayCurrency, ratePlans, selectedRoom?.base_price_per_night]);

  useEffect(() => {
    if (!selectedRoom || isBulkEditDialogOpen) return;
    setBulkForm(buildBulkDefaults());
  }, [buildBulkDefaults, isBulkEditDialogOpen, selectedRoom]);

  useEffect(() => {
    if (!promotionPlan || !isPromotionDialogOpen) return;
    setPromotionForm(buildPromotionForm(editingPromotion));
  }, [editingPromotion, isPromotionDialogOpen, promotionPlan]);

  useEffect(() => {
    if (ratePlans.length > 0) {
      if (!seasonPlanId || !ratePlans.some((plan) => plan.id === seasonPlanId)) {
        setSeasonPlanId(ratePlans[0].id);
      }
    } else {
      setSeasonPlanId('');
    }
  }, [ratePlans, seasonPlanId]);

  const allSeasons = useMemo(
    () => ratePlans.flatMap((plan) => plan.rate_seasons ?? []),
    [ratePlans]
  );

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    const horizon = addDays(now, 14).getTime();
    return bookings.filter((booking) => {
      const checkIn = new Date(booking.check_in_date).getTime();
      return checkIn >= now.getTime() && checkIn <= horizon;
    });
  }, [bookings]);

  const minimumStayAcrossSeasons = useMemo(() => {
    if (allSeasons.length === 0) return 1;
    return Math.min(...allSeasons.map((season) => season.minimum_stay ?? 1));
  }, [allSeasons]);

  const isMutating =
    createRoom.isPending ||
    updateRoom.isPending ||
    deleteRoom.isPending ||
    createRatePlan.isPending ||
    updateRatePlan.isPending ||
    duplicateRatePlan.isPending ||
    deleteRatePlan.isPending ||
    createRateSeason.isPending ||
    updateRateSeason.isPending ||
    duplicateRateSeason.isPending ||
    deleteRateSeason.isPending;

  const isBusy = pricingQuery.isFetching || isMutating;

  const isEarlyBookingPromotion = promotionForm.type === 'early_booking';
  const isLastMinutePromotion = promotionForm.type === 'last_minute';
  const isLongStayPromotion = promotionForm.type === 'long_stay';

  const handleCreateRoom = async () => {
    if (!touristPointId) return;

    if (roomForm.inventory_total < 1) {
      toast.error('Veuillez indiquer un stock de chambres positif');
      return;
    }

    try {
      await createRoom.mutateAsync({
        tourist_point_id: touristPointId,
        ...roomForm,
        is_available: true,
      });

      toast.success('Chambre créée avec succès');
      setIsRoomDialogOpen(false);
      resetRoomForm();
      setRoomDialogMode('create');
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur lors de la création de la chambre');
    }
  };

  const handleUpdateRoom = async () => {
    if (!selectedRoom) return;

    if (roomForm.inventory_total < 1) {
      toast.error('Veuillez indiquer un stock de chambres positif');
      return;
    }

    try {
      await updateRoom.mutateAsync({ roomId: selectedRoom.id, updates: roomForm });
      toast.success('Chambre mise à jour avec succès');
      setIsRoomDialogOpen(false);
      resetRoomForm();
      setRoomDialogMode('create');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de la chambre');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette chambre ?')) return;

    try {
      await deleteRoom.mutateAsync(roomId);
      toast.success('Chambre supprimée avec succès');
      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la chambre');
    }
  };

  const handleSubmitRatePlan = async () => {
    if (!selectedRoom) {
      toast.error('Sélectionnez d’abord une chambre');
      return;
    }

    if (!ratePlanForm.name.trim()) {
      toast.error('Veuillez saisir un nom de plan tarifaire');
      return;
    }

    try {
      let targetPlanId: string | null = null;

      if (ratePlanDialogMode === 'edit' && editingRatePlan) {
        await updateRatePlan.mutateAsync({
          planId: editingRatePlan.id,
          updates: {
            name: ratePlanForm.name.trim(),
            description: ratePlanForm.description?.trim() || null,
            base_meal_plan: ratePlanForm.base_meal_plan,
            currency: ratePlanForm.currency,
          },
        });
        toast.success('Plan tarifaire mis à jour');
        targetPlanId = editingRatePlan.id;
      } else {
        const newPlan = await createRatePlan.mutateAsync({
          room_id: selectedRoom.id,
          name: ratePlanForm.name.trim(),
          description: ratePlanForm.description?.trim() || null,
          base_meal_plan: ratePlanForm.base_meal_plan,
          pricing_strategy: JSON.stringify({ promotions: [] }),
          currency: ratePlanForm.currency,
          is_active: true,
          display_order: ratePlans.length,
        });

        toast.success('Plan tarifaire créé');
        targetPlanId = newPlan.id;
      }

      setIsRatePlanDialogOpen(false);
      resetRatePlanForm();
      if (targetPlanId) {
        setSeasonPlanId(targetPlanId);
      }
      setActiveTab('rates');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du plan tarifaire:', error);
      toast.error(ratePlanDialogMode === 'edit' ? 'Impossible de mettre à jour le plan tarifaire' : "Impossible de créer le plan tarifaire");
    }
  };

  const handleOpenRatePlanDialog = (mode: 'create' | 'edit', plan?: AccommodationRatePlan) => {
    if (mode === 'edit' && plan) {
      setRatePlanForm({
        name: plan.name,
        description: plan.description ?? '',
        base_meal_plan: plan.base_meal_plan,
        currency: plan.currency,
      });
      setEditingRatePlan(plan);
    } else {
      setRatePlanForm({ name: '', description: '', base_meal_plan: 'bb', currency: displayCurrency });
      setEditingRatePlan(null);
    }
    setRatePlanDialogMode(mode);
    setIsRatePlanDialogOpen(true);
  };

  const handleDuplicateRatePlan = async (plan: AccommodationRatePlan) => {
    try {
      const { plan: duplicatedPlan } = await duplicateRatePlan.mutateAsync({
        planId: plan.id,
        overrides: {
          name: `${plan.name} (copie)`,
          display_order: ratePlans.length,
        },
      });
      toast.success('Plan tarifaire dupliqué');
      setSeasonPlanId(duplicatedPlan.id);
    } catch (error) {
      console.error('Erreur lors de la duplication du plan tarifaire:', error);
      toast.error('Impossible de dupliquer le plan tarifaire');
    }
  };

  const handleOpenBulkEdit = () => {
    if (!selectedRoom) {
      toast.error('Sélectionnez une chambre avant de modifier les tarifs');
      return;
    }
    setBulkForm(buildBulkDefaults());
    setIsBulkEditDialogOpen(true);
  };

  const toggleBulkPlan = (planId: string, enabled: boolean) => {
    setBulkForm((prev) => {
      const planIds = enabled
        ? Array.from(new Set([...prev.planIds, planId]))
        : prev.planIds.filter((id) => id !== planId);
      return { ...prev, planIds };
    });
  };

  const handleBulkMealToggle = (mealType: Exclude<MealPlanType, 'bb'>, enabled: boolean) => {
    setBulkForm((prev) => ({
      ...prev,
      mealPlanPricing: {
        ...prev.mealPlanPricing,
        [mealType]: enabled ? prev.mealPlanPricing[mealType] ?? prev.basePrice : null,
      },
    }));
  };

  const handleBulkMealChange = (mealType: Exclude<MealPlanType, 'bb'>, value: number) => {
    setBulkForm((prev) => ({
      ...prev,
      mealPlanPricing: {
        ...prev.mealPlanPricing,
        [mealType]: Number.isFinite(value) ? value : prev.mealPlanPricing[mealType],
      },
    }));
  };

  const handleBulkApply = async () => {
    if (!selectedRoom) {
      toast.error('Sélectionnez une chambre');
      return;
    }

    const { range, planIds, basePrice, seasonName, minimumStay, mealPlanPricing, overwriteExisting } = bulkForm;
    const { from, to } = range;

    if (!from || !to) {
      toast.error('Sélectionnez une période');
      return;
    }

    const startDate = startOfDay(from);
    const endDate = endOfDay(to);

    if (endDate < startDate) {
      toast.error('La date de fin doit être postérieure à la date de début');
      return;
    }

    if (!planIds.length) {
      toast.error('Choisissez au moins un plan tarifaire');
      return;
    }

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      toast.error('Saisissez un tarif BB valide');
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      const generatedName = (
        seasonName.trim() ||
        `Saison du ${format(startDate, 'dd MMM', { locale: fr })} au ${format(endDate, 'dd MMM yyyy', { locale: fr })}`
      );
      for (const planId of planIds) {
        const plan = ratePlans.find((item) => item.id === planId);
        if (!plan) continue;

        const planCurrency = plan.currency ?? 'EUR';
        const convertedBasePrice = convertAmount(basePrice, displayCurrency, planCurrency);
        const normalizedPlanBasePrice = Number.isFinite(convertedBasePrice)
          ? Number.parseFloat(convertedBasePrice.toFixed(2))
          : basePrice;

        const convertedMealPlans: MealPlanPricing = {};
        OPTIONAL_MEAL_PLANS.forEach(({ value }) => {
          const raw = mealPlanPricing[value];
          if (typeof raw !== 'number' || Number.isNaN(raw)) return;
          const convertedValue = convertAmount(raw, displayCurrency, planCurrency);
          if (Number.isFinite(convertedValue)) {
            convertedMealPlans[value] = Number.parseFloat(convertedValue.toFixed(2));
          }
        });

        const mealPlanPayload = composeMealPlanPricing(normalizedPlanBasePrice, convertedMealPlans);

        if (overwriteExisting && plan.rate_seasons?.length) {
          const overlapping = plan.rate_seasons.filter((season) => {
            const seasonStart = startOfDay(new Date(season.start_date));
            const seasonEnd = endOfDay(new Date(season.end_date));
            return seasonStart <= endDate && seasonEnd >= startDate;
          });

          for (const season of overlapping) {
            await deleteRateSeason.mutateAsync(season.id);
          }
        }

        await createRateSeason.mutateAsync({
          rate_plan_id: planId,
          season_name: generatedName,
          start_date: startDateStr,
          end_date: endDateStr,
          base_price: normalizedPlanBasePrice,
          currency: planCurrency,
          meal_plan_pricing: mealPlanPayload,
          minimum_stay: minimumStay,
          maximum_stay: null,
          closed_to_arrival: null,
          closed_to_departure: null,
          advance_purchase_days: null,
          cutoff_hours: null,
          restrictions: null,
        });
      }

      toast.success('Modifications en masse appliquées');
      setIsBulkEditDialogOpen(false);
      setBulkForm(buildBulkDefaults());
    } catch (error) {
      console.error('Erreur lors des modifications en masse:', error);
      toast.error("Impossible d’appliquer les modifications en masse");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleOpenPromotionDialog = (
    mode: 'create' | 'edit',
    plan: RatePlanWithDetails,
    promotion?: PromotionRule
  ) => {
    setPromotionDialogMode(mode);
    setPromotionPlan(plan);
    setEditingPromotion(promotion ?? null);
    setPromotionForm(buildPromotionForm(promotion));
    setIsPromotionDialogOpen(true);
  };

  const handlePromotionFieldChange = <K extends keyof PromotionFormState>(
    key: K,
    value: PromotionFormState[K]
  ) => {
    setPromotionForm((prev) => ({ ...prev, [key]: value }));
  };

  const stringifyPromotions = (rules: PromotionRule[]) =>
    JSON.stringify({ promotions: rules }, null, 0);

  const handleSubmitPromotion = async () => {
    if (!promotionPlan) {
      toast.error('Sélectionnez un plan tarifaire');
      return;
    }

    if (!promotionForm.name.trim()) {
      toast.error('Donnez un nom à la promotion');
      return;
    }

    if (!Number.isFinite(promotionForm.discountPercent) || promotionForm.discountPercent <= 0) {
      toast.error('Le pourcentage doit être supérieur à 0');
      return;
    }

    const discount = Math.min(100, Math.max(1, promotionForm.discountPercent));

    const normalizeOptionalNumber = (value: number | null) =>
      value !== null && Number.isFinite(value) ? value : null;

    const baseRule: PromotionRule = {
      id: editingPromotion?.id ?? generatePromotionId(),
      name: promotionForm.name.trim(),
      type: promotionForm.type,
      discount_percent: discount,
      min_nights: normalizeOptionalNumber(promotionForm.minNights),
      max_nights: null,
      advance_min_days: normalizeOptionalNumber(promotionForm.advanceMinDays),
      advance_max_days: normalizeOptionalNumber(promotionForm.advanceMaxDays),
      start_date: promotionForm.startDate || null,
      end_date: promotionForm.endDate || null,
      active: promotionForm.active,
      created_at: editingPromotion?.created_at ?? new Date().toISOString(),
    };

    const existing = promotionPlan.promotion_rules ?? [];
    const nextPromotions = editingPromotion
      ? existing.map((rule) => (rule.id === editingPromotion.id ? baseRule : rule))
      : [...existing, baseRule];

    try {
      await updateRatePlan.mutateAsync({
        planId: promotionPlan.id,
        updates: {
          pricing_strategy: stringifyPromotions(nextPromotions),
        },
      });
      toast.success(editingPromotion ? 'Promotion mise à jour' : 'Promotion créée');
      setIsPromotionDialogOpen(false);
      setPromotionPlan(null);
      setEditingPromotion(null);
      setPromotionForm(buildPromotionForm());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la promotion:', error);
      toast.error(editingPromotion ? 'Impossible de mettre à jour la promotion' : 'Impossible de créer la promotion');
    }
  };

  const handleTogglePromotion = async (
    plan: RatePlanWithDetails,
    promotion: PromotionRule,
    enabled: boolean
  ) => {
    const updated = plan.promotion_rules.map((rule) =>
      rule.id === promotion.id ? { ...rule, active: enabled } : rule
    );

    try {
      await updateRatePlan.mutateAsync({
        planId: plan.id,
        updates: {
          pricing_strategy: stringifyPromotions(updated),
        },
      });
      toast.success(enabled ? 'Promotion activée' : 'Promotion désactivée');
    } catch (error) {
      console.error('Erreur lors du changement de statut promotion:', error);
      toast.error('Impossible de mettre à jour le statut de la promotion');
    }
  };

  const handleDeletePromotion = async (plan: RatePlanWithDetails, promotion: PromotionRule) => {
    if (!confirm(`Supprimer la promotion "${promotion.name}" ?`)) return;

    const remaining = plan.promotion_rules.filter((rule) => rule.id !== promotion.id);

    try {
      await updateRatePlan.mutateAsync({
        planId: plan.id,
        updates: {
          pricing_strategy: stringifyPromotions(remaining),
        },
      });
      toast.success('Promotion supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression de la promotion:', error);
      toast.error('Impossible de supprimer la promotion');
    }
  };

  const handleOpenRestrictionsDialog = (
    plan: AccommodationRatePlan,
    season: AccommodationRateSeason
  ) => {
    setRestrictionsPlan(plan);
    setRestrictionsSeason(season);
    setRestrictionsForm(buildRestrictionsForm(season));
    setIsRestrictionsDialogOpen(true);
  };

  const handleRestrictionsChange = <K extends keyof SeasonRestrictionsForm>(
    key: K,
    value: SeasonRestrictionsForm[K]
  ) => {
    setRestrictionsForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitRestrictions = async () => {
    if (!restrictionsSeason) return;

    const payload: Partial<AccommodationRateSeason> = {
      minimum_stay: restrictionsForm.minimumStay,
      maximum_stay: restrictionsForm.maximumStay,
      closed_to_arrival: restrictionsForm.closedToArrival,
      closed_to_departure: restrictionsForm.closedToDeparture,
      advance_purchase_days: restrictionsForm.advancePurchaseDays,
      cutoff_hours: restrictionsForm.cutoffHours,
    };

    try {
      await updateRateSeason.mutateAsync({ seasonId: restrictionsSeason.id, updates: payload });
      toast.success('Restrictions mises à jour');
      setIsRestrictionsDialogOpen(false);
      setRestrictionsSeason(null);
      setRestrictionsPlan(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des restrictions:', error);
      toast.error('Impossible de mettre à jour les restrictions');
    }
  };

  const handleDeleteRatePlan = async (planId: string) => {
    if (!confirm('Supprimer ce plan tarifaire et toutes ses saisons ?')) return;
    try {
      await deleteRatePlan.mutateAsync(planId);
      toast.success('Plan tarifaire supprimé');
      if (seasonPlanId === planId) {
        setSeasonPlanId('');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du plan:', error);
      toast.error('Impossible de supprimer le plan tarifaire');
    }
  };

  const resetRatePlanForm = () => {
    setRatePlanForm({ name: '', description: '', base_meal_plan: 'bb', currency: displayCurrency });
    setEditingRatePlan(null);
    setRatePlanDialogMode('create');
  };

  const handleOpenSeasonDialog = (
    mode: 'create' | 'edit',
    options: { planId?: string; season?: AccommodationRateSeason } = {}
  ) => {
    if (!selectedRoom) {
      toast.error('Sélectionnez une chambre avant de gérer les saisons');
      return;
    }
    if (!ratePlans.length) {
      toast.error('Créez un plan tarifaire avant d’ajouter une saison');
      return;
    }

    const targetPlanId = options.planId ?? options.season?.rate_plan_id ?? seasonPlanId;
    if (!targetPlanId) {
      toast.error('Choisissez un plan tarifaire');
      return;
    }

    setSeasonPlanId(targetPlanId);

    if (mode === 'edit' && options.season) {
      const season = options.season;
      setSeasonForm({
        season_name: season.season_name,
        start_date: new Date(season.start_date),
        end_date: new Date(season.end_date),
        base_price: season.base_price,
        minimum_stay: season.minimum_stay ?? 1,
        meal_plan_pricing: normalizeOptionalMealPlans(season.meal_plan_pricing ?? null),
      });
      setEditingSeason(season);
    } else {
      setSeasonForm(buildInitialSeasonForm(selectedRoom.base_price_per_night));
      setEditingSeason(null);
    }

    setSeasonDialogMode(mode);
    setIsSeasonDialogOpen(true);
  };

  const handleSubmitSeason = async () => {
    if (!selectedRoom || !seasonPlanId) {
      toast.error('Choisissez un plan tarifaire');
      return;
    }

    if (!seasonForm.season_name.trim()) {
      toast.error('Veuillez saisir un nom de saison');
      return;
    }

    if (!seasonForm.start_date || !seasonForm.end_date) {
      toast.error('Sélectionnez une période');
      return;
    }

    if (seasonForm.end_date.getTime() < seasonForm.start_date.getTime()) {
      toast.error('La date de fin doit être postérieure à la date de début');
      return;
    }

    if (seasonForm.base_price <= 0) {
      const currencyLabel = activeSeasonCurrencyMeta?.symbol ?? activeSeasonCurrency;
      toast.error(`Le tarif BB doit être supérieur à 0 ${currencyLabel}`);
      return;
    }

    try {
      const mealPlanPayload = composeMealPlanPricing(seasonForm.base_price, seasonForm.meal_plan_pricing);
      const metaDefaults =
        seasonDialogMode === 'edit' && editingSeason
          ? {
              maximum_stay: editingSeason.maximum_stay ?? null,
              closed_to_arrival: editingSeason.closed_to_arrival ?? null,
              closed_to_departure: editingSeason.closed_to_departure ?? null,
              advance_purchase_days: editingSeason.advance_purchase_days ?? null,
              cutoff_hours: editingSeason.cutoff_hours ?? null,
              restrictions: editingSeason.restrictions ?? null,
            }
          : {
              maximum_stay: null,
              closed_to_arrival: false,
              closed_to_departure: false,
              advance_purchase_days: null,
              cutoff_hours: null,
              restrictions: null,
            };

      const payload = {
        rate_plan_id: seasonPlanId,
        season_name: seasonForm.season_name.trim(),
        start_date: format(seasonForm.start_date, 'yyyy-MM-dd'),
        end_date: format(seasonForm.end_date, 'yyyy-MM-dd'),
        base_price: seasonForm.base_price,
        currency: ratePlans.find((plan) => plan.id === seasonPlanId)?.currency ?? 'EUR',
        meal_plan_pricing: mealPlanPayload,
        minimum_stay: seasonForm.minimum_stay,
        ...metaDefaults,
      };

      if (seasonDialogMode === 'edit' && editingSeason) {
        await updateRateSeason.mutateAsync({ seasonId: editingSeason.id, updates: payload });
        toast.success('Saison mise à jour');
      } else {
        await createRateSeason.mutateAsync(payload);
        toast.success('Saison ajoutée');
      }

      setIsSeasonDialogOpen(false);
      resetSeasonForm(selectedRoom.base_price_per_night);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la saison:', error);
      toast.error(seasonDialogMode === 'edit' ? 'Impossible de mettre à jour la saison' : 'Impossible de créer la saison');
    }
  };

  const handleDeleteSeason = async (season: AccommodationRateSeason) => {
    if (!confirm('Supprimer cette saison ?')) return;
    try {
      await deleteRateSeason.mutateAsync(season.id);
      toast.success('Saison supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression de la saison:', error);
      toast.error('Impossible de supprimer la saison');
    }
  };

  const handleDuplicateSeason = async (season: AccommodationRateSeason) => {
    try {
      await duplicateRateSeason.mutateAsync({
        seasonId: season.id,
        overrides: {
          season_name: `${season.season_name} (copie)`,
          rate_plan_id: season.rate_plan_id,
        },
      });
      toast.success('Saison dupliquée');
      setSeasonPlanId(season.rate_plan_id);
    } catch (error) {
      console.error('Erreur lors de la duplication de la saison:', error);
      toast.error('Impossible de dupliquer la saison');
    }
  };

const renderMealPlanSummary = (
  season: AccommodationRateSeason,
  planCurrency: string | null | undefined,
  formatPrice: (amount?: number | null, sourceCurrency?: string | null) => string
) => {
  const currency = season.currency ?? planCurrency ?? 'EUR';
  const badges: React.ReactNode[] = [
    <Badge key="bb" variant="secondary" className="text-xs">
      {MEAL_PLAN_LABELS.bb}: {formatPrice(season.base_price, currency)}
    </Badge>,
  ];

  OPTIONAL_MEAL_PLANS.forEach(({ value }) => {
    const price = season.meal_plan_pricing?.[value];
    if (typeof price === 'number' && !Number.isNaN(price)) {
      badges.push(
        <Badge key={value} variant="outline" className="text-xs">
          {MEAL_PLAN_LABELS[value]}: {formatPrice(price, currency)}
        </Badge>
      );
    }
  });

  return <div className="flex flex-wrap gap-2">{badges}</div>;
};

const renderRestrictionsSummary = (season: AccommodationRateSeason) => {
    const chips: Array<{ key: string; label: string; variant: 'outline' | 'secondary' | 'default' }> = [];

    chips.push({ key: 'min', label: `Min ${season.minimum_stay ?? 1}n`, variant: 'secondary' });

    if (season.maximum_stay && season.maximum_stay > 0) {
      chips.push({ key: 'max', label: `Max ${season.maximum_stay}n`, variant: 'secondary' });
    }

    if (season.closed_to_arrival) {
      chips.push({ key: 'cta', label: 'CTA', variant: 'outline' });
    }

    if (season.closed_to_departure) {
      chips.push({ key: 'ctd', label: 'CTD', variant: 'outline' });
    }

    if (season.advance_purchase_days && season.advance_purchase_days > 0) {
      chips.push({ key: 'adv', label: `Min ${season.advance_purchase_days}j`, variant: 'outline' });
    }

    if (season.cutoff_hours && season.cutoff_hours > 0) {
      chips.push({ key: 'cutoff', label: `Cut-off ${season.cutoff_hours}h`, variant: 'outline' });
    }

    if (chips.length === 1) {
      chips.push({ key: 'default', label: 'Aucune restriction supplémentaire', variant: 'outline' });
    }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant={chip.variant} className="text-xs">
          {chip.label}
        </Badge>
      ))}
    </div>
  );
};

const buildPlanRestrictionBadges = (plan: RatePlanWithDetails) => {
  const seasons = plan.rate_seasons ?? [];
  const badges: React.ReactNode[] = [];

  if (seasons.length === 0) {
    badges.push(
      <Badge key="empty" variant="outline" className="text-xs">
        Aucune saison
      </Badge>
    );
    return badges;
  }

  const numericValues = seasons.map((season) => season.minimum_stay ?? 1).filter((value) => Number.isFinite(value));
  const minStay = numericValues.length ? Math.min(...numericValues) : null;
  if (minStay && minStay > 0) {
    badges.push(
      <Badge key="min" variant="secondary" className="text-xs">
        Min {minStay} nuit{minStay > 1 ? 's' : ''}
      </Badge>
    );
  }

  const maxStayValues = seasons
    .map((season) => season.maximum_stay)
    .filter((value): value is number => typeof value === 'number' && value > 0);
  if (maxStayValues.length) {
    const maxStay = Math.max(...maxStayValues);
    badges.push(
      <Badge key="max" variant="secondary" className="text-xs">
        Max {maxStay} nuit{maxStay > 1 ? 's' : ''}
      </Badge>
    );
  }

  const ctaCount = seasons.filter((season) => season.closed_to_arrival).length;
  if (ctaCount > 0) {
    badges.push(
      <Badge key="cta" variant="outline" className="text-xs">
        CTA {ctaCount}
      </Badge>
    );
  }

  const ctdCount = seasons.filter((season) => season.closed_to_departure).length;
  if (ctdCount > 0) {
    badges.push(
      <Badge key="ctd" variant="outline" className="text-xs">
        CTD {ctdCount}
      </Badge>
    );
  }

  const advanceMinValues = seasons
    .map((season) => season.advance_purchase_days)
    .filter((value): value is number => typeof value === 'number' && value > 0);
  if (advanceMinValues.length) {
    const minAdvance = Math.min(...advanceMinValues);
    badges.push(
      <Badge key="advance" variant="outline" className="text-xs">
        Min {minAdvance} j avant
      </Badge>
    );
  }

  return badges;
};

const renderPromotionConditions = (promotion: PromotionRule) => {
  const chips: React.ReactNode[] = [];

  if (promotion.type) {
    chips.push(
      <Badge key="type" variant="secondary" className="text-xs">
        {PROMOTION_TYPE_LABELS[promotion.type]}
      </Badge>
    );
  }

  if (promotion.min_nights && promotion.min_nights > 0) {
    chips.push(
      <Badge key="min-nights" variant="outline" className="text-xs">
        Min {promotion.min_nights} nuit{promotion.min_nights > 1 ? 's' : ''}
      </Badge>
    );
  }

  if (promotion.advance_min_days && promotion.advance_min_days > 0) {
    chips.push(
      <Badge key="advance-min" variant="outline" className="text-xs">
        {promotion.advance_min_days} j avant min.
      </Badge>
    );
  }

  if (promotion.advance_max_days && promotion.advance_max_days > 0) {
    chips.push(
      <Badge key="advance-max" variant="outline" className="text-xs">
        Jusqu&apos;à {promotion.advance_max_days} j avant
      </Badge>
    );
  }

  if (promotion.start_date) {
    chips.push(
      <Badge key="start" variant="outline" className="text-xs">
        Dès {format(new Date(promotion.start_date), 'dd/MM/yyyy')}
      </Badge>
    );
  }

  if (promotion.end_date) {
    chips.push(
      <Badge key="end" variant="outline" className="text-xs">
        Jusqu&apos;au {format(new Date(promotion.end_date), 'dd/MM/yyyy')}
      </Badge>
    );
  }

  if (chips.length === 0) {
    chips.push(
      <Badge key="none" variant="outline" className="text-xs">
        Sans condition particulière
      </Badge>
    );
  }

  return <div className="flex flex-wrap gap-2">{chips}</div>;
};

  const resetRoomForm = () => {
    setRoomForm({
      room_name: '',
      room_type: '',
      capacity: 2,
      inventory_total: 1,
      base_price_per_night: 0,
      amenities: [],
      description: '',
      images: [],
    });
  };

  const editRoom = (room: RoomWithPlans) => {
    setSelectedRoomId(room.id);
    setRoomDialogMode('edit');
    setRoomForm({
      room_name: room.room_name,
      room_type: room.room_type,
      capacity: room.capacity,
      inventory_total: room.inventory_total ?? 1,
      base_price_per_night: room.base_price_per_night,
      amenities: room.amenities ?? [],
      description: room.description ?? '',
      images: room.images ?? [],
    });
    setIsRoomDialogOpen(true);
  };

  const openCreateRoomDialog = () => {
    setRoomDialogMode('create');
    resetRoomForm();
    setIsRoomDialogOpen(true);
  };


  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="border-b bg-muted/40 px-6 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Gestion des tarifs d'hébergement
            </p>
            <h2 className="text-2xl font-semibold leading-tight text-foreground">
              {poiName ?? 'Hébergement partenaire'}
            </h2>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{rooms.length} {rooms.length > 1 ? 'chambres' : 'chambre'}</span>
              <span>{ratePlans.length} plans tarifaires</span>
              <span>{allSeasons.length} saisons configurées</span>
              {selectedRoom && (
                <span>
                  Chambre sélectionnée :
                  <span className="ml-1 font-medium text-foreground">{selectedRoom.room_name}</span>
                </span>
              )}
            </div>
            {isBusy && (
              <Badge variant="outline" className="mt-3 text-xs">Chargement des données…</Badge>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {rooms.length > 0 && (
              <div className="md:hidden w-full">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Chambre
                </Label>
                <Select
                  value={selectedRoom?.id ?? ''}
                  onValueChange={(roomId) => setSelectedRoomId(roomId)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choisir une chambre" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.room_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                <Label className="text-xs font-semibold uppercase text-muted-foreground sm:mr-2 sm:text-[11px]">
                  Devise d'affichage
                </Label>
                <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Choisir une devise" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} · {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" onClick={openCreateRoomDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle chambre
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOpenRatePlanDialog('create')}
                disabled={!selectedRoom}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau plan
              </Button>
              <Button
                onClick={() => handleOpenSeasonDialog('create')}
                disabled={!selectedRoom || ratePlans.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle saison
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenBulkEdit}
                disabled={!selectedRoom || ratePlans.length === 0}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Modifier en masse
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="hidden w-80 flex-none flex-col border-r bg-background px-4 py-4 md:flex">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chambres</h3>
            <Button variant="ghost" size="icon" onClick={openCreateRoomDialog}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {rooms.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Créez votre première chambre pour définir vos tarifs.
              </div>
            ) : (
              rooms.map((room) => {
                const isActive = selectedRoom?.id === room.id;
                const roomCurrency = room.rate_plans?.[0]?.currency ?? 'EUR';
                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-3 text-left transition',
                      isActive
                        ? 'border-primary bg-primary/5 text-primary-foreground shadow-sm'
                        : 'border-border hover:bg-muted/60'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{room.room_name}</span>
                      <Badge
                        variant={room.is_available ? 'secondary' : 'outline'}
                        className="text-[10px] uppercase"
                      >
                        {room.is_available ? 'Disponible' : 'Indisponible'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{room.capacity} pers.</span>
                      <Layers className="h-3 w-3" />
                      <span>{room.inventory_total} unité{room.inventory_total > 1 ? 's' : ''}</span>
                      <Coins className="h-3 w-3" />
                      <span>{formatPrice(room.base_price_per_night, roomCurrency)} BB</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex w-full flex-1 min-h-0 flex-col overflow-hidden"
        >
          <div className="border-b px-6 py-3">
            <TabsList className="flex flex-wrap gap-2 bg-transparent p-0">
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              <TabsTrigger value="rates">Tarifs & saisons</TabsTrigger>
              <TabsTrigger value="bookings">Réservations</TabsTrigger>
              <TabsTrigger value="calendar">Calendrier</TabsTrigger>
              <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
              <TabsTrigger value="promotions">Promotions</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex-1 min-h-0 overflow-y-auto px-6 py-6 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col">
            <OverviewTab upcomingBookings={upcomingBookings.length} />
          </TabsContent>

          <TabsContent value="rates" className="flex-1 min-h-0 overflow-y-auto px-6 py-6 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col">
            {selectedRoom ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{selectedRoom.room_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedRoom.room_type} · {selectedRoom.capacity} personnes · {selectedRoom.inventory_total} unité{selectedRoom.inventory_total > 1 ? 's' : ''} · {formatPrice(selectedRoom.base_price_per_night, ratePlans[0]?.currency ?? "EUR")} BB
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => editRoom(selectedRoom)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier la chambre
                    </Button>
                    <Button onClick={() => handleOpenSeasonDialog('create')} disabled={!ratePlans.length}>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter une saison
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Tarif BB actuel</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{formatPrice(selectedRoom.base_price_per_night, ratePlans[0]?.currency ?? "EUR")}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Tarif appliqué hors saisons spécifiques.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Plans tarifaires</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{ratePlans.length}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Structurez vos offres (BB, demi-pension, etc.).
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Saisons actives</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{allSeasons.length}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Configurez des périodes personnalisées.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Séjour minimum</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{minimumStayAcrossSeasons} nuit{minimumStayAcrossSeasons > 1 ? 's' : ''}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Ajustez vos restrictions par saison.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4 pr-1 w-full">
                  {ratePlans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                      <Bed className="h-10 w-10" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Aucun plan tarifaire</p>
                        <p className="text-xs">Créez un plan pour décliner vos saisons (ex : Flexible BB, Non remboursable HB…).</p>
                      </div>
                      <Button onClick={() => handleOpenRatePlanDialog('create')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un plan tarifaire
                      </Button>
                    </div>
                  ) : (
                    ratePlans.map((plan) => {
                      const seasons = plan.rate_seasons ?? [];
                      return (
                        <Card key={plan.id} className="w-full border border-border/70">
                          <CardHeader className="w-full flex flex-col gap-4 md:flex-row md:flex-nowrap md:items-start md:justify-between">
                            <div>
                              <CardTitle>{plan.name}</CardTitle>
                              <CardDescription>
                                Plan {MEAL_PLAN_LABELS[plan.base_meal_plan]} · {seasons.length} saison{seasons.length > 1 ? 's' : ''}
                              </CardDescription>
                              {plan.description && (
                                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenRatePlanDialog('edit', plan)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier le plan
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDuplicateRatePlan(plan)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Dupliquer
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenSeasonDialog('create', { planId: plan.id })}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Ajouter une saison
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteRatePlan(plan.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer le plan
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="px-0">
                            {seasons.length === 0 ? (
                              <div className="px-6 pb-6 text-sm text-muted-foreground">
                                Aucune saison. Ajoutez-en une pour définir les tarifs de ce plan.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Saison</TableHead>
                                      <TableHead>Période</TableHead>
                                      <TableHead>Plans repas</TableHead>
                                      <TableHead>Restrictions</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {seasons.map((season) => (
                                      <TableRow key={season.id}>
                                        <TableCell>
                                          <div className="font-medium text-foreground">{season.season_name}</div>
                                          <div className="text-xs text-muted-foreground">BB: {formatPrice(season.base_price, season.currency ?? plan.currency)}</div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="text-sm text-foreground">
                                            {format(new Date(season.start_date), 'dd/MM/yyyy')} – {format(new Date(season.end_date), 'dd/MM/yyyy')}
                                          </div>
                                        </TableCell>
                                        <TableCell>{renderMealPlanSummary(season, plan.currency, formatPrice)}</TableCell>
                                        <TableCell>{renderRestrictionsSummary(season)}</TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                handleOpenSeasonDialog('edit', {
                                                  planId: plan.id,
                                                  season,
                                                })
                                              }
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleOpenRestrictionsDialog(plan, season)}
                                            >
                                              <CalendarIcon className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleDuplicateSeason(season)}
                                            >
                                              <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleDeleteSeason(season)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                <Bed className="h-10 w-10" />
                <div>
                  <p className="text-sm font-medium text-foreground">Sélectionnez une chambre</p>
                  <p className="text-xs">Choisissez une chambre dans la colonne de gauche pour configurer ses tarifs.</p>
                </div>
                <Button variant="outline" onClick={() => setIsRoomDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une chambre
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="flex-1 min-h-0 overflow-y-auto px-6 py-6 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col">
            <Card>
              <CardHeader>
                <CardTitle>Réservations récentes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Chambre</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Personnes</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => {
                      const room = rooms.find((r) => r.id === booking.room_id);
                      return (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{booking.customer_name}</div>
                              <div className="text-sm text-muted-foreground">{booking.customer_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{room?.room_name || 'Chambre inconnue'}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(booking.check_in_date), 'dd/MM/yyyy')} – {format(new Date(booking.check_out_date), 'dd/MM/yyyy')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {booking.total_nights} nuit{booking.total_nights > 1 ? 's' : ''}
                            </div>
                          </TableCell>
                          <TableCell>{booking.number_of_guests}</TableCell>
                          <TableCell>
                            {formatPrice(booking.total_amount, room?.rate_plans?.[0]?.currency ?? 'EUR')}
                          </TableCell>
                          <TableCell>
                            <Badge className={getBookingStatusColor(booking.booking_status)}>
                              {getBookingStatusLabel(booking.booking_status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {booking.booking_status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                >
                                  Annuler
                                </Button>
                              )}
                              {booking.booking_status === 'pending' && (
                                <Button size="sm" onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}>
                                  Confirmer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="flex-1 min-h-0 overflow-y-auto px-6 py-6 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col">
            {selectedRoom ? (
              <RoomAvailabilityCalendar
                room={selectedRoom}
                bookings={bookings}
                displayCurrency={displayCurrency}
                convertAmount={convertAmount}
                formatDisplayCurrency={formatDisplayCurrency}
              />
            ) : (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Calendrier d'occupation</CardTitle>
                  <CardDescription>
                    Sélectionnez une chambre pour visualiser l'ouverture, les réservations et les tarifs associés.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                    Créez ou choisissez une chambre dans la colonne de gauche pour afficher son calendrier.
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="restrictions" className="flex-1 min-h-0 overflow-y-auto px-6 py-6 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col">
            {!selectedRoom ? (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Restrictions de séjour</CardTitle>
                  <CardDescription>
                    Sélectionnez une chambre pour visualiser et ajuster ses restrictions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                    Créez ou choisissez une chambre dans la colonne de gauche pour configurer les restrictions.
                  </div>
                </CardContent>
              </Card>
            ) : ratePlans.length === 0 ? (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Restrictions de séjour</CardTitle>
                  <CardDescription>
                    Ajoutez un plan tarifaire pour utiliser les restrictions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                    Les restrictions s&apos;appliquent sur les saisons d&apos;un plan tarifaire. Créez d&apos;abord un plan pour cette chambre.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6 pr-1">
                {ratePlans.map((plan) => {
                  const seasons = plan.rate_seasons ?? [];
                  const badges = buildPlanRestrictionBadges(plan);

                  return (
                    <Card key={plan.id} className="w-full border border-border/70">
                      <CardHeader className="w-full flex flex-col gap-4 md:flex-row md:flex-nowrap md:items-start md:justify-between">
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription>
                            {MEAL_PLAN_LABELS[plan.base_meal_plan]} · {seasons.length} saison{seasons.length > 1 ? 's' : ''}
                          </CardDescription>
                          {plan.description && (
                            <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {badges}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {seasons.length === 0 ? (
                          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                            Aucune saison configurée. Ajoutez une saison pour définir les restrictions de ce plan.
                          </div>
                        ) : (
                          seasons.map((season) => (
                            <div
                              key={season.id}
                              className="rounded-md border p-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
                            >
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-foreground">
                                  {season.season_name || 'Saison sans nom'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(season.start_date), 'dd/MM/yyyy')} – {format(new Date(season.end_date), 'dd/MM/yyyy')}
                                </p>
                                <div>{renderRestrictionsSummary(season)}</div>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenRestrictionsDialog(plan, season)}
                                >
                                  Ajuster les restrictions
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="promotions" className="flex-1 min-h-0 overflow-y-auto px-6 py-6 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col">
            {!selectedRoom ? (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Promotions & offres</CardTitle>
                  <CardDescription>
                    Sélectionnez une chambre pour configurer les promotions associées à ses plans tarifaires.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                    Créez ou choisissez une chambre dans la colonne de gauche pour activer les promotions.
                  </div>
                </CardContent>
              </Card>
            ) : ratePlans.length === 0 ? (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Promotions & offres</CardTitle>
                  <CardDescription>
                    Ajoutez un plan tarifaire pour pouvoir créer des promotions ciblées.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                    Les promotions se rattachent à un plan tarifaire. Créez d’abord un plan pour cette chambre.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6 overflow-y-auto pr-1">
                {ratePlans.map((plan) => {
                  const promotions = [...(plan.promotion_rules ?? [])].sort((a, b) =>
                    (a.created_at || '').localeCompare(b.created_at || '')
                  );

                  return (
                    <Card key={plan.id} className="w-full border border-border/70">
                      <CardHeader className="w-full flex flex-col gap-4 md:flex-row md:flex-nowrap md:items-start md:justify-between">
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription>
                            {MEAL_PLAN_LABELS[plan.base_meal_plan]} · {promotions.length}{' '}
                            promotion{promotions.length > 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPromotionDialog('create', plan)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Créer une promotion
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {promotions.length === 0 ? (
                          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                            Aucune promotion active pour ce plan. Créez une promotion early booking, dernière minute
                            ou long séjour pour booster les conversions.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Promotion</TableHead>
                                  <TableHead>Remise</TableHead>
                                  <TableHead>Conditions</TableHead>
                                  <TableHead>Statut</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {promotions.map((promotion) => (
                                  <TableRow key={promotion.id}>
                                    <TableCell>
                                      <div className="font-medium text-foreground">{promotion.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {PROMOTION_TYPE_LABELS[promotion.type]}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="text-xs">
                                        -{promotion.discount_percent.toFixed(0)}%
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{renderPromotionConditions(promotion)}</TableCell>
                                    <TableCell>
                                      <Switch
                                        checked={promotion.active}
                                        onCheckedChange={(checked) =>
                                          handleTogglePromotion(
                                            plan,
                                            promotion,
                                            checked === true
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            handleOpenPromotionDialog(
                                              'edit',
                                              plan,
                                              promotion
                                            )
                                          }
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDeletePromotion(plan, promotion)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Room Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {roomDialogMode === 'edit' ? 'Modifier la chambre' : 'Nouvelle chambre'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de la chambre *</Label>
                <Input
                  value={roomForm.room_name}
                  onChange={(e) => setRoomForm((prev) => ({ ...prev, room_name: e.target.value }))}
                  placeholder="ex: Chambre Deluxe"
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={roomForm.room_type}
                  onValueChange={(value) => setRoomForm((prev) => ({ ...prev, room_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type de chambre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="deluxe">Deluxe</SelectItem>
                    <SelectItem value="suite">Suite</SelectItem>
                    <SelectItem value="familiale">Familiale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Capacité *</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm((prev) => ({ ...prev, capacity: Number(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock (unités similaires) *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={roomForm.inventory_total}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value, 10);
                    setRoomForm((prev) => ({ ...prev, inventory_total: Number.isNaN(value) ? 1 : Math.max(1, value) }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Prix BB par nuit ({displayCurrencySymbol}) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={roomForm.base_price_per_night}
                  onChange={(e) => setRoomForm((prev) => ({ ...prev, base_price_per_night: Number.parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={roomForm.description}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la chambre..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRoomDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={roomDialogMode === 'edit' ? handleUpdateRoom : handleCreateRoom}
                disabled={createRoom.isPending || updateRoom.isPending}
              >
                {roomDialogMode === 'edit' ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rate Plan Dialog */}
      <Dialog
        open={isRatePlanDialogOpen}
        onOpenChange={(open) => {
          setIsRatePlanDialogOpen(open);
          if (!open) {
            resetRatePlanForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {ratePlanDialogMode === 'edit' ? 'Modifier le plan tarifaire' : 'Nouveau plan tarifaire'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du plan *</Label>
              <Input
                value={ratePlanForm.name}
                onChange={(e) => setRatePlanForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="ex: Flexible BB"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={ratePlanForm.description}
                onChange={(e) => setRatePlanForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Ajoutez les spécificités de ce plan"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan repas de base</Label>
                <Select
                  value={ratePlanForm.base_meal_plan}
                  onValueChange={(value: MealPlanType) => setRatePlanForm((prev) => ({ ...prev, base_meal_plan: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bb">Bed & Breakfast</SelectItem>
                    <SelectItem value="half_board">Demi-pension</SelectItem>
                    <SelectItem value="full_board">Pension complète</SelectItem>
                    <SelectItem value="all_inclusive">All inclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Input
                  value={ratePlanForm.currency}
                  onChange={(e) => setRatePlanForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                  maxLength={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRatePlanDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitRatePlan}>
                {ratePlanDialogMode === 'edit' ? 'Mettre à jour' : 'Créer le plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog
        open={isBulkEditDialogOpen}
        onOpenChange={(open) => {
          setIsBulkEditDialogOpen(open);
          if (!open && selectedRoom) {
            setBulkForm(buildBulkDefaults());
          }
        }}
      >
        <DialogContent className="flex h-[90vh] w-[90vw] max-w-[90vw] flex-col overflow-hidden p-0">
          <div className="border-b px-6 py-4">
            <DialogTitle className="text-xl font-semibold">Modifications en masse</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Appliquez une période, un tarif et des options de repas à plusieurs plans simultanément.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-4xl space-y-6">
              <div className="grid gap-4 md:grid-cols-[2fr_3fr]">
                <div className="space-y-2">
                  <Label>Période *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bulkDateRange.from && bulkDateRange.to ? (
                          `${format(bulkDateRange.from, 'dd/MM/yyyy')} - ${format(bulkDateRange.to, 'dd/MM/yyyy')}`
                        ) : (
                          <span className="text-muted-foreground">Sélectionner une période</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={bulkDateRange.from ?? new Date()}
                        selected={bulkDateRange}
                        onSelect={(range) =>
                          setBulkForm((prev) => ({ ...prev, range: range ?? prev.range }))
                        }
                        numberOfMonths={2}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Plans tarifaires ciblés *</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {ratePlans.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                        Créez un plan tarifaire pour activer les modifications en masse.
                      </div>
                    ) : (
                      ratePlans.map((plan) => {
                        const checked = bulkForm.planIds.includes(plan.id);
                        return (
                          <label
                            key={plan.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:border-primary/60 ${checked ? 'border-primary bg-primary/5' : 'border-border'}`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) => toggleBulkPlan(plan.id, next === true)}
                            />
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{plan.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {MEAL_PLAN_LABELS[plan.base_meal_plan]} · {plan.currency}
                              </p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom de la saison</Label>
                  <Input
                    value={bulkForm.seasonName}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, seasonName: e.target.value }))}
                    placeholder="ex: Haute saison été"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tarif BB par nuit ({displayCurrencySymbol}) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bulkForm.basePrice}
                    onChange={(e) => {
                      const value = Number.parseFloat(e.target.value);
                      setBulkForm((prev) => ({ ...prev, basePrice: Number.isFinite(value) ? value : 0 }));
                    }}
                    disabled={isBulkSubmitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Séjour minimum (nuits)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bulkForm.minimumStay}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10);
                      setBulkForm((prev) => ({
                        ...prev,
                        minimumStay: Number.isFinite(value) ? Math.max(1, value) : prev.minimumStay,
                      }));
                    }}
                    disabled={isBulkSubmitting}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <Label>Remplacer les saisons existantes</Label>
                    <p className="text-xs text-muted-foreground">
                      Supprime les saisons qui se chevauchent avant d’appliquer les nouvelles valeurs.
                    </p>
                  </div>
                  <Switch
                    checked={bulkForm.overwriteExisting}
                    onCheckedChange={(checked) =>
                      setBulkForm((prev) => ({ ...prev, overwriteExisting: checked === true }))
                    }
                    disabled={isBulkSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Formules de repas</Label>
                  <p className="text-xs text-muted-foreground">
                    Activez les suppléments de repas à appliquer pendant cette période.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{MEAL_PLAN_LABELS.bb}</p>
                        <p className="text-xs text-muted-foreground">Tarif de base (Bed & Breakfast)</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {formatDisplayCurrency(bulkForm.basePrice, displayCurrency)}
                      </Badge>
                    </div>
                  </div>
                  {OPTIONAL_MEAL_PLANS.map((plan) => {
                    const value = bulkForm.mealPlanPricing[plan.value];
                    const enabled = typeof value === 'number' && !Number.isNaN(value);
                    return (
                      <div key={plan.value} className="rounded-md border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{plan.label}</p>
                            <p className="text-xs text-muted-foreground">{plan.description}</p>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => handleBulkMealToggle(plan.value, checked === true)}
                            disabled={isBulkSubmitting}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={enabled ? value ?? '' : ''}
                            onChange={(e) => handleBulkMealChange(plan.value, Number.parseFloat(e.target.value))}
                            placeholder="Tarif par nuit"
                            disabled={!enabled || isBulkSubmitting}
                          />
                          <span className="text-xs text-muted-foreground">{displayCurrencySymbol}/nuit</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t bg-background px-6 py-4">
            <div className="mx-auto flex max-w-4xl justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsBulkEditDialogOpen(false)}
                disabled={isBulkSubmitting}
              >
                Annuler
              </Button>
              <Button onClick={handleBulkApply} disabled={isBulkSubmitting}>
                {isBulkSubmitting ? 'Application…' : 'Appliquer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promotion Dialog */}
      <Dialog
        open={isPromotionDialogOpen}
        onOpenChange={(open) => {
          setIsPromotionDialogOpen(open);
          if (!open) {
            setPromotionPlan(null);
            setEditingPromotion(null);
            setPromotionForm(buildPromotionForm());
          }
        }}
      >
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {promotionDialogMode === 'edit' ? 'Modifier la promotion' : 'Nouvelle promotion'}
            </DialogTitle>
            {promotionPlan && (
              <CardDescription>
                Plan <span className="font-medium text-foreground">{promotionPlan.name}</span>
              </CardDescription>
            )}
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={promotionForm.name}
                  onChange={(e) => handlePromotionFieldChange('name', e.target.value)}
                  placeholder="ex: Early booking -10%"
                />
              </div>
              <div className="space-y-2">
                <Label>Type de promotion *</Label>
                <Select
                  value={promotionForm.type}
                  onValueChange={(value: PromotionRule['type']) =>
                    handlePromotionFieldChange('type', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early_booking">Réservation anticipée</SelectItem>
                    <SelectItem value="last_minute">Offre dernière minute</SelectItem>
                    <SelectItem value="long_stay">Long séjour</SelectItem>
                    <SelectItem value="custom">Personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Remise (%) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={promotionForm.discountPercent}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value);
                    handlePromotionFieldChange(
                      'discountPercent',
                      Number.isFinite(value) ? value : promotionForm.discountPercent
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground">Valeur entre 1 et 100.</p>
              </div>
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <Label>Promotion active</Label>
                  <p className="text-xs text-muted-foreground">Désactivez pour la mettre en pause.</p>
                </div>
                <Switch
                  checked={promotionForm.active}
                  onCheckedChange={(checked) => handlePromotionFieldChange('active', checked === true)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(isLongStayPromotion || promotionForm.type === 'custom') && (
                <div className="space-y-2">
                  <Label>Durée minimum (nuits)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={promotionForm.minNights ?? ''}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10);
                      handlePromotionFieldChange(
                        'minNights',
                        Number.isFinite(value) && value > 0 ? value : null
                      );
                    }}
                    placeholder="Optionnel"
                  />
                </div>
              )}
              {(isEarlyBookingPromotion || promotionForm.type === 'custom') && (
                <div className="space-y-2">
                  <Label> Réservation au moins (jours avant)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={promotionForm.advanceMinDays ?? ''}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10);
                      handlePromotionFieldChange(
                        'advanceMinDays',
                        Number.isFinite(value) && value >= 0 ? value : null
                      );
                    }}
                    placeholder="Optionnel"
                  />
                </div>
              )}
              {(isLastMinutePromotion || promotionForm.type === 'custom') && (
                <div className="space-y-2">
                  <Label>Réservation au plus tard (jours avant)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={promotionForm.advanceMaxDays ?? ''}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10);
                      handlePromotionFieldChange(
                        'advanceMaxDays',
                        Number.isFinite(value) && value >= 0 ? value : null
                      );
                    }}
                    placeholder="Optionnel"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={promotionForm.startDate ?? ''}
                  onChange={(e) =>
                    handlePromotionFieldChange('startDate', e.target.value ? e.target.value : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={promotionForm.endDate ?? ''}
                  onChange={(e) =>
                    handlePromotionFieldChange('endDate', e.target.value ? e.target.value : null)
                  }
                />
              </div>
            </div>

            <div className="rounded-md border border-dashed bg-muted/40 p-4 text-xs text-muted-foreground">
              Combinez type de promotion et conditions pour reproduire les campagnes Booking.com (Early Booker,
              Genius, long séjour…).
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPromotionDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitPromotion}>Sauvegarder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restrictions Dialog */}
      <Dialog
        open={isRestrictionsDialogOpen}
        onOpenChange={(open) => {
          setIsRestrictionsDialogOpen(open);
          if (!open) {
            setRestrictionsSeason(null);
            setRestrictionsPlan(null);
            setRestrictionsForm(buildRestrictionsForm());
          }
        }}
      >
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Restrictions de séjour</DialogTitle>
            <CardDescription>
              Ajustez les règles d&apos;arrivée, de départ et les durées minimales/maximales pour cette saison.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-6">
            {restrictionsPlan && restrictionsSeason && (
              <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                Plan <span className="font-medium text-foreground">{restrictionsPlan.name}</span> · Saison
                <span className="font-medium text-foreground"> {restrictionsSeason.season_name}</span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Séjour minimum (nuits)</Label>
                <Input
                  type="number"
                  min="1"
                  value={restrictionsForm.minimumStay}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value, 10);
                    handleRestrictionsChange('minimumStay', Number.isFinite(value) ? Math.max(1, value) : 1);
                  }}
                  disabled={!restrictionsSeason}
                />
              </div>
              <div className="space-y-2">
                <Label>Séjour maximum (nuits)</Label>
                <Input
                  type="number"
                  min="1"
                  value={restrictionsForm.maximumStay ?? ''}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value, 10);
                    handleRestrictionsChange(
                      'maximumStay',
                      Number.isFinite(value) && value > 0 ? value : null
                    );
                  }}
                  placeholder="Illimité"
                  disabled={!restrictionsSeason}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <Label>Arrivée fermée (CTA)</Label>
                  <p className="text-xs text-muted-foreground">
                    Interdit les arrivées durant cette période.
                  </p>
                </div>
                <Switch
                  checked={restrictionsForm.closedToArrival}
                  onCheckedChange={(checked) => handleRestrictionsChange('closedToArrival', checked === true)}
                  disabled={!restrictionsSeason}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <Label>Départ fermé (CTD)</Label>
                  <p className="text-xs text-muted-foreground">
                    Interdit les départs durant cette période.
                  </p>
                </div>
                <Switch
                  checked={restrictionsForm.closedToDeparture}
                  onCheckedChange={(checked) => handleRestrictionsChange('closedToDeparture', checked === true)}
                  disabled={!restrictionsSeason}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Réservation anticipée minimale (jours)</Label>
                <Input
                  type="number"
                  min="0"
                  value={restrictionsForm.advancePurchaseDays ?? ''}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value, 10);
                    handleRestrictionsChange(
                      'advancePurchaseDays',
                      Number.isFinite(value) && value >= 0 ? value : null
                    );
                  }}
                  placeholder="Aucune"
                  disabled={!restrictionsSeason}
                />
              </div>
              <div className="space-y-2">
                <Label>Cut-off (heures avant arrivée)</Label>
                <Input
                  type="number"
                  min="0"
                  value={restrictionsForm.cutoffHours ?? ''}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value, 10);
                    handleRestrictionsChange('cutoffHours', Number.isFinite(value) && value >= 0 ? value : null);
                  }}
                  placeholder="Aucun"
                  disabled={!restrictionsSeason}
                />
              </div>
            </div>

            <div className="rounded-md border border-dashed bg-muted/40 p-4 text-xs text-muted-foreground">
              Combinez CTA/CTD et durées de séjour pour contrôler précisément l&apos;ouverture des ventes, à la
              manière de Booking.com.
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRestrictionsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitRestrictions} disabled={!restrictionsSeason}>
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Season Dialog */}
      <Dialog
        open={isSeasonDialogOpen}
        onOpenChange={(open) => {
          setIsSeasonDialogOpen(open);
          if (!open && selectedRoom) {
            resetSeasonForm(selectedRoom.base_price_per_night);
          }
        }}
      >
        <DialogContent className="flex h-[95vh] w-[95vw] max-w-[95vw] flex-col overflow-hidden p-0">
          <div className="border-b px-6 py-4">
            <DialogTitle className="text-xl font-semibold">
              {seasonDialogMode === 'edit' ? 'Modifier la saison' : 'Nouvelle saison'}
            </DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Configurez la période, les tarifs et les formules de repas pour ce plan tarifaire.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-4xl space-y-6">
              <div className="space-y-2">
                <Label>Plan tarifaire *</Label>
                <Select
                  value={seasonPlanId}
                  onValueChange={setSeasonPlanId}
                  disabled={!ratePlans.length}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            <div className="space-y-2">
              <Label>Nom de la saison *</Label>
              <Input
                value={seasonForm.season_name}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, season_name: e.target.value }))}
                placeholder="ex: Haute saison"
              />
            </div>

            <div className="space-y-2">
              <Label>Période *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {seasonForm.start_date && seasonForm.end_date ? (
                      `${format(seasonForm.start_date, 'dd/MM/yyyy')} - ${format(seasonForm.end_date, 'dd/MM/yyyy')}`
                    ) : (
                      <span className="text-muted-foreground">Sélectionner une période</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={seasonForm.start_date}
                    selected={rateDateRange}
                    onSelect={(range) => {
                      setSeasonForm((prev) => ({
                        ...prev,
                        start_date: range?.from ?? prev.start_date,
                        end_date: range?.to ?? range?.from ?? prev.end_date,
                      }));
                    }}
                    numberOfMonths={2}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Prix BB par nuit ({activeSeasonCurrencySymbol}) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={seasonForm.base_price}
                  onChange={(e) => setSeasonForm((prev) => ({ ...prev, base_price: Number.parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Séjour minimum (nuits)</Label>
                <Input
                  type="number"
                  min="1"
                  value={seasonForm.minimum_stay}
                  onChange={(e) => setSeasonForm((prev) => ({ ...prev, minimum_stay: Number.parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Formules de repas</Label>
                <p className="text-xs text-muted-foreground">
                  Activez les formules disponibles pendant cette période et définissez leur tarif par nuit.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{MEAL_PLAN_LABELS.bb}</p>
                      <p className="text-xs text-muted-foreground">Tarif de base incluant le petit-déjeuner</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatDisplayCurrency(seasonForm.base_price, activeSeasonCurrency)}
                    </Badge>
                  </div>
                </div>

                {OPTIONAL_MEAL_PLANS.map((plan) => {
                  const value = seasonForm.meal_plan_pricing[plan.value];
                  const enabled = typeof value === 'number' && !Number.isNaN(value);
                  return (
                    <div key={plan.value} className="rounded-md border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{plan.label}</p>
                          <p className="text-xs text-muted-foreground">{plan.description}</p>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) =>
                            setSeasonForm((prev) => ({
                              ...prev,
                              meal_plan_pricing: {
                                ...prev.meal_plan_pricing,
                                [plan.value]: checked
                                  ? prev.meal_plan_pricing[plan.value] ?? prev.base_price
                                  : null,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={enabled ? value ?? '' : ''}
                          onChange={(e) =>
                            setSeasonForm((prev) => ({
                              ...prev,
                              meal_plan_pricing: {
                                ...prev.meal_plan_pricing,
                                [plan.value]: Number.parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                          placeholder="Tarif par nuit"
                          disabled={!enabled}
                        />
                        <span className="text-xs text-muted-foreground">{activeSeasonCurrencySymbol}/nuit</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
          </div>
          <div className="border-t bg-background px-6 py-4">
            <div className="mx-auto flex max-w-4xl justify-end gap-2">
              <Button variant="outline" onClick={() => setIsSeasonDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmitSeason}>
                {seasonDialogMode === 'edit' ? 'Mettre à jour' : 'Créer la saison'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
