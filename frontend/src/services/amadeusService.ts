import { apiClient } from "@/integrations/api/client";
import { amadeusTestEnhancer } from './amadeusTestEnhancer';

// Amadeus Hotel Search Types
export interface AmadeusHotelOffer {
  id: string;
  name: string;
  location: {
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  rating?: number;
  price: {
    amount: number;
    currency: string;
    period?: string;
  };
  amenities: string[];
  images: string[];
  description?: string;
  hotelId: string;
  checkInDate: string;
  checkOutDate: string;
  roomType?: string;
  bookingUrl?: string;
}

export interface AmadeusHotelSearchParams {
  cityCode?: string;
  latitude?: number;
  longitude?: number;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  rooms?: number;
  radius?: number;
  radiusUnit?: 'KM' | 'MILE';
  currency?: string;
  priceRange?: string;
  hotelSource?: string;
}

export interface AmadeusHotelDetails {
  id: string;
  name: string;
  description: string;
  location: {
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  rating?: number;
  amenities: string[];
  images: string[];
  rooms: Array<{
    type: string;
    description: string;
    amenities: string[];
    price: {
      amount: number;
      currency: string;
    };
    availability: boolean;
  }>;
  policies: {
    checkIn: string;
    checkOut: string;
    cancellation: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

// Amadeus Flight Search Types
export interface AmadeusFlightOffer {
  id: string;
  type: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  paymentCardRequired: boolean;
  lastTicketingDate?: string;
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        terminal?: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        terminal?: string;
        at: string;
      };
      carrierCode: string;
      number: string;
      aircraft?: any;
      operating?: any;
      duration: string;
      stops: number;
    }>;
  }>;
  price: {
    currency: string;
    total: number;
    base: number;
    fees: Array<{
      amount: number;
      type: string;
    }>;
    grandTotal: number;
    billingCurrency: string;
  };
  pricingOptions?: any;
  validatingAirlineCodes: string[];
  travelerPricings?: any[];
}

export interface AmadeusFlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  currencyCode?: string;
}

class AmadeusService {
  private async callAmadeusAPI(endpoint: string, params: any) {
    try {
      const response = await apiClient.post<{ data: any }>('travel/amadeus/', {
        endpoint,
        params,
      });
      return response;
    } catch (error) {
      console.error('Amadeus service error:', error);
      throw error;
    }
  }

  async searchHotels(searchParams: AmadeusHotelSearchParams): Promise<AmadeusHotelOffer[]> {
    // Track API usage for test environment
    await amadeusTestEnhancer.trackApiUsage('hotel-search', searchParams);
    
    const { data } = await this.callAmadeusAPI('hotel-search', searchParams);
    const hotels = data?.hotels || [];
    
    // Enhance hotel data for test APIs
    return await amadeusTestEnhancer.enhanceHotelOffers(hotels);
  }

  async getHotelDetails(hotelId: string, checkInDate: string, checkOutDate: string, adults: number): Promise<AmadeusHotelDetails | null> {
    await amadeusTestEnhancer.trackApiUsage('hotel-details', { hotelId });
    
    const { data } = await this.callAmadeusAPI('hotel-details', {
      hotelId,
      checkInDate,
      checkOutDate,
      adults
    });
    
    const hotel = data?.hotel;
    if (!hotel) return null;
    
    return await amadeusTestEnhancer.enhanceHotelDetails(hotel);
  }

  async getCityCode(cityName: string): Promise<string | null> {
    try {
      await amadeusTestEnhancer.trackApiUsage('city-search', { cityName });
      const { data } = await this.callAmadeusAPI('city-search', { cityName });
      return data?.cityCode || null;
    } catch (error) {
      console.error('Error getting city code:', error);
      return null;
    }
  }

  async searchHotelsByLocation(
    latitude: number, 
    longitude: number, 
    checkInDate: string, 
    checkOutDate: string, 
    adults: number = 1,
    radius: number = 10
  ): Promise<AmadeusHotelOffer[]> {
    return this.searchHotels({
      latitude,
      longitude,
      checkInDate,
      checkOutDate,
      adults,
      radius,
      radiusUnit: 'KM'
    });
  }

  async searchHotelsByCity(
    cityName: string, 
    checkInDate: string, 
    checkOutDate: string, 
    adults: number = 1
  ): Promise<AmadeusHotelOffer[]> {
    const cityCode = await this.getCityCode(cityName);
    if (!cityCode) {
      throw new Error(`City code not found for: ${cityName}`);
    }

    return this.searchHotels({
      cityCode,
      checkInDate,
      checkOutDate,
      adults
    });
  }

  async searchFlights(searchParams: AmadeusFlightSearchParams): Promise<AmadeusFlightOffer[]> {
    await amadeusTestEnhancer.trackApiUsage('flight-search', searchParams);
    
    const { data } = await this.callAmadeusAPI('flight-search', searchParams);
    const flights = data?.flights || [];
    
    // Add test booking URLs to flights
    return flights.map(flight => ({
      ...flight,
      testBookingUrl: amadeusTestEnhancer.generateTestFlightUrl(flight)
    }));
  }

  async searchFlightsByRoute(
    originCity: string,
    destinationCity: string, 
    departureDate: string,
    returnDate?: string,
    adults: number = 1
  ): Promise<AmadeusFlightOffer[]> {
    const originCode = await this.getCityCode(originCity);
    const destinationCode = await this.getCityCode(destinationCity);
    
    if (!originCode || !destinationCode) {
      throw new Error(`City codes not found for: ${originCity} or ${destinationCity}`);
    }

    return this.searchFlights({
      origin: originCode,
      destination: destinationCode,
      departureDate,
      returnDate,
      adults
    });
  }

  // Helper method to format price for display
  formatPrice(price: { amount: number; currency: string }): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: price.currency
    }).format(price.amount);
  }

  // Helper method to calculate nights between dates
  calculateNights(checkInDate: string, checkOutDate: string): number {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
}

export const amadeusService = new AmadeusService();
