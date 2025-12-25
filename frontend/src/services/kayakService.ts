import { apiClient } from '@/integrations/api/client';

export interface KayakHotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  rooms?: number;
}

export interface KayakFlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
}

export interface KayakHotel {
  code: string;
  name: string;
  address?: string;
  city?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  minRate?: number;
  currency?: string;
  imageUrl?: string;
  description?: string;
  provider: string;
}

export interface KayakFlight {
  id: string;
  airline: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: {
    amount: number;
    currency: string;
  };
  provider: string;
}

class KayakService {
  private baseUrl = 'travel/kayak';

  /**
   * Search hotels using Kayak API
   */
  async searchHotels(params: KayakHotelSearchParams): Promise<KayakHotel[]> {
    try {
      const response = await apiClient.post<{ hotels: KayakHotel[] }>(
        `${this.baseUrl}/hotels/`,
        {
          destination: params.destination,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          adults: params.adults || 2,
          rooms: params.rooms || 1,
        }
      );

      return response.hotels || [];
    } catch (error: any) {
      console.error('❌ Kayak hotel search error:', error);
      throw new Error(error?.message || 'Erreur lors de la recherche d\'hôtels avec Kayak');
    }
  }

  /**
   * Search flights using Kayak API
   */
  async searchFlights(params: KayakFlightSearchParams): Promise<KayakFlight[]> {
    try {
      const response = await apiClient.post<{ flights: KayakFlight[] }>(
        `${this.baseUrl}/flights/`,
        {
          origin: params.origin,
          destination: params.destination,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          passengers: params.passengers || 1,
        }
      );

      return response.flights || [];
    } catch (error: any) {
      console.error('❌ Kayak flight search error:', error);
      throw new Error(error?.message || 'Erreur lors de la recherche de vols avec Kayak');
    }
  }

  /**
   * Search car rentals using Kayak API
   */
  async searchCarRentals(params: {
    location: string;
    pickupDate: string;
    dropoffDate: string;
    pickupTime?: string;
    dropoffTime?: string;
  }): Promise<any[]> {
    try {
      const response = await apiClient.post<{ cars: any[] }>(
        `${this.baseUrl}/cars/`,
        {
          location: params.location,
          pickupDate: params.pickupDate,
          dropoffDate: params.dropoffDate,
          pickupTime: params.pickupTime || '10:00',
          dropoffTime: params.dropoffTime || '10:00',
        }
      );

      return response.cars || [];
    } catch (error: any) {
      console.error('❌ Kayak car rental search error:', error);
      throw new Error(error?.message || 'Erreur lors de la recherche de voitures avec Kayak');
    }
  }
}

export const kayakService = new KayakService();
