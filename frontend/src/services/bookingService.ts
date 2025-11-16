import { apiClient } from '@/integrations/api/client';

export interface BookingUserSummary {
  id: number;
  email: string;
  display_name?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  };
}

export interface BookingRoomSummary {
  id: number;
  name: string;
  tourist_point: string;
  tourist_point_detail?: {
    id: string;
    name: string;
    [key: string]: any;
  };
}

export interface Reservation {
  id: number;
  room: number;
  room_detail: BookingRoomSummary;
  user: number;
  user_detail?: BookingUserSummary;
  check_in: string;
  check_out: string;
  guests: number;
  total_amount: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  created_at: string;
  updated_at: string;
}

export const bookingService = {
  listReservations(params: { status?: string; scope?: 'partner' | 'user' } = {}) {
    return apiClient.get<Reservation[]>('bookings/reservations/', params);
  },

  updateReservation(id: number | string, payload: Partial<Pick<Reservation, 'status' | 'special_requests'>>) {
    return apiClient.patch<Reservation>(`bookings/reservations/${id}/`, payload);
  },
};
