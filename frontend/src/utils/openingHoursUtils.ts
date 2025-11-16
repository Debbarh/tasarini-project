import { 
  OpeningHoursData, 
  WeeklySchedule, 
  DaySchedule, 
  TimeSlot, 
  DayOfWeek,
  DAY_LABELS_FR,
  DAY_LABELS_SHORT_FR,
  TimeValidationResult,
  DayValidationResult
} from '@/types/opening-hours';

/**
 * Create empty opening hours structure
 */
export const createEmptyOpeningHours = (): OpeningHoursData => ({
  regular_hours: {
    monday: "closed",
    tuesday: "closed",
    wednesday: "closed",
    thursday: "closed",
    friday: "closed",
    saturday: "closed",
    sunday: "closed"
  },
  timezone: "Europe/Paris"
});

/**
 * Validate a time string (HH:MM format)
 */
export const validateTimeString = (time: string): TimeValidationResult => {
  if (!time) {
    return { isValid: false, error: "L'heure est requise" };
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return { isValid: false, error: "Format invalide (HH:MM attendu)" };
  }

  return { isValid: true };
};

/**
 * Validate a time slot
 */
export const validateTimeSlot = (slot: TimeSlot): TimeValidationResult => {
  const startValidation = validateTimeString(slot.start);
  if (!startValidation.isValid) {
    return { isValid: false, error: `Heure de début: ${startValidation.error}` };
  }

  const endValidation = validateTimeString(slot.end);
  if (!endValidation.isValid) {
    return { isValid: false, error: `Heure de fin: ${endValidation.error}` };
  }

  // Convert to minutes for comparison
  const startMinutes = timeToMinutes(slot.start);
  const endMinutes = timeToMinutes(slot.end);

  if (endMinutes <= startMinutes) {
    return { isValid: false, error: "L'heure de fin doit être après l'heure de début" };
  }

  return { isValid: true };
};

/**
 * Convert time string to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Validate a day's schedule
 */
export const validateDaySchedule = (schedule: DaySchedule): DayValidationResult => {
  const result: DayValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (schedule === "closed" || schedule === "legacy") {
    return result;
  }

  if (!Array.isArray(schedule) || schedule.length === 0) {
    result.isValid = false;
    result.errors.push("Au moins un créneau horaire est requis");
    return result;
  }

  // Validate each time slot
  for (let i = 0; i < schedule.length; i++) {
    const slotValidation = validateTimeSlot(schedule[i]);
    if (!slotValidation.isValid) {
      result.isValid = false;
      result.errors.push(`Créneau ${i + 1}: ${slotValidation.error}`);
    }
  }

  // Check for overlapping slots
  if (schedule.length > 1) {
    const sortedSlots = [...schedule].sort((a, b) => 
      timeToMinutes(a.start) - timeToMinutes(b.start)
    );

    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const current = sortedSlots[i];
      const next = sortedSlots[i + 1];
      
      if (timeToMinutes(current.end) > timeToMinutes(next.start)) {
        result.isValid = false;
        result.errors.push("Les créneaux horaires ne peuvent pas se chevaucher");
        break;
      }
    }
  }

  // Add warnings for unusual hours
  for (const slot of schedule) {
    const startMinutes = timeToMinutes(slot.start);
    const endMinutes = timeToMinutes(slot.end);

    if (startMinutes < 360) { // Before 6:00 AM
      result.warnings.push("Ouverture très matinale détectée");
    }

    if (endMinutes > 1440) { // After midnight
      result.warnings.push("Fermeture après minuit détectée");
    }

    const duration = endMinutes - startMinutes;
    if (duration > 720) { // More than 12 hours
      result.warnings.push("Créneau de plus de 12h détecté");
    }
  }

  return result;
};

/**
 * Format opening hours for display
 */
export const formatOpeningHours = (
  data: OpeningHoursData, 
  format: 'compact' | 'detailed' = 'compact'
): string => {
  if (data.migrated && data.legacy_text) {
    return data.legacy_text;
  }

  const { regular_hours } = data;
  const formattedDays: string[] = [];

  // Group consecutive days with same hours
  const dayGroups: { days: DayOfWeek[]; schedule: DaySchedule }[] = [];
  let currentGroup: { days: DayOfWeek[]; schedule: DaySchedule } | null = null;

  for (const day of Object.keys(regular_hours) as DayOfWeek[]) {
    const schedule = regular_hours[day];
    
    if (!currentGroup || !isScheduleEqual(currentGroup.schedule, schedule)) {
      if (currentGroup) {
        dayGroups.push(currentGroup);
      }
      currentGroup = { days: [day], schedule };
    } else {
      currentGroup.days.push(day);
    }
  }
  
  if (currentGroup) {
    dayGroups.push(currentGroup);
  }

  // Format each group
  for (const group of dayGroups) {
    const dayRange = formatDayRange(group.days);
    const scheduleText = formatDaySchedule(group.schedule);
    formattedDays.push(`${dayRange}: ${scheduleText}`);
  }

  return formattedDays.join(format === 'compact' ? ', ' : '\n');
};

/**
 * Check if two schedules are equal
 */
const isScheduleEqual = (schedule1: DaySchedule, schedule2: DaySchedule): boolean => {
  if (schedule1 === schedule2) return true;
  
  if (Array.isArray(schedule1) && Array.isArray(schedule2)) {
    if (schedule1.length !== schedule2.length) return false;
    
    return schedule1.every((slot1, index) => {
      const slot2 = schedule2[index];
      return slot1.start === slot2.start && slot1.end === slot2.end;
    });
  }
  
  return false;
};

/**
 * Format day range (e.g., "Lun-Ven", "Sam", "Lun, Mer, Ven")
 */
const formatDayRange = (days: DayOfWeek[]): string => {
  if (days.length === 1) {
    return DAY_LABELS_SHORT_FR[days[0]];
  }

  // Check if it's a continuous range
  const dayOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayIndices = days.map(day => dayOrder.indexOf(day)).sort((a, b) => a - b);
  
  const isContinuous = dayIndices.every((index, i) => 
    i === 0 || index === dayIndices[i - 1] + 1
  );

  if (isContinuous && days.length > 2) {
    const firstDay = dayOrder[dayIndices[0]];
    const lastDay = dayOrder[dayIndices[dayIndices.length - 1]];
    return `${DAY_LABELS_SHORT_FR[firstDay]}-${DAY_LABELS_SHORT_FR[lastDay]}`;
  }

  return days.map(day => DAY_LABELS_SHORT_FR[day]).join(', ');
};

/**
 * Format a day's schedule
 */
const formatDaySchedule = (schedule: DaySchedule): string => {
  if (schedule === "closed") {
    return "Fermé";
  }

  if (schedule === "legacy") {
    return "Voir détails";
  }

  if (!Array.isArray(schedule)) {
    return "Non défini";
  }

  return schedule.map(slot => `${slot.start}-${slot.end}`).join(', ');
};

/**
 * Check if opening hours have any content
 */
export const hasOpeningHours = (data: OpeningHoursData | null | undefined): boolean => {
  if (!data) return false;
  
  if (data.migrated && data.legacy_text && data.legacy_text.trim()) {
    return true;
  }

  const { regular_hours } = data;
  return Object.values(regular_hours).some(schedule => 
    schedule !== "closed" && Array.isArray(schedule) && schedule.length > 0
  );
};

/**
 * Get suggested time slots based on POI type
 */
export const getSuggestedHours = (poiType?: string): TimeSlot[] => {
  switch (poiType) {
    case 'restaurant':
      return [
        { start: '12:00', end: '14:00' },
        { start: '19:00', end: '22:00' }
      ];
    case 'commerce':
      return [{ start: '09:00', end: '19:00' }];
    case 'museum':
      return [{ start: '10:00', end: '18:00' }];
    case 'accommodation':
      return [{ start: '00:00', end: '23:59' }];
    default:
      return [{ start: '09:00', end: '18:00' }];
  }
};