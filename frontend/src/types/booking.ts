export type BookingType = 'hotel' | 'flight' | 'restaurant' | 'activity' | 'transfer';
export type BookingSourceType = 'internal' | 'external';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface UnifiedBooking {
  id?: string;
  user_id?: string;
  booking_reference: string;
  booking_type: BookingType;
  source_type: BookingSourceType;
  source_provider: string;
  item_name: string;
  item_description?: string;
  booking_url?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_date: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  total_amount: number;
  currency: string;
  commission_amount?: number;
  commission_rate?: number;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  booking_details?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface BookingItem {
  id?: string;
  name: string;
  description?: string;
  price: {
    amount: number;
    currency: string;
  };
  bookingUrl?: string;
  sourceType: BookingSourceType;
  sourceProvider: string;
  // Type-specific data
  [key: string]: any;
}

export interface BookingRequest {
  item: BookingItem;
  bookingType: BookingType;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  dates?: {
    start?: string;
    end?: string;
    time?: string;
  };
  participants?: number;
  specialRequests?: string;
}

export interface BookingResult {
  success: boolean;
  booking?: UnifiedBooking;
  redirectUrl?: string;
  message?: string;
  error?: string;
}