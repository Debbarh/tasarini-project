export interface Destination {
  country: string;
  city: string;
  latitude?: number;
  longitude?: number;
  duration: number; // nombre de jours
  isTransit?: boolean;
  startDate?: Date;
  endDate?: Date;
  dateMode?: 'duration' | 'dates'; // Mode de sélection
}

export interface TravelGroup {
  type: string; // Maintenant utilise le code depuis la base de données
  subtype?: string; // Sous-type optionnel
  size: number;
  children?: {
    count: number;
    ages: number[];
  };
  groupDetails?: {
    size: number;
    groupType: string;
  };
}

export interface Budget {
  level: string; // Maintenant utilise les codes depuis la base de données
  dailyBudget: number;
  currency: string; // Maintenant utilise les codes depuis la base de données
  flexibility: string; // Maintenant utilise les codes depuis la base de données
}

export interface CulinaryPreferences {
  dietaryRestrictions: string[];
  cuisineTypes: string[];
  restaurantCategories: string[];
  foodAdventure: 'conservative' | 'moderate' | 'adventurous';
  alcoholConsumption: boolean;
}

export interface AccommodationPreferences {
  type: string[];
  amenities: string[];
  location: string[];
  accessibility: string[];
  security: string[];
  ambiance: string[];
}

export interface ActivityPreferences {
  categories: string[];
  intensity: 'relaxed' | 'moderate' | 'active' | 'intense';
  interests: string[];
  avoidances: string[];
}

export interface TripFormData {
  destinations: Destination[];
  startDate: Date;
  endDate: Date;
  travelGroup: TravelGroup;
  budget: Budget;
  culinaryPreferences: CulinaryPreferences;
  accommodationPreferences: AccommodationPreferences;
  activityPreferences: ActivityPreferences;
  specialRequests: string;
}

export interface DailyActivity {
  id: string;
  time: string;
  endTime?: string;
  title: string;
  description: string;
  duration: string;
  location?: {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  } | string;
  type: string;
  cost: number;
  difficulty?: 'easy' | 'moderate' | 'hard';
  tips?: string;
  bookingAdvice?: string;
  alternatives?: string[];
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  destination?: string;
  theme: string;
  activities: DailyActivity[];
  dailyBudget?: number;
  transportation?: string;
  meals?: {
    breakfast?: DailyActivity;
    lunch?: DailyActivity;
    dinner?: DailyActivity;
  };
  totalCost?: number;
  walkingDistance?: number;
}

export interface UnsplashImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  description: string;
  photographer: string;
  photographerUrl: string;
}

export interface DetailedItinerary {
  title?: string;
  description?: string;
  totalBudget?: number;
  budgetBreakdown?: {
    accommodation: number;
    food: number;
    activities: number;
    transport: number;
  };
  practicalTips?: string[];
  trip: TripFormData;
  days: DayItinerary[];
  totalCost: number;
  practicalInfo: PracticalInfo;
  recommendations: Recommendations;
  destinationImages?: { [cityName: string]: UnsplashImage[] };
}

export interface PracticalInfo {
  destinations: {
    [key: string]: {
      visa: string;
      health: string[];
      currency: string;
      language: string[];
      emergency: string;
      climate: string;
      customs: string[];
    };
  };
}

export interface Recommendations {
  mustTryDishes: { [destination: string]: string[] };
  giftIdeas: { [destination: string]: string[] };
  similarDestinations: string[];
  packingList: string[];
  culturalTips: { [destination: string]: string[] };
  bestTimeToVisit: { [destination: string]: string };
  localEvents: { [destination: string]: string[] };
  transportation: { [destination: string]: string };
  safety: { [destination: string]: string[] };
  budget: { [destination: string]: string };
}