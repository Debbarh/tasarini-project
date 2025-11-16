import type { OpeningHoursData } from '@/types/opening-hours';
import { formatOpeningHours } from '@/utils/openingHoursUtils';

interface NormalizedOpeningHours {
  openingHoursText: string;
  openingHoursStructured: OpeningHoursData | null;
}

const isOpeningHoursObject = (value: unknown): value is OpeningHoursData => {
  return !!value && typeof value === 'object' && 'regular_hours' in (value as Record<string, unknown>);
};

export const normalizeOpeningHoursForForm = (
  rawStructured: unknown,
  rawLegacy: unknown
): NormalizedOpeningHours => {
  let structured: OpeningHoursData | null = null;

  const parseStructured = (candidate: unknown) => {
    if (!candidate) return;
    if (typeof candidate === 'string') {
      try {
        const parsed = JSON.parse(candidate);
        if (isOpeningHoursObject(parsed)) {
          structured = parsed;
        }
      } catch (error) {
        console.warn('Could not parse opening hours string:', error);
      }
      return;
    }

    if (isOpeningHoursObject(candidate)) {
      structured = candidate;
    }
  };

  parseStructured(rawStructured);

  if (!structured) {
    parseStructured(rawLegacy);
  }

  let legacyText = '';

  if (structured?.regular_hours) {
    try {
      legacyText = formatOpeningHours(structured, 'compact');
    } catch (error) {
      console.error('Error formatting opening hours:', error);
    }
  }

  if (!legacyText && typeof rawLegacy === 'string') {
    legacyText = rawLegacy;
  }

  if (!legacyText && structured?.legacy_text) {
    legacyText = structured.legacy_text;
  }

  return {
    openingHoursText: legacyText,
    openingHoursStructured: structured && structured.regular_hours ? structured : null,
  };
};
