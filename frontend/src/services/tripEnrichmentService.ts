import { amadeusService } from './amadeusService';
import { hotelBedsService } from './hotelBedsService';
import { externalRestaurantService } from './externalRestaurantService';
import { externalActivityService } from './externalActivityService';
import { DetailedItinerary, TripFormData, ActivityPreferences } from '@/types/trip';
import { recommendationEngine } from './recommendationEngine';
import { cacheService } from './cacheService';
import { bookingAnalytics } from './bookingAnalytics';
import { userPreferencesService } from './userPreferencesService';
import { transfersService } from './transfersService';

export interface EnrichmentOptions {
  hotels: any[];
  flights: any[];
  restaurants: any[];
  activities: any[];
  transfers: any[];
  loading: {
    hotels: boolean;
    flights: boolean;
    restaurants: boolean;
    activities: boolean;
    transfers: boolean;
  };
}

export interface EnrichmentProgress {
  step: 'hotels' | 'flights' | 'restaurants' | 'activities' | 'transfers' | 'complete';
  progress: number;
  data: Partial<EnrichmentOptions>;
}

export class TripEnrichmentService {
  private onProgress?: (progress: EnrichmentProgress) => void;

  constructor(onProgress?: (progress: EnrichmentProgress) => void) {
    this.onProgress = onProgress;
  }

  async enrichItinerary(
    itinerary: DetailedItinerary,
    originalTripData: TripFormData
  ): Promise<EnrichmentOptions> {
    // Vérifier le cache d'abord
    const cacheKey = cacheService.generateSearchKey({
      type: 'hotels',
      city: originalTripData.destinations[0]?.city,
      dates: `${originalTripData.startDate.toISOString()}-${originalTripData.endDate.toISOString()}`,
      passengers: originalTripData.travelGroup.size,
      budget: originalTripData.budget.level
    });

    const cachedResult = cacheService.get<EnrichmentOptions>(cacheKey);
    if (cachedResult) {
      bookingAnalytics.trackCacheUsage(cacheKey, true);
      return cachedResult;
    }

    bookingAnalytics.trackCacheUsage(cacheKey, false);

    const enrichmentData: EnrichmentOptions = {
      hotels: [],
      flights: [],
      restaurants: [],
      activities: [],
      transfers: [],
      loading: {
        hotels: true,
        flights: true,
        restaurants: true,
        activities: true,
        transfers: true,
      }
    };

    // Lancer tous les enrichissements en parallèle
    const promises = [
      this.enrichHotels(itinerary, originalTripData, enrichmentData),
      this.enrichFlights(itinerary, originalTripData, enrichmentData),
      this.enrichRestaurants(itinerary, originalTripData, enrichmentData),
      this.enrichActivities(itinerary, originalTripData, enrichmentData),
      this.enrichTransfers(itinerary, originalTripData, enrichmentData),
    ];

    // Attendre que tous les enrichissements soient terminés
    await Promise.allSettled(promises);

    // Appliquer le scoring et la personnalisation
    await this.applyIntelligentScoring(enrichmentData, originalTripData);

    // Mettre en cache le résultat
    cacheService.set(cacheKey, enrichmentData, {
      ttl: 60 * 60 * 1000, // 1 heure
      persistent: true
    });

    this.onProgress?.({
      step: 'complete',
      progress: 100,
      data: enrichmentData
    });

    return enrichmentData;
  }

  /**
   * Applique le scoring intelligent et la personnalisation
   */
  private async applyIntelligentScoring(
    enrichmentData: EnrichmentOptions,
    tripData: TripFormData
  ): Promise<void> {
    try {
      // Récupérer le profil utilisateur pour la personnalisation
      const userProfile = await userPreferencesService.getUserProfile();

      // Appliquer le scoring et A/B testing pour chaque catégorie
      const categories: Array<'hotels' | 'flights' | 'restaurants' | 'activities'> = 
        ['hotels', 'flights', 'restaurants', 'activities'];

      for (const category of categories) {
        if (enrichmentData[category].length > 0) {
          // Scorer les items
          const scoredItems = await recommendationEngine.scoreRecommendations(
            enrichmentData[category],
            category,
            tripData
          );

          // Appliquer personnalisation si profil disponible
          if (userProfile) {
            const personalizedItems = await userPreferencesService.getPersonalizedRecommendations(
              scoredItems.map(item => item.originalItem),
              category,
              {
                userProfile,
                currentTrip: tripData
              }
            );
            enrichmentData[category] = personalizedItems;
          } else {
            enrichmentData[category] = scoredItems.map(item => ({
              ...item.originalItem,
              score: item.score,
              rank: item.rank
            }));
          }

          // A/B testing sur l'ordre
          const abTestResult = bookingAnalytics.runABTest(enrichmentData[category]);
          enrichmentData[category] = abTestResult.items;

          // Tracker les vues
          enrichmentData[category].forEach((item, index) => {
            bookingAnalytics.trackProductView(
              category.slice(0, -1) as any, // Remove 's' from category
              item.id || `${category}_${index}`,
              item.source || 'enrichment',
              { position: index + 1 }
            );
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du scoring intelligent:', error);
    }
  }

  private async enrichHotels(
    itinerary: DetailedItinerary,
    originalTripData: TripFormData,
    enrichmentData: EnrichmentOptions
  ) {
    try {
      this.onProgress?.({
        step: 'hotels',
        progress: 25,
        data: enrichmentData
      });

      const hotels = [];
      
      // Pour chaque destination, chercher des hôtels
      for (const destination of originalTripData.destinations) {
        if (destination.city && destination.startDate && destination.endDate) {
          try {
            let cityHotels: any[] = [];
            
            try {
              // Utiliser HotelBeds en priorité
              const occupancy = {
                rooms: 1,
                adults: originalTripData.travelGroup.size || 2,
                children: originalTripData.travelGroup.children?.count || 0
              };
              
              const searchParams = {
                stay: {
                  checkIn: destination.startDate.toISOString().split('T')[0],
                  checkOut: destination.endDate.toISOString().split('T')[0]
                },
                occupancies: [occupancy],
                destination: {
                  code: destination.city.toUpperCase(),
                  type: 'CITY'
                },
                filter: {
                  maxHotels: 5
                },
                language: 'fr'
              };
              
              const hotelBedsResults = await hotelBedsService.searchHotels(searchParams);
              
              // Transformer les résultats HotelBeds
              cityHotels = hotelBedsResults.map(hotel => ({
                id: hotel.code,
                name: hotel.name,
                description: hotel.description || '',
                address: hotel.address?.content || '',
                city: hotel.city?.content || destination.city,
                latitude: hotel.coordinates?.latitude,
                longitude: hotel.coordinates?.longitude,
                rating: hotel.ranking ? hotel.ranking / 20 : 4.0,
                categoryCode: hotel.categoryCode,
                images: hotel.images?.map(img => `https://photos.hotelbeds.com/giata/original/${img.path}`) || ['/placeholder.svg'],
                amenities: hotel.facilities?.map(f => f.facilityCode) || [],
                price: { amount: 150, currency: 'EUR' },
                bookingUrl: `https://www.hotelbeds.com/hotel/${hotel.code}`,
                provider: 'HotelBeds',
                phone: hotel.phones?.[0]?.phoneNumber || '',
                email: hotel.email || '',
                website: hotel.web || ''
              }));
              
            } catch (hotelBedsError) {
              console.warn('Erreur HotelBeds, fallback vers Amadeus:', hotelBedsError);
              
              // Fallback vers Amadeus
              cityHotels = await amadeusService.searchHotelsByCity(
                destination.city,
                destination.startDate.toISOString().split('T')[0],
                destination.endDate.toISOString().split('T')[0],
                originalTripData.travelGroup.size
              );
              
              cityHotels = cityHotels.map(hotel => ({
                ...hotel,
                provider: 'Amadeus'
              }));
            }
            
            hotels.push(...cityHotels.map(hotel => ({
              ...hotel,
              destinationCity: destination.city,
              destinationCountry: destination.country
            })));
          } catch (error) {
            console.warn(`Erreur recherche hôtels pour ${destination.city}:`, error);
          }
        }
      }

      enrichmentData.hotels = hotels;
      enrichmentData.loading.hotels = false;

      this.onProgress?.({
        step: 'hotels',
        progress: 100,
        data: enrichmentData
      });
    } catch (error) {
      console.error('Erreur enrichissement hôtels:', error);
      enrichmentData.loading.hotels = false;
    }
  }

  private async enrichFlights(
    itinerary: DetailedItinerary,
    originalTripData: TripFormData,
    enrichmentData: EnrichmentOptions
  ) {
    try {
      this.onProgress?.({
        step: 'flights',
        progress: 25,
        data: enrichmentData
      });

      const flights = [];
      
      // Rechercher des vols réels avec Amadeus pour chaque trajet
      for (let i = 0; i < originalTripData.destinations.length; i++) {
        const destination = originalTripData.destinations[i];
        const originCity = i === 0 ? 'CDG' : originalTripData.destinations[i - 1].city || 'CDG';
        const originCountry = i === 0 ? 'France' : originalTripData.destinations[i - 1].country || 'France';
        
        try {
          const flightOffers = await amadeusService.searchFlightsByRoute(
            originCity,
            destination.city!,
            destination.startDate!.toISOString().split('T')[0],
            undefined, // Pas de retour pour l'instant
            originalTripData.travelGroup.size
          );
          
          // Transformer les offres Amadeus en format simplifié
          const transformedFlights = flightOffers.slice(0, 3).map((offer, offerIndex) => ({
            id: `flight_${i}_${offerIndex}`,
            destination: `${destination.city}, ${destination.country}`,
            departure: `${originCity}, ${originCountry}`,
            departureDate: destination.startDate?.toISOString().split('T')[0],
            price: {
              amount: offer.price.total,
              currency: offer.price.currency
            },
            duration: offer.itineraries[0]?.duration || '2h 30m',
            airline: offer.validatingAirlineCodes[0] || 'Airline',
            stops: offer.itineraries[0]?.segments?.reduce((acc, seg) => acc + seg.stops, 0) || 0,
            source: 'amadeus',
            bookingUrl: `https://amadeus.com/booking/${offer.id}`
          }));
          
          flights.push(...transformedFlights);
        } catch (error) {
          console.warn(`Erreur recherche vols pour ${destination.city}:`, error);
          
          // Fallback vers données simulées si API échoue
          flights.push({
            id: `flight_${i}_fallback`,
            destination: `${destination.city}, ${destination.country}`,
            departure: `${originCity}, ${originCountry}`,
            departureDate: destination.startDate?.toISOString().split('T')[0],
            price: {
              amount: Math.floor(Math.random() * 500 + 200),
              currency: originalTripData.budget.currency
            },
            duration: '2h 30m',
            airline: ['Air France', 'Lufthansa', 'KLM', 'British Airways'][Math.floor(Math.random() * 4)],
            stops: Math.random() > 0.6 ? 1 : 0,
            source: 'fallback'
          });
        }
      }

      enrichmentData.flights = flights;
      enrichmentData.loading.flights = false;

      this.onProgress?.({
        step: 'flights',
        progress: 100,
        data: enrichmentData
      });
    } catch (error) {
      console.error('Erreur enrichissement vols:', error);
      enrichmentData.loading.flights = false;
    }
  }

  private async enrichRestaurants(
    itinerary: DetailedItinerary,
    originalTripData: TripFormData,
    enrichmentData: EnrichmentOptions
  ) {
    try {
      this.onProgress?.({
        step: 'restaurants',
        progress: 25,
        data: enrichmentData
      });

      const restaurants = [];
      
      // Pour chaque destination, récupérer 3 propositions de restaurants réels
      for (const destination of originalTripData.destinations) {
        if (destination.city) {
          try {
            // Extraire les préférences culinaires depuis l'itinéraire
            const cuisinePreferences = this.extractCuisinePreferences(itinerary, destination.city);
            const priceRange = this.getBudgetPriceRange(originalTripData.budget.level);
            
            // Rechercher des restaurants externes (Google Places simulation)
            const externalRestaurants = await externalRestaurantService.searchRestaurants(
              destination.city,
              cuisinePreferences,
              priceRange,
              3
            );
            
            // Transformer en format unifié avec info destination
            const transformedRestaurants = externalRestaurants.map((restaurant, index) => ({
              id: `restaurant_${destination.city}_${index}`,
              name: restaurant.name,
              description: restaurant.description,
              location: restaurant.location.address,
              destinationCity: destination.city,
              destinationCountry: destination.country,
              cuisine: restaurant.cuisine,
              priceRange: restaurant.priceRange,
              rating: restaurant.rating,
              contact: restaurant.contact,
              reservationUrl: restaurant.reservationUrl,
              source: restaurant.source,
              images: restaurant.images
            }));
            
            restaurants.push(...transformedRestaurants);
          } catch (error) {
            console.warn(`Erreur recherche restaurants pour ${destination.city}:`, error);
          }
        }
      }

      // Aussi extraire les restaurants des activités existantes de l'itinéraire
      itinerary.days.forEach(day => {
        const mealActivities = day.activities.filter(activity => 
          activity.type.toLowerCase().includes('restaurant') ||
          activity.type.toLowerCase().includes('repas') ||
          activity.type.toLowerCase().includes('déjeuner') ||
          activity.type.toLowerCase().includes('dîner')
        );

        mealActivities.forEach((meal, index) => {
          restaurants.push({
            id: `itinerary_restaurant_${day.dayNumber}_${index}`,
            name: meal.title,
            description: meal.description,
            location: meal.location,
            dayNumber: day.dayNumber,
            time: meal.time,
            cuisine: this.extractCuisineType(meal.description),
            priceRange: this.estimatePriceRange(meal.cost),
            rating: (Math.random() * 2 + 3).toFixed(1),
            bookingAdvice: meal.bookingAdvice,
            source: 'itinerary'
          });
        });
      });

      enrichmentData.restaurants = restaurants;
      enrichmentData.loading.restaurants = false;

      this.onProgress?.({
        step: 'restaurants',
        progress: 100,
        data: enrichmentData
      });
    } catch (error) {
      console.error('Erreur enrichissement restaurants:', error);
      enrichmentData.loading.restaurants = false;
    }
  }

  private async enrichActivities(
    itinerary: DetailedItinerary,
    originalTripData: TripFormData,
    enrichmentData: EnrichmentOptions
  ) {
    try {
      this.onProgress?.({
        step: 'activities',
        progress: 25,
        data: enrichmentData
      });

      const activities = [];
      const userPreferences = originalTripData.activityPreferences;
      
      // Pour chaque destination, récupérer des activités avec filtrage intelligent
      for (const destination of originalTripData.destinations) {
        if (destination.city) {
          try {
            let destinationActivities: any[] = [];
            
            try {
              // Rechercher avec HotelBeds en appliquant les filtres de préférences
              const searchResults = await this.searchHotelBedsActivitiesWithFilters(
                destination.city,
                userPreferences
              );
              
              // Transformer et enrichir les résultats HotelBeds
              destinationActivities = searchResults.map((activity, index) => 
                this.transformHotelBedsActivity(activity, destination, index)
              );
              
            } catch (hotelBedsError) {
              console.warn('Erreur HotelBeds pour activités, fallback vers service externe:', hotelBedsError);
              
              // Fallback vers le service externe avec préférences
              const activityPreferences = this.extractActivityPreferences(itinerary, originalTripData);
              
              const externalActivities = await externalActivityService.searchActivities(
                destination.city,
                activityPreferences.category,
                activityPreferences.type,
                3
              );
              
              destinationActivities = externalActivities.map((activity, index) => ({
                id: `activity_${destination.city}_${index}`,
                name: activity.name,
                description: activity.description,
                location: activity.location.address,
                destinationCity: destination.city,
                destinationCountry: destination.country,
                category: activity.category,
                type: activity.type,
                duration: activity.duration,
                price: activity.price,
                rating: activity.rating,
                difficulty: activity.difficulty,
                provider: 'External',
                inclusions: activity.inclusions,
                bookingUrl: activity.bookingUrl,
                source: activity.source,
                images: activity.images
              }));
            }
            
            activities.push(...destinationActivities);
          } catch (error) {
            console.warn(`Erreur recherche activités pour ${destination.city}:`, error);
          }
        }
      }

      // Aussi extraire les activités existantes de l'itinéraire
      itinerary.days.forEach(day => {
        const dayActivities = day.activities.filter(activity => 
          !activity.type.toLowerCase().includes('restaurant') &&
          !activity.type.toLowerCase().includes('repas')
        );

        dayActivities.forEach((activity, index) => {
          activities.push({
            id: `itinerary_activity_${day.dayNumber}_${index}`,
            name: activity.title,
            description: activity.description,
            location: activity.location,
            dayNumber: day.dayNumber,
            time: activity.time,
            duration: activity.duration,
            type: activity.type,
            cost: activity.cost,
            difficulty: activity.difficulty,
            tips: activity.tips,
            bookingAdvice: activity.bookingAdvice,
            alternatives: activity.alternatives,
            rating: (Math.random() * 2 + 3).toFixed(1),
            bookingRequired: this.isBookingRequired(activity.bookingAdvice),
            source: 'itinerary'
          });
        });
      });

      enrichmentData.activities = activities;
      enrichmentData.loading.activities = false;

      this.onProgress?.({
        step: 'activities',
        progress: 100,
        data: enrichmentData
      });
    } catch (error) {
      console.error('Erreur enrichissement activités:', error);
      enrichmentData.loading.activities = false;
    }
  }

  /**
   * Recherche HotelBeds avec filtres basés sur les préférences utilisateur
   */
  private async searchHotelBedsActivitiesWithFilters(
    city: string, 
    preferences?: ActivityPreferences
  ): Promise<any[]> {
    const searchLimit = 8; // Plus d'options pour filtrer
    
    // Recherche de base
    let activities = await hotelBedsService.searchActivitiesByDestination(
      city.toUpperCase(),
      1,
      searchLimit
    );

    // Appliquer les filtres basés sur les préférences
    if (preferences && activities.length > 0) {
      activities = this.filterActivitiesByPreferences(activities, preferences);
    }

    // Limiter à 5 activités finales
    return activities.slice(0, 5);
  }

  /**
   * Filtre les activités basé sur les préférences utilisateur
   */
  private filterActivitiesByPreferences(activities: any[], preferences: ActivityPreferences): any[] {
    return activities.filter(activity => {
      // Mapping des catégories HotelBeds vers nos préférences
      const categoryMapping: { [key: string]: string[] } = {
        'culture': ['MUSEUMS', 'MONUMENTS', 'TOURS', 'HISTORIC'],
        'adventure': ['ADVENTURE', 'SPORTS', 'OUTDOOR', 'HIKING'],
        'relaxation': ['SPA', 'WELLNESS', 'BEACH', 'RELAXATION'],
        'gastronomy': ['FOOD', 'WINE', 'CULINARY', 'TASTING'],
        'nature': ['NATURE', 'WILDLIFE', 'PARKS', 'GARDENS'],
        'nightlife': ['NIGHTLIFE', 'ENTERTAINMENT', 'BARS'],
        'art': ['ART', 'GALLERIES', 'CREATIVE', 'WORKSHOPS'],
        'photography': ['PHOTOGRAPHY', 'SCENIC', 'VIEWPOINTS'],
        'shopping': ['SHOPPING', 'MARKETS', 'CRAFTS'],
        'local': ['LOCAL', 'AUTHENTIC', 'TRADITIONAL', 'CULTURAL']
      };

      // Vérifier si l'activité correspond aux catégories préférées
      if (preferences.categories.length > 0) {
        const activityCategory = activity.category?.name?.toUpperCase() || '';
        const activityType = activity.type?.toUpperCase() || '';
        
        const matchesCategory = preferences.categories.some(prefCat => {
          const mappedCategories = categoryMapping[prefCat] || [];
          return mappedCategories.some(mapped => 
            activityCategory.includes(mapped) || activityType.includes(mapped)
          );
        });

        if (!matchesCategory) return false;
      }

      // Filtrer par intensité si disponible
      if (preferences.intensity) {
        const duration = activity.modalities?.[0]?.duration?.value || 0;
        const intensityMatch = this.matchActivityIntensity(duration, preferences.intensity);
        if (!intensityMatch) return false;
      }

      // Éviter certaines activités
      if (preferences.avoidances.length > 0) {
        const avoidanceMapping: { [key: string]: string[] } = {
          'heights': ['HIGH', 'CLIMBING', 'AERIAL', 'SKY'],
          'crowds': ['POPULAR', 'BUSY', 'CROWDED'],
          'physical_intense': ['EXTREME', 'STRENUOUS', 'DEMANDING'],
          'closed_spaces': ['INDOOR', 'UNDERGROUND', 'CAVE'],
          'animals': ['WILDLIFE', 'ANIMAL', 'ZOO', 'SAFARI'],
          'extreme_sports': ['EXTREME', 'ADVENTURE', 'ADRENALINE'],
          'noise': ['LOUD', 'MUSIC', 'PARTY', 'NIGHTLIFE'],
          'night_activities': ['NIGHT', 'EVENING', 'SUNSET'],
          'walking': ['WALKING', 'HIKING', 'TREKKING'],
          'public_transport': ['METRO', 'BUS', 'TRANSPORT']
        };

        const shouldAvoid = preferences.avoidances.some(avoidance => {
          const mappedTerms = avoidanceMapping[avoidance] || [];
          const activityName = activity.name?.toUpperCase() || '';
          const activityDesc = activity.content?.description?.toUpperCase() || '';
          
          return mappedTerms.some(term => 
            activityName.includes(term) || activityDesc.includes(term)
          );
        });

        if (shouldAvoid) return false;
      }

      return true;
    });
  }

  /**
   * Vérifie si l'intensité de l'activité correspond aux préférences
   */
  private matchActivityIntensity(duration: number, preferredIntensity: string): boolean {
    switch (preferredIntensity) {
      case 'relaxed':
        return duration <= 2; // Activités de 2h max
      case 'moderate':
        return duration >= 1 && duration <= 4; // 1-4h
      case 'active':
        return duration >= 3; // 3h+
      case 'intense':
        return duration >= 4; // 4h+
      default:
        return true;
    }
  }

  /**
   * Transforme une activité HotelBeds en format unifié
   */
  private transformHotelBedsActivity(activity: any, destination: any, index: number): any {
    // Déterminer la difficulté basée sur la durée et le type
    const difficulty = this.determineActivityDifficulty(activity);
    
    // Extraire les meilleures images
    const images = this.extractBestActivityImages(activity);
    
    // Formater le prix
    const price = this.formatActivityPrice(activity);
    
    // Extraire les inclusions/exclusions
    const inclusions = this.extractActivityInclusions(activity);
    
    return {
      id: `hotelbeds_${destination.city}_${activity.code}_${index}`,
      name: activity.name,
      description: activity.content?.description || activity.name,
      location: {
        address: activity.destination?.name || destination.city,
        latitude: activity.geoLocation?.latitude,
        longitude: activity.geoLocation?.longitude
      },
      destinationCity: destination.city,
      destinationCountry: destination.country,
      category: this.mapHotelBedsCategory(activity.category?.name),
      type: activity.type || 'ACTIVITY',
      duration: this.formatActivityDuration(activity),
      price,
      rating: this.generateRealisticRating(),
      difficulty,
      provider: 'HotelBeds',
      inclusions,
      exclusions: activity.modalities?.[0]?.notIncluded || [],
      bookingUrl: `https://www.hotelbeds.com/activity/${activity.code}`,
      source: 'HotelBeds API',
      images,
      languages: activity.modalities?.[0]?.languages?.map((lang: any) => lang.name) || ['Français'],
      code: activity.code,
      availability: activity.modalities?.[0]?.rates?.[0]?.rateDetails || [],
      cancellationPolicy: activity.modalities?.[0]?.cancellationPolicies?.[0] || null,
      highlights: activity.content?.highlights || [],
      meetingPoint: activity.modalities?.[0]?.operatingDays?.[0]?.meetingPoint || null
    };
  }

  /**
   * Détermine la difficulté d'une activité
   */
  private determineActivityDifficulty(activity: any): string {
    const duration = activity.modalities?.[0]?.duration?.value || 0;
    const type = activity.type?.toUpperCase() || '';
    const name = activity.name?.toUpperCase() || '';
    
    // Basé sur des mots-clés
    if (name.includes('EXTREME') || name.includes('ADVENTURE') || type.includes('ADVENTURE')) {
      return 'challenging';
    }
    
    if (name.includes('EASY') || name.includes('GENTLE') || duration <= 1) {
      return 'easy';
    }
    
    if (duration >= 4 || name.includes('INTENSIVE')) {
      return 'challenging';
    }
    
    return 'moderate';
  }

  /**
   * Extrait les meilleures images d'une activité
   */
  private extractBestActivityImages(activity: any): string[] {
    const images: string[] = [];
    
    if (activity.images) {
      // Prioriser les images de haute qualité
      const sortedImages = activity.images.sort((a: any, b: any) => {
        const aOrder = a.order || 999;
        const bOrder = b.order || 999;
        return aOrder - bOrder;
      });
      
      sortedImages.forEach((img: any) => {
        if (img.path) {
          images.push(`https://photos.hotelbeds.com/giata/original/${img.path}`);
        }
      });
    }
    
    return images.length > 0 ? images : ['/placeholder.svg'];
  }

  /**
   * Formate le prix d'une activité
   */
  private formatActivityPrice(activity: any): { amount: number; currency: string } {
    const modality = activity.modalities?.[0];
    const amount = modality?.amountsFrom?.[0]?.amount || 
                  modality?.rates?.[0]?.rateDetails?.[0]?.totalAmount?.amount || 
                  50;
    const currency = modality?.amountsFrom?.[0]?.currency || 
                    modality?.rates?.[0]?.rateDetails?.[0]?.totalAmount?.currency || 
                    'EUR';
    
    return { amount: Number(amount), currency };
  }

  /**
   * Extrait les inclusions d'une activité
   */
  private extractActivityInclusions(activity: any): string[] {
    const inclusions: string[] = [];
    const modality = activity.modalities?.[0];
    
    if (modality?.comments) {
      inclusions.push(...modality.comments);
    }
    
    if (modality?.included) {
      inclusions.push(...modality.included);
    }
    
    return inclusions;
  }

  /**
   * Formate la durée d'une activité
   */
  private formatActivityDuration(activity: any): string {
    const duration = activity.modalities?.[0]?.duration;
    if (duration) {
      const value = duration.value;
      const metric = duration.metric?.toLowerCase();
      
      if (metric === 'hours' || metric === 'hour') {
        return value === 1 ? '1 heure' : `${value} heures`;
      }
      if (metric === 'days' || metric === 'day') {
        return value === 1 ? '1 jour' : `${value} jours`;
      }
      if (metric === 'minutes' || metric === 'minute') {
        return `${value} minutes`;
      }
      
      return `${value} ${metric}`;
    }
    
    return '2-3 heures';
  }

  /**
   * Mappe les catégories HotelBeds vers nos catégories internes
   */
  private mapHotelBedsCategory(category?: string): string {
    if (!category) return 'cultural';
    
    const categoryUpper = category.toUpperCase();
    
    if (categoryUpper.includes('MUSEUM') || categoryUpper.includes('HISTORIC')) return 'culture';
    if (categoryUpper.includes('ADVENTURE') || categoryUpper.includes('SPORT')) return 'adventure';
    if (categoryUpper.includes('SPA') || categoryUpper.includes('WELLNESS')) return 'relaxation';
    if (categoryUpper.includes('FOOD') || categoryUpper.includes('CULINARY')) return 'gastronomy';
    if (categoryUpper.includes('NATURE') || categoryUpper.includes('PARK')) return 'nature';
    if (categoryUpper.includes('NIGHT') || categoryUpper.includes('ENTERTAINMENT')) return 'nightlife';
    if (categoryUpper.includes('ART') || categoryUpper.includes('GALLERY')) return 'art';
    if (categoryUpper.includes('SHOP') || categoryUpper.includes('MARKET')) return 'shopping';
    
    return 'cultural';
  }

  /**
   * Génère une note réaliste pour une activité
   */
  private generateRealisticRating(): number {
    // Génère une note entre 3.5 et 4.8 pour être réaliste
    return Math.round((3.5 + Math.random() * 1.3) * 10) / 10;
  }

  /**
   * Enrichit les données avec les transferts
   */
  private async enrichTransfers(
    itinerary: DetailedItinerary,
    originalTripData: TripFormData,
    enrichmentData: EnrichmentOptions
  ) {
    try {
      this.onProgress?.({
        step: 'transfers',
        progress: 25,
        data: enrichmentData
      });

      // Rechercher les transferts pour l'itinéraire complet
      const transfers = await transfersService.getItineraryTransfers(originalTripData);

      enrichmentData.transfers = transfers;
      enrichmentData.loading.transfers = false;

      this.onProgress?.({
        step: 'transfers',
        progress: 100,
        data: enrichmentData
      });

    } catch (error) {
      console.error('Erreur enrichissement transferts:', error);
      enrichmentData.loading.transfers = false;
    }
  }

  private extractCuisineType(description: string): string {
    const cuisineTypes = [
      'française', 'italienne', 'japonaise', 'chinoise', 'indienne', 
      'mexicaine', 'thaïlandaise', 'grecque', 'libanaise', 'marocaine'
    ];
    
    for (const cuisine of cuisineTypes) {
      if (description.toLowerCase().includes(cuisine)) {
        return cuisine;
      }
    }
    return 'internationale';
  }

  private estimatePriceRange(cost: number): string {
    if (cost <= 25) return '€';
    if (cost <= 50) return '€€';
    if (cost <= 100) return '€€€';
    return '€€€€';
  }

  private isBookingRequired(bookingAdvice?: string): boolean {
    if (!bookingAdvice) return false;
    return bookingAdvice.toLowerCase().includes('réservation') ||
           bookingAdvice.toLowerCase().includes('réserver') ||
           bookingAdvice.toLowerCase().includes('booking');
  }

  private extractCuisinePreferences(itinerary: DetailedItinerary, city: string): string | undefined {
    // Analyser l'itinéraire pour détecter les préférences culinaires
    const cuisineKeywords: { [key: string]: string } = {
      'français': 'française',
      'italien': 'italienne', 
      'japonais': 'japonaise',
      'chinois': 'chinoise',
      'indien': 'indienne',
      'mexicain': 'mexicaine',
      'thaï': 'thaïlandaise'
    };

    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        const description = (activity.description || '').toLowerCase();
        for (const [keyword, cuisine] of Object.entries(cuisineKeywords)) {
          if (description.includes(keyword)) {
            return cuisine;
          }
        }
      }
    }
    
    return undefined;
  }

  private getBudgetPriceRange(budgetLevel: string): string {
    const budgetMapping: { [key: string]: string } = {
      'economique': '€',
      'standard': '€€',
      'premium': '€€€',
      'luxe': '€€€€'
    };
    
    return budgetMapping[budgetLevel] || '€€';
  }

  private extractActivityPreferences(itinerary: DetailedItinerary, tripData: TripFormData): { category?: string; type?: string } {
    // Analyser les préférences d'activités depuis l'itinéraire et les données du voyage
    const categories = ['culture', 'aventure', 'nature', 'gastronomie', 'sport', 'bien-être'];
    
    // Analyser les activités existantes pour détecter les préférences
    const activityKeywords: { [key: string]: string } = {
      'musée': 'culture',
      'monument': 'culture',
      'visite': 'culture',
      'randonnée': 'nature',
      'parc': 'nature',
      'jardin': 'nature',
      'sport': 'sport',
      'vélo': 'sport',
      'course': 'sport',
      'restaurant': 'gastronomie',
      'dégustation': 'gastronomie',
      'spa': 'bien-être',
      'massage': 'bien-être'
    };

    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        const text = (activity.title + ' ' + activity.description).toLowerCase();
        for (const [keyword, category] of Object.entries(activityKeywords)) {
          if (text.includes(keyword)) {
            return { category, type: activity.type };
          }
        }
      }
    }
    
    // Par défaut, retourner une catégorie populaire
    return { category: 'culture' };
  }
}

export const tripEnrichmentService = new TripEnrichmentService();
