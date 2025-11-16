import { AmadeusHotelOffer, AmadeusFlightOffer, AmadeusHotelDetails } from './amadeusService';
import { searchCityImages, UnsplashImage } from '@/utils/unsplashService';
import { cacheService } from './cacheService';

export interface EnhancedAmadeusHotel extends AmadeusHotelOffer {
  isTestData: boolean;
  enhancedImages: string[];
  enhancedDescription: string;
  testDataBadge: boolean;
  fallbackImageUsed: boolean;
}

export interface EnhancedAmadeusDetails extends AmadeusHotelDetails {
  isTestData: boolean;
  enhancedPolicies: {
    checkIn: string;
    checkOut: string;
    cancellation: string;
    childPolicy: string;
    petPolicy: string;
  };
}

export interface TestApiConfig {
  enableImageEnhancement: boolean;
  enableDataEnrichment: boolean;
  showTestBadges: boolean;
  mockBookingUrls: boolean;
  enableCaching: boolean;
}

class AmadeusTestEnhancer {
  private config: TestApiConfig = {
    enableImageEnhancement: true,
    enableDataEnrichment: true,
    showTestBadges: true,
    mockBookingUrls: true,
    enableCaching: true,
  };

  private defaultHotelImages = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
  ];

  private testDataIndicators = {
    hotel: '🧪 Données de test',
    flight: '✈️ Vol de démonstration', 
    activity: '🎯 Activité simulée',
    restaurant: '🍽️ Restaurant test'
  };

  updateConfig(newConfig: Partial<TestApiConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  async enhanceHotelOffers(hotels: AmadeusHotelOffer[]): Promise<EnhancedAmadeusHotel[]> {
    const enhanced = await Promise.all(
      hotels.map(hotel => this.enhanceHotelOffer(hotel))
    );
    
    return enhanced;
  }

  async enhanceHotelOffer(hotel: AmadeusHotelOffer): Promise<EnhancedAmadeusHotel> {
    const cacheKey = `enhanced_hotel_${hotel.id}`;
    
    if (this.config.enableCaching) {
      const cached = cacheService.get<EnhancedAmadeusHotel>(cacheKey);
      if (cached) return cached;
    }

    let enhancedImages = [...hotel.images];
    let fallbackImageUsed = false;

    // Enrichir les images si manquantes ou insuffisantes
    if (this.config.enableImageEnhancement && enhancedImages.length < 3) {
      try {
        const cityImages = await searchCityImages(hotel.location.city, 3);
        const unsplashUrls = cityImages.map(img => img.url);
        
        // Ajouter les images Unsplash si on n'en a pas assez
        if (enhancedImages.length === 0) {
          enhancedImages = unsplashUrls.length > 0 ? unsplashUrls : this.defaultHotelImages;
          fallbackImageUsed = unsplashUrls.length === 0;
        } else {
          // Compléter avec Unsplash
          const needed = 3 - enhancedImages.length;
          enhancedImages.push(...unsplashUrls.slice(0, needed));
        }
      } catch (error) {
        console.error('Error enhancing images:', error);
        enhancedImages = enhancedImages.length > 0 ? enhancedImages : this.defaultHotelImages;
        fallbackImageUsed = true;
      }
    }

    // Enrichir la description
    let enhancedDescription = hotel.description || '';
    if (this.config.enableDataEnrichment && !enhancedDescription) {
      enhancedDescription = this.generateRealisticDescription(hotel);
    }

    // Générer URL de réservation de test
    let bookingUrl = hotel.bookingUrl;
    if (this.config.mockBookingUrls && !bookingUrl) {
      bookingUrl = this.generateTestBookingUrl(hotel);
    }

    const enhanced: EnhancedAmadeusHotel = {
      ...hotel,
      enhancedImages,
      enhancedDescription,
      bookingUrl,
      isTestData: true,
      testDataBadge: this.config.showTestBadges,
      fallbackImageUsed,
      // Enrichir les équipements si trop peu
      amenities: this.enrichAmenities(hotel.amenities),
    };

    if (this.config.enableCaching) {
      cacheService.set(cacheKey, enhanced, { ttl: 3600000 }); // 1 heure
    }

    return enhanced;
  }

  async enhanceHotelDetails(details: AmadeusHotelDetails): Promise<EnhancedAmadeusDetails> {
    const enhancedPolicies = {
      ...details.policies,
      childPolicy: details.policies.cancellation || "Enfants de moins de 12 ans : gratuits dans le lit des parents",
      petPolicy: "Animaux non acceptés (données de test)"
    };

    return {
      ...details,
      isTestData: true,
      enhancedPolicies,
      description: details.description || this.generateRealisticDescription(details as any),
    };
  }

  private generateRealisticDescription(hotel: AmadeusHotelOffer): string {
    const templates = [
      `Situé au cœur de ${hotel.location.city}, cet établissement ${hotel.rating ? `${hotel.rating} étoiles` : 'de qualité'} offre un séjour confortable avec des équipements modernes.`,
      `Découvrez le charme de ${hotel.location.city} depuis cet hôtel bien situé, parfait pour les voyageurs d'affaires et de loisirs.`,
      `Un établissement accueillant à ${hotel.location.city}, alliant confort moderne et service personnalisé pour un séjour mémorable.`,
    ];
    
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    return `${randomTemplate} (Description générée - données de test)`;
  }

  private generateTestBookingUrl(hotel: AmadeusHotelOffer): string {
    // URL de test Amadeus avec paramètres
    const params = new URLSearchParams({
      hotelId: hotel.hotelId,
      checkIn: hotel.checkInDate,
      checkOut: hotel.checkOutDate,
      test: 'true',
      source: 'tasarini-travel'
    });
    
    return `https://test.amadeus.com/booking/hotels?${params.toString()}`;
  }

  private enrichAmenities(amenities: string[]): string[] {
    const defaultAmenities = [
      'WiFi gratuit',
      'Parking',
      'Climatisation',
      'Room service',
      'Réception 24h/24',
      'Petit-déjeuner',
      'Salle de fitness',
      'Spa',
      'Restaurant',
      'Bar'
    ];

    if (amenities.length < 3) {
      // Ajouter des équipements réalistes aléatoires
      const randomAmenities = defaultAmenities
        .filter(amenity => !amenities.includes(amenity))
        .sort(() => Math.random() - 0.5)
        .slice(0, 5 - amenities.length);
      
      return [...amenities, ...randomAmenities];
    }

    return amenities;
  }

  generateTestFlightUrl(flight: AmadeusFlightOffer): string {
    const params = new URLSearchParams({
      offerId: flight.id,
      test: 'true',
      source: 'tasarini-travel'
    });
    
    return `https://test.amadeus.com/booking/flights?${params.toString()}`;
  }

  getTestDataBadge(type: keyof typeof this.testDataIndicators): string {
    return this.testDataIndicators[type];
  }

  // Méthodes pour la gestion des quotas de test
  async trackApiUsage(endpoint: string, params: any) {
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `amadeus_usage_${today}_${endpoint}`;
    
    const currentUsage = cacheService.get<number>(usageKey) || 0;
    cacheService.set(usageKey, currentUsage + 1, { ttl: 86400000 }); // 24 heures
    
    // Log pour monitoring
    
    return currentUsage + 1;
  }

  getUsageStats(): Record<string, number> {
    const today = new Date().toISOString().split('T')[0];
    const endpoints = ['hotel-search', 'hotel-details', 'flight-search', 'city-search'];
    
    const stats: Record<string, number> = {};
    endpoints.forEach(endpoint => {
      const usageKey = `amadeus_usage_${today}_${endpoint}`;
      stats[endpoint] = cacheService.get<number>(usageKey) || 0;
    });
    
    return stats;
  }

  // Simuler des données enrichies pour la production future
  simulateProductionData(hotels: AmadeusHotelOffer[]): AmadeusHotelOffer[] {
    return hotels.map(hotel => ({
      ...hotel,
      // Ajouter des données simulées qui seraient disponibles en production
      roomType: hotel.roomType || 'Chambre Standard',
      images: hotel.images.length > 0 ? hotel.images : this.defaultHotelImages,
      amenities: this.enrichAmenities(hotel.amenities),
      description: hotel.description || this.generateRealisticDescription(hotel),
    }));
  }
}

export const amadeusTestEnhancer = new AmadeusTestEnhancer();