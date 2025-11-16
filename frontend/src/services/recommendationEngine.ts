import { TripFormData } from '@/types/trip';
import { bookingService } from './bookingService';
import { userPreferencesService } from './userPreferencesService';

export interface RecommendationScore {
  budgetScore: number;  // 40%
  ratingScore: number;  // 30%
  proximityScore: number; // 20%
  availabilityScore: number; // 10%
  totalScore: number;
  badge?: 'recommended' | 'best_price' | 'top_rated' | 'partner_choice';
}

export interface ScoredItem {
  originalItem: any;
  score: RecommendationScore;
  rank: number;
}

export interface RecommendationUserProfile {
  userId: string;
  budgetHistory: number[];
  preferredCategories: string[];
  averageRating: number;
  bookingHistory: string[];
  lastPreferences?: TripFormData;
}

export class RecommendationEngine {
  private userProfiles: Map<string, RecommendationUserProfile> = new Map();

  /**
   * Score et classe les recommandations par catégorie
   */
  async scoreRecommendations(
    items: any[],
    category: 'hotels' | 'flights' | 'restaurants' | 'activities',
    tripData: TripFormData,
    userLocation?: { lat: number; lng: number }
  ): Promise<ScoredItem[]> {
    if (!items?.length) return [];

    const userProfile = await this.getUserProfile(tripData);
    const scoredItems: ScoredItem[] = [];

    for (const item of items) {
      const score = this.calculateItemScore(item, category, tripData, userProfile, userLocation);
      scoredItems.push({
        originalItem: item,
        score,
        rank: 0 // Will be set after sorting
      });
    }

    // Trier par score décroissant
    scoredItems.sort((a, b) => b.score.totalScore - a.score.totalScore);

    // Assigner les rangs et badges
    scoredItems.forEach((item, index) => {
      item.rank = index + 1;
      
      // Attribution des badges
      if (index === 0) {
        item.score.badge = 'recommended';
      } else if (this.isBestPrice(item, scoredItems, category)) {
        item.score.badge = 'best_price';
      } else if (item.score.ratingScore >= 0.9) {
        item.score.badge = 'top_rated';
      } else if (item.originalItem.source === 'internal' || item.originalItem.isPartner) {
        item.score.badge = 'partner_choice';
      }
    });

    // Retourner les 3 meilleurs
    return scoredItems.slice(0, 3);
  }

  /**
   * Calcule le score d'un item selon les critères pondérés
   */
  private calculateItemScore(
    item: any,
    category: string,
    tripData: TripFormData,
    userProfile: UserProfile,
    userLocation?: { lat: number; lng: number }
  ): RecommendationScore {
    const budgetScore = this.calculateBudgetScore(item, tripData, userProfile) * 0.4;
    const ratingScore = this.calculateRatingScore(item) * 0.3;
    const proximityScore = this.calculateProximityScore(item, userLocation) * 0.2;
    const availabilityScore = this.calculateAvailabilityScore(item, category) * 0.1;

    // Bonus pour les partenaires internes
    const partnerBonus = (item.source === 'internal' || item.isPartner) ? 0.05 : 0;

    const totalScore = Math.min(budgetScore + ratingScore + proximityScore + availabilityScore + partnerBonus, 1);

    return {
      budgetScore: budgetScore / 0.4, // Normaliser pour affichage
      ratingScore: ratingScore / 0.3,
      proximityScore: proximityScore / 0.2,
      availabilityScore: availabilityScore / 0.1,
      totalScore
    };
  }

  /**
   * Score basé sur l'adéquation avec le budget
   */
  private calculateBudgetScore(item: any, tripData: TripFormData, userProfile: UserProfile): number {
    const itemPrice = this.extractPrice(item);
    if (!itemPrice) return 0.5; // Score neutre si pas de prix

    const userBudget = tripData.budget.dailyBudget;
    const historicalBudget = userProfile.budgetHistory.length > 0 
      ? userProfile.budgetHistory.reduce((a, b) => a + b) / userProfile.budgetHistory.length
      : userBudget;

    const targetBudget = (userBudget + historicalBudget) / 2;
    
    // Score optimal si le prix est entre 80% et 120% du budget cible
    const optimalMin = targetBudget * 0.8;
    const optimalMax = targetBudget * 1.2;

    if (itemPrice >= optimalMin && itemPrice <= optimalMax) {
      return 1;
    } else if (itemPrice < optimalMin) {
      // Moins cher = bon mais pas optimal
      return 0.7 + (itemPrice / optimalMin) * 0.3;
    } else {
      // Plus cher = pénalité progressive
      return Math.max(0, 1 - (itemPrice - optimalMax) / targetBudget);
    }
  }

  /**
   * Score basé sur les ratings/avis
   */
  private calculateRatingScore(item: any): number {
    const rating = item.rating || item.score || 0;
    const maxRating = 5;
    
    // Normaliser sur une échelle 0-1
    const normalizedRating = Math.min(rating / maxRating, 1);
    
    // Bonus pour nombre d'avis élevé
    const reviewCount = item.reviewCount || item.reviews || 0;
    const reviewBonus = Math.min(reviewCount / 100, 0.1); // Jusqu'à 10% de bonus
    
    return Math.min(normalizedRating + reviewBonus, 1);
  }

  /**
   * Score basé sur la proximité géographique
   */
  private calculateProximityScore(item: any, userLocation?: { lat: number; lng: number }): number {
    if (!userLocation || !item.location) return 0.5; // Score neutre

    const itemLat = item.location.latitude || item.latitude || 0;
    const itemLng = item.location.longitude || item.longitude || 0;

    if (!itemLat || !itemLng) return 0.5;

    const distance = this.calculateDistance(
      userLocation.lat, userLocation.lng,
      itemLat, itemLng
    );

    // Score optimal pour distance < 5km, décroissant jusqu'à 50km
    if (distance <= 5) return 1;
    if (distance >= 50) return 0;
    
    return 1 - (distance - 5) / 45;
  }

  /**
   * Score basé sur la disponibilité
   */
  private calculateAvailabilityScore(item: any, category: string): number {
    // Logique spécifique par catégorie
    switch (category) {
      case 'hotels':
        return item.availability !== false ? 1 : 0.3;
      
      case 'flights':
        return item.available !== false ? 1 : 0.2;
      
      case 'restaurants':
        // Bonus si réservation possible
        return item.bookingAvailable ? 1 : 0.7;
      
      case 'activities':
        // Bonus si pas de réservation obligatoire
        return item.bookingRequired ? 0.7 : 1;
      
      default:
        return 0.8;
    }
  }

  /**
   * Vérifie si un item a le meilleur prix
   */
  private isBestPrice(item: ScoredItem, allItems: ScoredItem[], category: string): boolean {
    const prices = allItems
      .map(i => this.extractPrice(i.originalItem))
      .filter(p => p > 0)
      .sort((a, b) => a - b);
    
    if (prices.length === 0) return false;
    
    const itemPrice = this.extractPrice(item.originalItem);
    return itemPrice === prices[0];
  }

  /**
   * Extrait le prix d'un item de manière normalisée
   */
  private extractPrice(item: any): number {
    if (item.price?.amount) return Number(item.price.amount);
    if (item.cost) return Number(item.cost);
    if (item.pricePerNight) return Number(item.pricePerNight);
    if (typeof item.price === 'number') return item.price;
    return 0;
  }

  /**
   * Calcule la distance entre deux points géographiques
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Récupère ou crée le profil utilisateur
   */
  private async getUserProfile(tripData: TripFormData): Promise<UserProfile> {
    const preferenceProfile = await userPreferencesService.getUserProfile();
    const userId = preferenceProfile?.userId || 'anonymous';

    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    // Créer un profil basique ou le récupérer depuis la DB
    const profile: RecommendationUserProfile = {
      userId,
      budgetHistory: [tripData.budget.dailyBudget],
      preferredCategories: [],
      averageRating: 4.0,
      bookingHistory: [],
      lastPreferences: tripData
    };

    // TODO: Récupérer l'historique réel depuis la base de données
    await this.loadUserHistory(profile);

    this.userProfiles.set(userId, profile);
    return profile;
  }

  /**
   * Charge l'historique utilisateur depuis la base de données
   */
  private async loadUserHistory(profile: RecommendationUserProfile): Promise<void> {
    try {
      const bookings = await bookingService.listReservations({ scope: 'user' });

      if (bookings?.length) {
        profile.budgetHistory = bookings
          .map(b => parseFloat(b.total_amount))
          .filter(amount => amount > 0);
        
        profile.bookingHistory = bookings.map(b => b.room_detail?.tourist_point ?? 'unknown');
        
        // Extraire les catégories préférées
        const categoryCount: { [key: string]: number } = {};
        bookings.forEach(b => {
          const category = b.room_detail?.tourist_point ?? 'inconnu';
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
        
        profile.preferredCategories = Object.entries(categoryCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([category]) => category);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de l\'historique utilisateur:', error);
    }
  }

  /**
   * Met à jour le profil utilisateur après une réservation
   */
  async updateUserProfile(userId: string, booking: any): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    // Ajouter à l'historique
    profile.budgetHistory.push(booking.total_amount);
    profile.bookingHistory.push(booking.booking_type);

    // Garder seulement les 10 dernières entrées
    if (profile.budgetHistory.length > 10) {
      profile.budgetHistory = profile.budgetHistory.slice(-10);
    }
    if (profile.bookingHistory.length > 10) {
      profile.bookingHistory = profile.bookingHistory.slice(-10);
    }

    // Recalculer les catégories préférées
    const categoryCount: { [key: string]: number } = {};
    profile.bookingHistory.forEach(type => {
      categoryCount[type] = (categoryCount[type] || 0) + 1;
    });
    
    profile.preferredCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }
}

export const recommendationEngine = new RecommendationEngine();
