const STORAGE_KEY = 'pendingPartnerData';

export type PartnerOnboardingDraft = {
  companyName?: string;
  contactPhone?: string;
  businessType?: string;
  email?: string;
  description?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

export const partnerOnboardingStorage = {
  save(draft: PartnerOnboardingDraft) {
    try {
      const existing = partnerOnboardingStorage.load();
      const next = {
        ...existing,
        ...draft,
        socialMedia: {
          ...(existing.socialMedia || {}),
          ...(draft.socialMedia || {}),
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Unable to persist partner onboarding draft', error);
    }
  },

  load(): PartnerOnboardingDraft {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (error) {
      console.error('Unable to read partner onboarding draft', error);
      return {};
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Unable to clear partner onboarding draft', error);
    }
  },
};
