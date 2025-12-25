import { apiProviderService, APIProvider } from './apiProviderService';
import { hotelBedsService } from './hotelBedsService';
import { amadeusService } from './amadeusService';
import { kayakService } from './kayakService';

interface SearchParams {
  destination: string;
  checkIn?: string;
  checkOut?: string;
  departureDate?: string;
  returnDate?: string;
  origin?: string;
  guests?: number;
  passengers?: number;
  rooms?: number;
}

/**
 * Service de gestion centralisée des fournisseurs d'API
 * Gère automatiquement la sélection et le fallback des fournisseurs
 */
class ProviderManagerService {
  private providers: APIProvider[] = [];
  private providersLoaded = false;

  /**
   * Charge les fournisseurs actifs depuis l'API
   */
  async loadProviders(): Promise<void> {
    try {
      this.providers = await apiProviderService.active();
      this.providersLoaded = true;
    } catch (error) {
      console.error('❌ Erreur chargement fournisseurs:', error);
      this.providersLoaded = false;
      this.providers = [];
    }
  }

  /**
   * Récupère les fournisseurs actifs pour un type de service
   */
  private getActiveProviders(serviceType: string): APIProvider[] {
    if (!this.providersLoaded) {
      return [];
    }

    return this.providers
      .filter(p => p.service_type === serviceType && p.is_active && p.has_credentials)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Recherche d'hôtels avec gestion automatique des fournisseurs
   */
  async searchHotels(params: SearchParams): Promise<any[]> {
    const providers = this.getActiveProviders('hotels');

    // Aucun provider actif -> fallback HotelBeds
    if (providers.length === 0) {
      return this.searchHotelsWithHotelBeds(params);
    }

    // Respecter strictement le premier provider actif (priorité la plus basse = plus haute priorité)
    const provider = providers[0];
    try {
      let results: any[] = [];
      switch (provider.provider_code) {
        case 'hotelbeds':
          results = await this.searchHotelsWithHotelBeds(params);
          break;

        case 'kayak':
          results = await this.searchHotelsWithKayak(params);
          break;

        default:
          return [];
      }

      return results;
    } catch (error: any) {
      console.error(`❌ Erreur avec ${provider.provider_name}:`, error.message);
      return [];
    }
  }

  /**
   * Recherche de vols avec gestion automatique des fournisseurs
   */
  async searchFlights(params: SearchParams): Promise<any[]> {
    const providers = this.getActiveProviders('flights');

    // Si pas de fournisseurs configurés, utiliser Amadeus par défaut
    if (providers.length === 0) {
      return this.searchFlightsWithAmadeus(params);
    }

    const provider = providers[0];
    try {
      let results: any[] = [];
      switch (provider.provider_code) {
        case 'amadeus':
          results = await this.searchFlightsWithAmadeus(params);
          break;

        case 'kayak':
          results = await this.searchFlightsWithKayak(params);
          break;

        default:
          return [];
      }

      return results;
    } catch (error: any) {
      console.error(`❌ Erreur avec ${provider.provider_name}:`, error.message);
      return [];
    }
  }

  /**
   * Recherche d'activités avec gestion automatique des fournisseurs
   */
  async searchActivities(params: SearchParams): Promise<any[]> {
    const providers = this.getActiveProviders('activities');

    // Si pas de fournisseurs configurés, utiliser HotelBeds par défaut
    if (providers.length === 0) {
      return this.searchActivitiesWithHotelBeds(params);
    }

    const provider = providers[0];
    try {
      let results: any[] = [];
      switch (provider.provider_code) {
        case 'hotelbeds_activities':
        case 'hotelbeds':
          results = await this.searchActivitiesWithHotelBeds(params);
          break;

        default:
          return [];
      }

      return results;
    } catch (error: any) {
      console.error(`❌ Erreur avec ${provider.provider_name}:`, error.message);
      return [];
    }
  }

  // ============ Méthodes privées pour chaque fournisseur ============

  private async searchHotelsWithHotelBeds(params: SearchParams): Promise<any[]> {
    const destinationCode = params.destination.trim().toUpperCase();

    return await hotelBedsService.searchHotels({
      stay: {
        checkIn: params.checkIn!,
        checkOut: params.checkOut!
      },
      occupancies: [{
        rooms: params.rooms || 1,
        adults: params.guests || 2,
        children: 0
      }],
      destination: {
        code: destinationCode,
        type: 'CITY'
      }
    });
  }

  private async searchFlightsWithAmadeus(params: SearchParams): Promise<any[]> {
    return await amadeusService.searchFlightsByRoute(
      params.origin!,
      params.destination,
      params.departureDate!,
      params.returnDate,
      params.passengers || 1
    );
  }

  private async searchActivitiesWithHotelBeds(params: SearchParams): Promise<any[]> {
    return await hotelBedsService.searchActivitiesByDestination(
      params.destination,
      1,
      20
    );
  }

  private async searchHotelsWithKayak(params: SearchParams): Promise<any[]> {
    return await kayakService.searchHotels({
      destination: params.destination,
      checkIn: params.checkIn!,
      checkOut: params.checkOut!,
      adults: params.guests || 2,
      rooms: params.rooms || 1
    });
  }

  private async searchFlightsWithKayak(params: SearchParams): Promise<any[]> {
    return await kayakService.searchFlights({
      origin: params.origin!,
      destination: params.destination,
      departureDate: params.departureDate!,
      returnDate: params.returnDate,
      passengers: params.passengers || 1
    });
  }
}

// Export singleton
export const providerManager = new ProviderManagerService();
