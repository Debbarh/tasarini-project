// Service pour interagir avec l'API HotelBeds
import { apiClient } from "@/integrations/api/client";

// Types pour HotelBeds API
export interface HotelBedsHotel {
  code: string;
  name: string;
  description?: string;
  categoryCode: string;
  destinationCode: string;
  zoneCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  images?: Array<{
    imageTypeCode: string;
    path: string;
    roomCode?: string;
    roomType?: string;
    characteristicCode?: string;
  }>;
  facilities?: Array<{
    facilityCode: string;
    facilityGroupCode: string;
    order: number;
    indYesOrNo: boolean;
    number?: number;
    voucher?: boolean;
  }>;
  phones?: Array<{
    phoneNumber: string;
    phoneType: string;
  }>;
  address?: {
    content: string;
    street: string;
    number: string;
  };
  postalCode?: string;
  city?: {
    content: string;
  };
  email?: string;
  web?: string;
  lastUpdate?: string;
  S2C?: string;
  ranking?: number;
}

export interface HotelBedsRoom {
  code: string;
  name: string;
  description?: string;
  maxPax: number;
  minPax?: number;
  roomFacilities?: Array<{
    facilityCode: string;
    facilityGroupCode: string;
    number?: number;
  }>;
  roomStays?: Array<{
    stayType: string;
    order: string;
    description?: string;
    roomStayFacilities?: Array<{
      facilityCode: string;
      facilityGroupCode: string;
    }>;
  }>;
}

export interface HotelBedsRate {
  rateKey: string;
  rateClass: string;
  rateType: string;
  net: number;
  discount?: number;
  discountPCT?: number;
  sellingRate?: number;
  hotelSellingRate?: number;
  amount?: number;
  hotelCurrency?: string;
  hotelMandatory?: boolean;
  allotment?: number;
  commission?: number;
  commissionVAT?: number;
  commissionPCT?: number;
  cost?: {
    amount: number;
    currency: string;
  };
  checkIn: string;
  checkOut: string;
  boardCode?: string;
  boardName?: string;
  rooms: Array<{
    code: string;
    name: string;
    paxes: Array<{
      roomId: number;
      type: string;
      age?: number;
      name?: string;
      surname?: string;
    }>;
  }>;
  taxes?: {
    allIncluded: boolean;
    tax?: Array<{
      included: boolean;
      percent?: number;
      amount?: number;
      currency?: string;
      type?: string;
      clientAmount?: number;
      clientCurrency?: string;
    }>;
  };
  rateComments?: string;
  paymentType?: string;
  packaging?: boolean;
  cancellationPolicies?: Array<{
    amount: number;
    hotelAmount?: number;
    hotelCurrency?: string;
    from: string;
  }>;
  offers?: Array<{
    code: string;
    name: string;
    amount?: number;
  }>;
  shiftRate?: Array<{
    rateKey: string;
    rateClass: string;
    rateType: string;
    net: number;
    checkIn: string;
    checkOut: string;
  }>;
  dailyRates?: Array<{
    offset: number;
    dailyNet: number;
  }>;
}

export interface HotelBedsActivity {
  code: string;
  name: string;
  type?: string;
  country: {
    code: string;
    name: string;
  };
  destination: {
    code: string;
    name: string;
  };
  category?: {
    code: string;
    name: string;
  };
  modalities?: Array<{
    code: string;
    name: string;
    description?: string;
    duration?: {
      value: number;
      metric: string;
    };
    languages?: Array<{
      code: string;
      name: string;
    }>;
    comments?: Array<{
      type: string;
      text: string;
    }>;
    supplierInformation?: {
      name: string;
      vatNumber: string;
    };
    providerInformation?: {
      name: string;
    };
    destinationCode?: string;
    contract?: {
      incoming: boolean;
      supplier: boolean;
    };
    questions?: Array<{
      code: string;
      text: string;
      required: boolean;
    }>;
    amountsFrom?: Array<{
      paxType: string;
      ageFrom?: number;
      ageTo?: number;
      amount: number;
      currency: string;
      mandatoryApplyAmount: boolean;
    }>;
    rateDetails?: Array<{
      rateKey: string;
      rateClass: string;
      rateType: string;
      net: number;
      discount?: number;
      rateComments?: string;
      paymentType?: string;
      packaging?: boolean;
      boardCode?: string;
      boardName?: string;
      cancellationPolicies?: Array<{
        amount: number;
        hotelAmount?: number;
        hotelCurrency?: string;
        from: string;
      }>;
      taxes?: {
        allIncluded: boolean;
        tax?: Array<{
          included: boolean;
          percent?: number;
          amount?: number;
          currency?: string;
          type?: string;
        }>;
      };
    }>;
  }>;
  geoLocation?: {
    latitude: number;
    longitude: number;
  };
  images?: Array<{
    imageTypeCode: string;
    path: string;
    order?: number;
    visualOrder?: number;
  }>;
  content?: {
    description?: string;
    additionalInfo?: Array<{
      type: string;
      text: string;
    }>;
    media?: Array<{
      type: string;
      url: string;
    }>;
    segmentationGroups?: Array<{
      code: string;
      name: string;
    }>;
    guidingOptions?: Array<{
      guideType: string;
      included: boolean;
    }>;
    scheduling?: Array<{
      timetable: Array<{
        weekdays: string;
        time: string;
      }>;
    }>;
    knowBeforeYouGo?: Array<{
      type: string;
      text: string;
    }>;
    activityFactsheetType?: {
      code: string;
      name: string;
    };
    activityLocation?: Array<{
      type: string;
      code: string;
      name: string;
      description?: string;
      address?: string;
      googlePlaceId?: string;
      location?: {
        latitude: number;
        longitude: number;
      };
    }>;
  };
}

export interface HotelBedsTransfer {
  code: string;
  direction: string;
  type: string;
  vehicle: {
    code: string;
    name: string;
    maxPaxCapacity: number;
    maxLuggageCapacity: number;
  };
  category: {
    code: string;
    name: string;
  };
  images?: Array<{
    url: string;
    type: string;
  }>;
  content?: {
    vehicle: {
      code: string;
      name: string;
      description?: string;
      maxPaxCapacity: number;
      maxLuggageCapacity: number;
      wifi?: boolean;
      airConditioning?: boolean;
    };
    transferType: {
      code: string;
      name: string;
      description?: string;
    };
    supplier: {
      name: string;
      vatNumber?: string;
    };
    transferDetailInfo?: Array<{
      type: string;
      name: string;
      description: string;
    }>;
    customerTransferTimeInfo?: Array<{
      type: string;
      time: string;
      description?: string;
    }>;
    supplierTransferTimeInfo?: Array<{
      type: string;
      time: string;
      description?: string;
    }>;
    transferRemarks?: Array<{
      type: string;
      description: string;
      mandatory: boolean;
    }>;
  };
  factsheets?: Array<{
    code: string;
    order: number;
    name: string;
    description?: string;
  }>;
  rateDetails?: Array<{
    rateKey: string;
    transferType: string;
    direction: string;
    code: string;
    validFrom: string;
    validTo: string;
    adult?: {
      rate: number;
      discount?: number;
      discountPCT?: number;
    };
    child?: {
      rate: number;
      discount?: number;
      discountPCT?: number;
    };
    infant?: {
      rate: number;
      discount?: number;
      discountPCT?: number;
    };
    large?: {
      rate: number;
      discount?: number;
      discountPCT?: number;
    };
    bike?: {
      rate: number;
      discount?: number;
      discountPCT?: number;
    };
    golf?: {
      rate: number;
      discount?: number;
      discountPCT?: number;
    };
    big?: {
      rate: number;
      discount?: number;
      discountPCT?: number;
    };
    wheelchair?: {
      rate: number;
      discount?: number;
      discountPCT?: number;
    };
    boardCode?: string;
    boardName?: string;
    cancellationPolicies?: Array<{
      amount: number;
      hotelAmount?: number;
      hotelCurrency?: string;
      from: string;
    }>;
    taxes?: {
      allIncluded: boolean;
      tax?: Array<{
        included: boolean;
        percent?: number;
        amount?: number;
        currency?: string;
        type?: string;
      }>;
    };
  }>;
}

// Paramètres de recherche
export interface HotelBedsHotelSearchParams {
  stay: {
    checkIn: string;
    checkOut: string;
  };
  occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{
      type: string;
      age?: number;
    }>;
  }>;
  destination?: {
    code: string;
    type: string;
  };
  geolocation?: {
    latitude: number;
    longitude: number;
    radius: number;
    unit: string;
  };
  hotels?: {
    hotel: Array<string>;
  };
  boards?: {
    board: Array<string>;
    included?: boolean;
  };
  rooms?: {
    room: Array<string>;
  };
  dailyRate?: boolean;
  language?: string;
  review?: Array<{
    type: string;
    minRate?: number;
    maxRate?: number;
    minReviewCount?: number;
  }>;
  filter?: {
    maxHotels?: number;
    maxRooms?: number;
    minRate?: number;
    maxRate?: number;
    packaging?: boolean;
    hotelPackage?: string;
  };
  platform?: number;
}

export interface HotelBedsActivitySearchParams {
  filters: Array<{
    searchFilterItems: Array<{
      type: string;
      value: string;
    }>;
  }>;
  from: number;
  to: number;
  language?: string;
  order?: string;
}

export interface HotelBedsTransferSearchParams {
  language?: string;
  from: {
    type: string;
    code: string;
  };
  to: {
    type: string;
    code: string;
  };
  outbound: {
    date: string;
    time: string;
  };
  inbound?: {
    date: string;
    time: string;
  };
  occupancy: {
    adults: number;
    children: number;
    infants: number;
    luggage?: number;
  };
  transferType?: string;
  direction?: string;
}

class HotelBedsService {
  private getServiceEndpoint(serviceType: 'hotels' | 'activities' | 'transfers'): string {
    const endpoints = {
      hotels: '/hotel-api/1.0',
      activities: '/activity-api/3.0',
      transfers: '/transfer-api/1.0'
    };
    return endpoints[serviceType];
  }

  private async callHotelBedsAPI(endpoint: string, params: any, method: string = 'POST', serviceType: 'hotels' | 'activities' | 'transfers' = 'hotels') {
    try {
      const response = await apiClient.post<{ hotels?: any; activities?: any }>('travel/hotelbeds/', {
        endpoint,
        params,
        method,
        serviceType,
      });
      return response;
    } catch (error) {
      console.error('HotelBeds Service Error:', error);
      throw error;
    }
  }

  // Recherche d'hôtels
  async searchHotels(searchParams: HotelBedsHotelSearchParams): Promise<HotelBedsHotel[]> {
    try {
      const response = await this.callHotelBedsAPI('/hotels', searchParams, 'POST', 'hotels');
      
      if (response?.hotels?.hotels) {
        return response.hotels.hotels.map((hotel: any) => ({
          code: hotel.code,
          name: hotel.name,
          description: hotel.description,
          categoryCode: hotel.categoryCode,
          destinationCode: hotel.destinationCode,
          zoneCode: hotel.zoneCode,
          coordinates: hotel.coordinates,
          images: hotel.images || [],
          facilities: hotel.facilities || [],
          phones: hotel.phones || [],
          address: hotel.address,
          postalCode: hotel.postalCode,
          city: hotel.city,
          email: hotel.email,
          web: hotel.web,
          lastUpdate: hotel.lastUpdate,
          S2C: hotel.S2C,
          ranking: hotel.ranking
        }));
      }

      return [];
    } catch (error) {
      console.error('Erreur lors de la recherche d\'hôtels HotelBeds:', error);
      return [];
    }
  }

  // Détails d'un hôtel spécifique
  async getHotelDetails(hotelCode: string, checkIn: string, checkOut: string, occupancy: any): Promise<HotelBedsHotel | null> {
    try {
      const searchParams: HotelBedsHotelSearchParams = {
        stay: { checkIn, checkOut },
        occupancies: [occupancy],
        hotels: { hotel: [hotelCode] }
      };

      const hotels = await this.searchHotels(searchParams);
      return hotels.length > 0 ? hotels[0] : null;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de l\'hôtel:', error);
      return null;
    }
  }

  // Recherche d'activités
  async searchActivities(searchParams: HotelBedsActivitySearchParams): Promise<HotelBedsActivity[]> {
    try {
      const response = await this.callHotelBedsAPI('/activities', searchParams, 'POST', 'activities');
      
      if (response?.activities) {
        return response.activities.map((activity: any) => ({
          code: activity.code,
          name: activity.name,
          type: activity.type,
          country: activity.country,
          destination: activity.destination,
          category: activity.category,
          modalities: activity.modalities || [],
          geoLocation: activity.geoLocation,
          images: activity.images || [],
          content: activity.content
        }));
      }

      return [];
    } catch (error) {
      console.error('Erreur lors de la recherche d\'activités HotelBeds:', error);
      return [];
    }
  }

  // Recherche d'activités par destination
  async searchActivitiesByDestination(destinationCode: string, from: number = 1, to: number = 20): Promise<HotelBedsActivity[]> {
    const searchParams: HotelBedsActivitySearchParams = {
      filters: [{
        searchFilterItems: [{
          type: 'destination',
          value: destinationCode
        }]
      }],
      from,
      to,
      language: 'fr'
    };

    return this.searchActivities(searchParams);
  }

  // Recherche de transferts
  async searchTransfers(searchParams: HotelBedsTransferSearchParams): Promise<HotelBedsTransfer[]> {
    try {
      const response = await this.callHotelBedsAPI('/availability', searchParams, 'POST', 'transfers');
      
      if (response?.services) {
        return response.services.map((transfer: any) => ({
          code: transfer.code,
          direction: transfer.direction,
          type: transfer.type,
          vehicle: transfer.vehicle,
          category: transfer.category,
          images: transfer.images || [],
          content: transfer.content,
          factsheets: transfer.factsheets || [],
          rateDetails: transfer.rateDetails || []
        }));
      }

      return [];
    } catch (error) {
      console.error('Erreur lors de la recherche de transferts HotelBeds:', error);
      return [];
    }
  }

  // Recherche de transferts par destination
  async searchTransfersByRoute(
    fromCode: string, 
    toCode: string, 
    date: string, 
    time: string = '10:00',
    occupancy: { adults: number; children: number; infants: number } = { adults: 2, children: 0, infants: 0 }
  ): Promise<HotelBedsTransfer[]> {
    const searchParams: HotelBedsTransferSearchParams = {
      language: 'fr',
      from: { type: 'ATLAS', code: fromCode },
      to: { type: 'ATLAS', code: toCode },
      outbound: { date, time },
      occupancy,
      transferType: 'PRIVATE'
    };

    return this.searchTransfers(searchParams);
  }

  // Formatage du prix
  formatPrice(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  // Calcul du nombre de nuits
  calculateNights(checkInDate: string, checkOutDate: string): number {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Obtenir la meilleure image pour un hôtel
  getBestHotelImage(hotel: HotelBedsHotel): string | null {
    if (!hotel.images || hotel.images.length === 0) return null;
    
    // Prioriser les images de type HAB (habitación/room) puis GEN (general)
    const priorityOrder = ['HAB', 'GEN', 'RES', 'LOB', 'BAR', 'SPA', 'PIS'];
    
    for (const type of priorityOrder) {
      const image = hotel.images.find(img => img.imageTypeCode === type);
      if (image) {
        return `https://photos.hotelbeds.com/giata/original/${image.path}`;
      }
    }
    
    // Fallback sur la première image disponible
    return hotel.images[0] ? `https://photos.hotelbeds.com/giata/original/${hotel.images[0].path}` : null;
  }

  // Obtenir la meilleure image pour une activité
  getBestActivityImage(activity: HotelBedsActivity): string | null {
    if (!activity.images || activity.images.length === 0) return null;
    
    // Trier par ordre visuel puis par ordre standard
    const sortedImages = activity.images.sort((a, b) => {
      if (a.visualOrder && b.visualOrder) {
        return a.visualOrder - b.visualOrder;
      }
      if (a.order && b.order) {
        return a.order - b.order;
      }
      return 0;
    });
    
    return sortedImages[0] ? `https://photos.hotelbeds.com/giata/original/${sortedImages[0].path}` : null;
  }

  // Obtenir toutes les images d'un hôtel par type
  getHotelImagesByType(hotel: HotelBedsHotel): { [key: string]: string[] } {
    if (!hotel.images) return {};
    
    const imagesByType: { [key: string]: string[] } = {};
    
    hotel.images.forEach(image => {
      const type = image.imageTypeCode || 'OTHER';
      if (!imagesByType[type]) {
        imagesByType[type] = [];
      }
      imagesByType[type].push(`https://photos.hotelbeds.com/giata/original/${image.path}`);
    });
    
    return imagesByType;
  }

  // Vérifier la disponibilité d'un hôtel
  async checkHotelAvailability(hotelCode: string, checkIn: string, checkOut: string, occupancy: any): Promise<boolean> {
    try {
      const hotel = await this.getHotelDetails(hotelCode, checkIn, checkOut, occupancy);
      return hotel !== null;
    } catch (error) {
      console.error('Erreur lors de la vérification de disponibilité:', error);
      return false;
    }
  }
}

// Instance exportée du service
export const hotelBedsService = new HotelBedsService();
