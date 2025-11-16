import { hotelBedsService } from './hotelBedsService';
import { TripFormData, Destination } from '@/types/trip';

export interface TransferOption {
  id: string;
  type: 'airport' | 'city' | 'hotel';
  name: string;
  description: string;
  from: {
    name: string;
    type: string;
    coordinates?: { latitude: number; longitude: number };
  };
  to: {
    name: string;
    type: string;
    coordinates?: { latitude: number; longitude: number };
  };
  duration: string;
  distance?: string;
  price: {
    amount: number;
    currency: string;
  };
  vehicle: {
    type: string;
    category: string;
    capacity: number;
    features: string[];
  };
  provider: string;
  images: string[];
  availability: boolean;
  bookingUrl?: string;
  cancellationPolicy?: string;
  highlights: string[];
  includedServices: string[];
}

export interface TransferSearchParams {
  from: {
    type: 'airport' | 'city' | 'hotel';
    code?: string;
    name: string;
    coordinates?: { latitude: number; longitude: number };
  };
  to: {
    type: 'airport' | 'city' | 'hotel';
    code?: string;
    name: string;
    coordinates?: { latitude: number; longitude: number };
  };
  date: string;
  time?: string;
  passengers: number;
  luggage?: number;
  vehicleCategory?: 'economy' | 'standard' | 'premium' | 'luxury';
}

class TransfersService {
  /**
   * Recherche des transferts pour un itinéraire complet
   */
  async getItineraryTransfers(tripData: TripFormData): Promise<TransferOption[]> {
    const transfers: TransferOption[] = [];
    
    try {
      // Transferts aéroport pour le premier jour
      if (tripData.destinations.length > 0) {
        const firstDestination = tripData.destinations[0];
        const airportTransfers = await this.getAirportTransfers(
          firstDestination,
          tripData.travelGroup.size,
          tripData.startDate.toISOString().split('T')[0]
        );
        transfers.push(...airportTransfers);
      }

      // Transferts entre destinations
      for (let i = 0; i < tripData.destinations.length - 1; i++) {
        const from = tripData.destinations[i];
        const to = tripData.destinations[i + 1];
        
        const interDestinationTransfers = await this.getInterDestinationTransfers(
          from,
          to,
          tripData.travelGroup.size,
          to.startDate?.toISOString().split('T')[0] || ''
        );
        transfers.push(...interDestinationTransfers);
      }

      // Transfert retour aéroport pour le dernier jour
      if (tripData.destinations.length > 0) {
        const lastDestination = tripData.destinations[tripData.destinations.length - 1];
        const returnTransfers = await this.getAirportTransfers(
          lastDestination,
          tripData.travelGroup.size,
          tripData.endDate.toISOString().split('T')[0],
          true
        );
        transfers.push(...returnTransfers);
      }

    } catch (error) {
      console.warn('Erreur lors de la recherche de transferts:', error);
    }

    return transfers;
  }

  /**
   * Recherche des transferts aéroport
   */
  async getAirportTransfers(
    destination: Destination,
    passengers: number,
    date: string,
    isReturn: boolean = false
  ): Promise<TransferOption[]> {
    try {
      // Déterminer le code aéroport le plus proche
      const airportCode = this.getAirportCodeForCity(destination.city);
      
      const searchParams = {
        from: isReturn ? 
          { type: 'city' as const, name: destination.city, code: destination.city } :
          { type: 'airport' as const, name: `Aéroport ${destination.city}`, code: airportCode },
        to: isReturn ?
          { type: 'airport' as const, name: `Aéroport ${destination.city}`, code: airportCode } :
          { type: 'city' as const, name: destination.city, code: destination.city },
        date,
        passengers,
        vehicleCategory: 'standard' as const
      };

      const hotelBedsTransfers = await hotelBedsService.searchTransfersByRoute(
        searchParams.from.code || searchParams.from.name,
        searchParams.to.code || searchParams.to.name,
        '1',
        '3'
      );

      return hotelBedsTransfers.map((transfer, index) => 
        this.transformHotelBedsTransfer(transfer, searchParams, index)
      );

    } catch (error) {
      console.warn('Erreur transferts aéroport:', error);
      return this.generateFallbackAirportTransfers(destination, passengers, isReturn);
    }
  }

  /**
   * Recherche des transferts entre destinations
   */
  async getInterDestinationTransfers(
    from: Destination,
    to: Destination,
    passengers: number,
    date: string
  ): Promise<TransferOption[]> {
    try {
      const searchParams = {
        from: { type: 'city' as const, name: from.city, code: from.city },
        to: { type: 'city' as const, name: to.city, code: to.city },
        date,
        passengers,
        vehicleCategory: 'standard' as const
      };

      const hotelBedsTransfers = await hotelBedsService.searchTransfersByRoute(
        from.city,
        to.city,
        '1',
        '3'
      );

      return hotelBedsTransfers.map((transfer, index) => 
        this.transformHotelBedsTransfer(transfer, searchParams, index)
      );

    } catch (error) {
      console.warn('Erreur transferts inter-destinations:', error);
      return this.generateFallbackInterDestinationTransfers(from, to, passengers);
    }
  }

  /**
   * Transforme un transfert HotelBeds en format unifié
   */
  private transformHotelBedsTransfer(
    transfer: any,
    searchParams: TransferSearchParams,
    index: number
  ): TransferOption {
    const vehicle = transfer.vehicle || {};
    const content = transfer.content || {};
    
    return {
      id: `hotelbeds_transfer_${transfer.code}_${index}`,
      type: this.determineTransferType(searchParams),
      name: transfer.name || `Transfert ${searchParams.from.name} → ${searchParams.to.name}`,
      description: content.description || `Transfert confortable entre ${searchParams.from.name} et ${searchParams.to.name}`,
      from: {
        name: searchParams.from.name,
        type: searchParams.from.type,
        coordinates: searchParams.from.coordinates
      },
      to: {
        name: searchParams.to.name,
        type: searchParams.to.type,
        coordinates: searchParams.to.coordinates
      },
      duration: this.formatTransferDuration(transfer.duration),
      distance: transfer.distance ? `${transfer.distance} km` : undefined,
      price: {
        amount: transfer.price?.amount || this.estimateTransferPrice(searchParams),
        currency: transfer.price?.currency || 'EUR'
      },
      vehicle: {
        type: vehicle.type || 'Voiture',
        category: vehicle.category || 'Standard',
        capacity: vehicle.maxPax || searchParams.passengers,
        features: this.extractVehicleFeatures(vehicle)
      },
      provider: 'HotelBeds',
      images: this.extractTransferImages(transfer),
      availability: true,
      bookingUrl: `https://www.hotelbeds.com/transfer/${transfer.code}`,
      cancellationPolicy: transfer.cancellationPolicy || 'Annulation gratuite jusqu\'à 24h avant',
      highlights: this.extractTransferHighlights(transfer, searchParams),
      includedServices: this.extractIncludedServices(transfer)
    };
  }

  /**
   * Détermine le type de transfert
   */
  private determineTransferType(searchParams: TransferSearchParams): 'airport' | 'city' | 'hotel' {
    if (searchParams.from.type === 'airport' || searchParams.to.type === 'airport') {
      return 'airport';
    }
    if (searchParams.from.type === 'hotel' || searchParams.to.type === 'hotel') {
      return 'hotel';
    }
    return 'city';
  }

  /**
   * Formate la durée du transfert
   */
  private formatTransferDuration(duration?: any): string {
    if (typeof duration === 'number') {
      if (duration < 60) return `${duration} min`;
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
    
    if (typeof duration === 'string') {
      return duration;
    }
    
    return '45 min';
  }

  /**
   * Extrait les caractéristiques du véhicule
   */
  private extractVehicleFeatures(vehicle: any): string[] {
    const features: string[] = [];
    
    if (vehicle.airConditioning) features.push('Climatisation');
    if (vehicle.wifi) features.push('WiFi');
    if (vehicle.luggageSpace) features.push('Espace bagages');
    if (vehicle.childSeat) features.push('Siège enfant disponible');
    if (vehicle.accessibility) features.push('Accessible PMR');
    
    // Ajouter des caractéristiques par défaut
    if (features.length === 0) {
      features.push('Véhicule confortable', 'Chauffeur professionnel', 'Climatisation');
    }
    
    return features;
  }

  /**
   * Extrait les images du transfert
   */
  private extractTransferImages(transfer: any): string[] {
    if (transfer.images && transfer.images.length > 0) {
      return transfer.images.map((img: any) => 
        typeof img === 'string' ? img : `https://photos.hotelbeds.com/giata/original/${img.path}`
      );
    }
    
    // Images par défaut basées sur le type de véhicule
    const defaultImages = [
      '/placeholder.svg', // À remplacer par des vraies images de transferts
    ];
    
    return defaultImages;
  }

  /**
   * Extrait les points forts du transfert
   */
  private extractTransferHighlights(transfer: any, searchParams: TransferSearchParams): string[] {
    const highlights: string[] = [];
    
    if (transfer.highlights) {
      highlights.push(...transfer.highlights);
    }
    
    // Ajouter des points forts basés sur le type
    if (searchParams.from.type === 'airport' || searchParams.to.type === 'airport') {
      highlights.push('Service aéroport premium', 'Suivi des vols en temps réel');
    }
    
    if (searchParams.passengers > 4) {
      highlights.push('Véhicule spacieux pour groupes');
    }
    
    if (highlights.length === 0) {
      highlights.push('Service ponctuel', 'Chauffeur expérimenté', 'Véhicule récent');
    }
    
    return highlights;
  }

  /**
   * Extrait les services inclus
   */
  private extractIncludedServices(transfer: any): string[] {
    const services: string[] = [];
    
    if (transfer.includedServices) {
      services.push(...transfer.includedServices);
    }
    
    // Services par défaut
    if (services.length === 0) {
      services.push(
        'Chauffeur professionnel',
        'Carburant inclus',
        'Assurance véhicule',
        'Assistance 24/7'
      );
    }
    
    return services;
  }

  /**
   * Estime le prix d'un transfert
   */
  private estimateTransferPrice(searchParams: TransferSearchParams): number {
    const basePrice = searchParams.from.type === 'airport' || searchParams.to.type === 'airport' ? 45 : 35;
    const passengerMultiplier = Math.ceil(searchParams.passengers / 4); // 1 véhicule par 4 passagers
    
    return basePrice * passengerMultiplier;
  }

  /**
   * Obtient le code aéroport pour une ville
   */
  private getAirportCodeForCity(city: string): string {
    const airportCodes: { [key: string]: string } = {
      'paris': 'CDG',
      'londres': 'LHR',
      'madrid': 'MAD',
      'barcelone': 'BCN',
      'rome': 'FCO',
      'milan': 'MXP',
      'berlin': 'BER',
      'munich': 'MUC',
      'amsterdam': 'AMS',
      'bruxelles': 'BRU',
      'zurich': 'ZUR',
      'vienne': 'VIE',
      'prague': 'PRG',
      'varsovie': 'WAW',
      'stockholm': 'ARN',
      'oslo': 'OSL',
      'copenhague': 'CPH',
      'helsinki': 'HEL'
    };
    
    return airportCodes[city.toLowerCase()] || city.substring(0, 3).toUpperCase();
  }

  /**
   * Génère des transferts aéroport de fallback
   */
  private generateFallbackAirportTransfers(
    destination: Destination,
    passengers: number,
    isReturn: boolean
  ): TransferOption[] {
    const basePrice = 45;
    const vehicleCount = Math.ceil(passengers / 4);
    
    return [
      {
        id: `fallback_airport_${destination.city}_standard`,
        type: 'airport',
        name: `Transfert aéroport ${isReturn ? 'retour' : 'aller'}`,
        description: `Transfert ${isReturn ? 'depuis' : 'vers'} l'aéroport de ${destination.city}`,
        from: {
          name: isReturn ? destination.city : `Aéroport ${destination.city}`,
          type: isReturn ? 'city' : 'airport'
        },
        to: {
          name: isReturn ? `Aéroport ${destination.city}` : destination.city,
          type: isReturn ? 'airport' : 'city'
        },
        duration: '45 min',
        price: {
          amount: basePrice * vehicleCount,
          currency: 'EUR'
        },
        vehicle: {
          type: 'Berline',
          category: 'Standard',
          capacity: passengers > 4 ? 8 : 4,
          features: ['Climatisation', 'WiFi', 'Espace bagages']
        },
        provider: 'Service local',
        images: ['/placeholder.svg'],
        availability: true,
        highlights: ['Service ponctuel', 'Chauffeur local', 'Prix fixe'],
        includedServices: ['Chauffeur professionnel', 'Carburant', 'Assurance']
      }
    ];
  }

  /**
   * Génère des transferts inter-destinations de fallback
   */
  private generateFallbackInterDestinationTransfers(
    from: Destination,
    to: Destination,
    passengers: number
  ): TransferOption[] {
    const basePrice = 120;
    const vehicleCount = Math.ceil(passengers / 4);
    
    return [
      {
        id: `fallback_interdest_${from.city}_${to.city}`,
        type: 'city',
        name: `Transfert ${from.city} → ${to.city}`,
        description: `Transfert direct entre ${from.city} et ${to.city}`,
        from: {
          name: from.city,
          type: 'city'
        },
        to: {
          name: to.city,
          type: 'city'
        },
        duration: '3h 30min',
        price: {
          amount: basePrice * vehicleCount,
          currency: 'EUR'
        },
        vehicle: {
          type: 'Minibus',
          category: 'Standard',
          capacity: passengers > 4 ? 8 : 4,
          features: ['Climatisation', 'WiFi', 'Espace bagages', 'Confort longue distance']
        },
        provider: 'Service local',
        images: ['/placeholder.svg'],
        availability: true,
        highlights: ['Trajet direct', 'Véhicule confortable', 'Arrêts sur demande'],
        includedServices: ['Chauffeur expérimenté', 'Carburant', 'Péages inclus', 'Assurance']
      }
    ];
  }
}

export const transfersService = new TransfersService();