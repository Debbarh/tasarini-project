import { apiClient } from '@/integrations/api/client';
import { TripFormData } from '@/types/trip';

export interface UserProfile {
  userId: string;
  preferences: {
    budget: {
      typical: number;
      currency: string;
      flexibility: 'strict' | 'moderate' | 'flexible';
    };
    accommodation: {
      preferredTypes: string[];
      importantAmenities: string[];
      locationPreference: 'center' | 'quiet' | 'transport' | 'budget';
    };
    activities: {
      preferredCategories: string[];
      intensityLevel: 'relaxed' | 'moderate' | 'active' | 'intense';
      culturalInterest: number;
      adventureLevel: number;
    };
    culinary: {
      dietaryRestrictions: string[];
      cuisinePreferences: string[];
      priceRangePreference: string;
      adventurous: boolean;
    };
    travel: {
      preferredTravelStyle: 'luxury' | 'comfort' | 'budget' | 'backpacker';
      planningStyle: 'detailed' | 'flexible' | 'spontaneous';
      groupDynamics: 'solo' | 'couple' | 'family' | 'friends' | 'business';
    };
  };
  behaviorProfile: {
    bookingPatterns: {
      advanceBookingDays: number;
      preferredBookingTimes: string[];
      lastMinuteBooker: boolean;
    };
    searchBehavior: {
      averageSearchTime: number;
      comparisonsBeforeBooking: number;
      priceThreshold: number;
    };
    loyaltyIndicators: {
      repeatDestinations: string[];
      preferredBrands: string[];
      trustsRecommendations: boolean;
    };
  };
  contextualData: {
    currentWeather?: string;
    seasonality: 'spring' | 'summer' | 'autumn' | 'winter';
    localEvents?: string[];
    trendingDestinations?: string[];
  };
  segments: string[];
}

export interface PersonalizationContext {
  userProfile: UserProfile;
  currentTrip: TripFormData;
  weather?: {
    current: string;
    forecast: string[];
  };
  localEvents?: Array<{
    name: string;
    date: string;
    category: string;
  }>;
  trendingNow?: string[];
}

type PreferencesResponse = {
  user_id: string;
  preferences?: UserProfile['preferences'];
  behavior_profile?: UserProfile['behaviorProfile'];
  segments?: string[];
  contextual_data?: UserProfile['contextualData'];
};

export class UserPreferencesService {
  private profileCache: Map<string, UserProfile> = new Map();
  private static readonly CACHE_KEY = 'current';

  async getUserProfile(): Promise<UserProfile | null> {
    if (this.profileCache.has(UserPreferencesService.CACHE_KEY)) {
      return this.profileCache.get(UserPreferencesService.CACHE_KEY)!;
    }

    try {
      const data = await apiClient.get<PreferencesResponse>('user/preferences/');
      const profile: UserProfile = {
        userId: data.user_id || 'current',
        preferences: data.preferences || this.getDefaultPreferences(),
        behaviorProfile: data.behavior_profile || this.getDefaultBehaviorProfile(),
        contextualData: data.contextual_data || (await this.getContextualData()),
        segments: data.segments || ['new_user'],
      };

      await this.enrichWithBookingHistory(profile);
      this.profileCache.set(UserPreferencesService.CACHE_KEY, profile);
      return profile;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil utilisateur:', error);
      return null;
    }
  }

  async updatePreferencesFromTrip(tripData: TripFormData): Promise<void> {
    const profile = await this.getUserProfile();
    if (!profile) return;

    const updatedPreferences = { ...profile.preferences };
    const currentBudget = tripData.budget.dailyBudget;
    updatedPreferences.budget.typical = updatedPreferences.budget.typical * 0.7 + currentBudget * 0.3;

    if (tripData.accommodationPreferences.type.length > 0) {
      updatedPreferences.accommodation.preferredTypes = this.mergePreferences(
        updatedPreferences.accommodation.preferredTypes,
        tripData.accommodationPreferences.type
      );
    }

    if (tripData.culinaryPreferences.cuisineTypes.length > 0) {
      updatedPreferences.culinary.cuisinePreferences = this.mergePreferences(
        updatedPreferences.culinary.cuisinePreferences,
        tripData.culinaryPreferences.cuisineTypes
      );
    }

    if (tripData.activityPreferences.categories.length > 0) {
      updatedPreferences.activities.preferredCategories = this.mergePreferences(
        updatedPreferences.activities.preferredCategories,
        tripData.activityPreferences.categories
      );
    }

    await this.saveProfile({
      ...profile,
      preferences: updatedPreferences,
    });
  }

  async updateUserSegments(newBooking: any): Promise<void> {
    const profile = await this.getUserProfile();
    if (!profile) return;

    const segments = new Set(profile.segments);

    if (newBooking.total_amount > profile.preferences.budget.typical * 1.5) {
      segments.add('premium_spender');
      segments.delete('budget_conscious');
    } else if (newBooking.total_amount < profile.preferences.budget.typical * 0.7) {
      segments.add('budget_conscious');
    }

    const recentBookings = await this.getRecentBookings(90);
    if (recentBookings.length >= 3) {
      segments.add('frequent_traveler');
    }

    const destinations = recentBookings.map(b => b.metadata?.destination).filter(Boolean);
    if (new Set(destinations).size >= 5) {
      segments.add('destination_explorer');
    }

    if (profile.preferences.travel.groupDynamics === 'family') {
      segments.add('family_focused');
    }

    await this.saveProfile({
      ...profile,
      segments: Array.from(segments),
    });
  }

  async getPersonalizedRecommendations(
    items: any[],
    category: 'hotels' | 'flights' | 'restaurants' | 'activities',
    context: PersonalizationContext
  ): Promise<any[]> {
    const { userProfile } = context;

    return items
      .map(item => {
        let personalizedScore = 0;
        const reasons: string[] = [];

        switch (category) {
          case 'hotels':
            personalizedScore = this.scoreHotelPersonalization(item, userProfile, reasons);
            break;
          case 'restaurants':
            personalizedScore = this.scoreRestaurantPersonalization(item, userProfile, reasons);
            break;
          case 'activities':
            personalizedScore = this.scoreActivityPersonalization(item, userProfile, reasons);
            break;
          case 'flights':
            personalizedScore = this.scoreFlightPersonalization(item, userProfile, reasons);
            break;
        }

        personalizedScore += this.getSeasonalBonus(item, userProfile.contextualData.seasonality);

        return {
          ...item,
          personalizedScore,
          personalizationReasons: reasons,
          isPersonalized: personalizedScore > 0.5,
        };
      })
      .sort((a, b) => (b.personalizedScore || 0) - (a.personalizedScore || 0));
  }

  async getContextualSuggestions(
    destination: string,
    dates: { start: Date; end: Date }
  ): Promise<{
    weatherTips: string[];
    localEvents: string[];
    seasonalActivities: string[];
    packingAdvice: string[];
  }> {
    const suggestions = {
      weatherTips: [],
      localEvents: [],
      seasonalActivities: [],
      packingAdvice: [],
    };

    try {
      const weather = await this.getWeatherContext(destination, dates.start);
      if (weather) {
        suggestions.weatherTips = this.generateWeatherTips(weather);
        suggestions.packingAdvice = this.generatePackingAdvice(weather);
      }

      const events = await this.getLocalEvents(destination, dates);
      suggestions.localEvents = events.map(e => e.name);

      const season = this.getSeason(dates.start);
      suggestions.seasonalActivities = this.getSeasonalActivities(destination, season);
    } catch (error) {
      console.warn('Erreur lors des suggestions contextuelles:', error);
    }

    return suggestions;
  }

  private async createDefaultProfile(userId: string): Promise<UserProfile> {
    const profile: UserProfile = {
      userId,
      preferences: this.getDefaultPreferences(),
      behaviorProfile: this.getDefaultBehaviorProfile(),
      contextualData: await this.getContextualData(),
      segments: ['new_user'],
    };
    await this.saveProfile(profile);
    return profile;
  }

  private async saveProfile(profile: UserProfile): Promise<void> {
    try {
      await apiClient.patch('user/preferences/', {
        preferences: profile.preferences,
        behavior_profile: profile.behaviorProfile,
        segments: profile.segments,
        contextual_data: profile.contextualData,
      });
      this.profileCache.set(UserPreferencesService.CACHE_KEY, profile);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil:', error);
      throw error;
    }
  }

  private async getRecentBookings(days: number): Promise<any[]> {
    try {
      const data = await apiClient.get<any[]>('user/bookings/', { days: days.toString() });
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des réservations:', error);
      return [];
    }
  }

  private mergePreferences(existing: string[], newPrefs: string[]): string[] {
    const combined = [...existing, ...newPrefs];
    const counts: Record<string, number> = {};
    combined.forEach(pref => {
      counts[pref] = (counts[pref] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pref]) => pref);
  }

  private getDefaultPreferences(): UserProfile['preferences'] {
    return {
      budget: { typical: 120, currency: 'EUR', flexibility: 'moderate' },
      accommodation: {
        preferredTypes: ['hotel', 'boutique'],
        importantAmenities: ['wifi', 'breakfast', 'pool'],
        locationPreference: 'center',
      },
      activities: {
        preferredCategories: ['culture', 'outdoors'],
        intensityLevel: 'moderate',
        culturalInterest: 4,
        adventureLevel: 3,
      },
      culinary: {
        dietaryRestrictions: [],
        cuisinePreferences: ['local', 'fusion'],
        priceRangePreference: 'mid',
        adventurous: true,
      },
      travel: {
        preferredTravelStyle: 'comfort',
        planningStyle: 'flexible',
        groupDynamics: 'couple',
      },
    };
  }

  private getDefaultBehaviorProfile(): UserProfile['behaviorProfile'] {
    return {
      bookingPatterns: {
        advanceBookingDays: 30,
        preferredBookingTimes: ['evening'],
        lastMinuteBooker: false,
      },
      searchBehavior: {
        averageSearchTime: 45,
        comparisonsBeforeBooking: 5,
        priceThreshold: 150,
      },
      loyaltyIndicators: {
        repeatDestinations: [],
        preferredBrands: [],
        trustsRecommendations: true,
      },
    };
  }

  private async getContextualData(): Promise<UserProfile['contextualData']> {
    return {
      currentWeather: 'sunny',
      seasonality: this.getSeason(new Date()),
      localEvents: [],
      trendingDestinations: [],
    };
  }

  // --- Remaining helper methods (weather, scoring, etc.) stay unchanged ---
  private async getWeatherContext(destination: string, date: Date) {
    return { condition: 'sunny', temperature: 25 };
  }

  private generateWeatherTips(weather: any): string[] {
    if (!weather) return [];
    if (weather.condition === 'rainy') return ['Prévoyez un parapluie'];
    if (weather.condition === 'snowy') return ['Habillez-vous chaudement'];
    return ['Préparez des vêtements légers'];
  }

  private generatePackingAdvice(weather: any): string[] {
    if (!weather) return [];
    if (weather.condition === 'rainy') return ['Manteau imperméable', 'Chaussures étanches'];
    if (weather.condition === 'snowy') return ['Gants', 'Bonnet'];
    return ['Lunettes de soleil', 'Crème solaire'];
  }

  private async getLocalEvents(destination: string, dates: { start: Date; end: Date }) {
    return [
      {
        name: `Événement culturel à ${destination}`,
        date: dates.start.toISOString(),
        category: 'culture',
      },
    ];
  }

  private getSeason(date: Date): UserProfile['contextualData']['seasonality'] {
    const month = date.getMonth() + 1;
    if ([12, 1, 2].includes(month)) return 'winter';
    if ([3, 4, 5].includes(month)) return 'spring';
    if ([6, 7, 8].includes(month)) return 'summer';
    return 'autumn';
  }

  private getSeasonalActivities(destination: string, season: string): string[] {
    switch (season) {
      case 'winter':
        return [`Marchés de Noël à ${destination}`, 'Sports de neige'];
      case 'summer':
        return ['Festivals en plein air', 'Activités nautiques'];
      case 'spring':
        return ['Visite de jardins', 'Randonnées légères'];
      case 'autumn':
        return ['Route des vins', 'Escapades gastronomiques'];
      default:
        return [];
    }
  }

  private scoreHotelPersonalization(item: any, profile: UserProfile, reasons: string[]): number {
    let score = 0;
    if (profile.preferences.accommodation.preferredTypes.includes(item.type)) {
      score += 0.3;
      reasons.push(`Correspond à votre type d'hébergement préféré`);
    }
    const itemAmenities = item.amenities || [];
    const matchingAmenities = profile.preferences.accommodation.importantAmenities.filter(amenity =>
      itemAmenities.includes(amenity)
    );
    if (matchingAmenities.length > 0) {
      score += 0.2 * (matchingAmenities.length / profile.preferences.accommodation.importantAmenities.length);
      reasons.push(`Inclut ${matchingAmenities.length} équipement(s) important(s) pour vous`);
    }
    return Math.min(score, 1);
  }

  private scoreRestaurantPersonalization(item: any, profile: UserProfile, reasons: string[]): number {
    let score = 0;
    if (profile.preferences.culinary.cuisinePreferences.includes(item.cuisine)) {
      score += 0.4;
      reasons.push(`Cuisine ${item.cuisine} que vous appréciez`);
    }
    if (item.priceRange === profile.preferences.culinary.priceRangePreference) {
      score += 0.3;
      reasons.push(`Dans votre gamme de prix habituelle`);
    }
    return Math.min(score, 1);
  }

  private scoreActivityPersonalization(item: any, profile: UserProfile, reasons: string[]): number {
    let score = 0;
    if (profile.preferences.activities.preferredCategories.includes(item.category)) {
      score += 0.4;
      reasons.push(`${item.category} fait partie de vos intérêts`);
    }
    if (item.intensity === profile.preferences.activities.intensityLevel) {
      score += 0.3;
      reasons.push(`Niveau d'activité qui vous convient`);
    }
    return Math.min(score, 1);
  }

  private scoreFlightPersonalization(item: any, profile: UserProfile, reasons: string[]): number {
    let score = 0;
    const prefersDirect = profile.preferences.travel.preferredTravelStyle === 'luxury';
    if (prefersDirect && item.stops === 0) {
      score += 0.5;
      reasons.push(`Vol direct selon vos préférences`);
    } else if (!prefersDirect && item.stops > 0) {
      score += 0.3;
      reasons.push(`Bon rapport qualité-prix avec escale`);
    }
    return Math.min(score, 1);
  }

  private getSeasonalBonus(item: any, season: string): number {
    if (season === 'summer' && item.category === 'activities') return 0.1;
    if (season === 'winter' && item.category === 'accommodation') return 0.05;
    return 0;
  }

  private async enrichWithBookingHistory(profile: UserProfile): Promise<void> {
    try {
      const bookings = await this.getRecentBookings(365);
      if (!bookings.length) {
        return;
      }

      const budgets = bookings
        .map(booking => booking.total_amount)
        .filter((amount: number | null | undefined): amount is number => typeof amount === 'number');
      if (budgets.length > 0) {
        const avgBudget = budgets.reduce((acc, amount) => acc + amount, 0) / budgets.length;
        profile.preferences.budget.typical = avgBudget;
      }

      const destinations = bookings
        .map((booking: any) => booking.metadata?.destination)
        .filter(Boolean);
      profile.behaviorProfile.loyaltyIndicators.repeatDestinations = [...new Set(destinations as string[])];
    } catch (error) {
      console.warn('Erreur lors de l\'enrichissement du profil avec les réservations:', error);
    }
  }
}

export const userPreferencesService = new UserPreferencesService();
