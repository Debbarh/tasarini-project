import { BookingItem, BookingRequest, BookingResult, BookingType, UnifiedBooking } from '@/types/booking';
import { PartnerBookingAdapter } from './partnerBookingAdapter';
import { userPreferencesService } from './userPreferencesService';
import { apiClient } from '@/integrations/api/client';

export class BookingRouterService {
  /**
   * Route a booking request to the appropriate handler
   */
  async routeBooking(request: BookingRequest): Promise<BookingResult> {
    try {
      const { item, bookingType, customerInfo, dates, participants, specialRequests } = request;

      // Generate booking reference
      const bookingReference = this.generateBookingReference(bookingType);

      // Create unified booking record
      const unifiedBooking: UnifiedBooking = {
        booking_reference: bookingReference,
        booking_type: bookingType,
        source_type: item.sourceType,
        source_provider: item.sourceProvider,
        item_name: item.name,
        item_description: item.description,
        booking_url: item.bookingUrl,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        booking_date: new Date().toISOString().split('T')[0],
        start_date: dates?.start,
        end_date: dates?.end,
        start_time: dates?.time,
        total_amount: item.price.amount,
        currency: item.price.currency,
        booking_status: 'pending',
        payment_status: 'pending',
        booking_details: {
          participants,
          special_requests: specialRequests,
          original_item_data: item
        }
      };

      // Check if this is a partner POI with booking system
      const partnerBookingInfo = await PartnerBookingAdapter.checkPartnerBooking(item.id);
      
      if (partnerBookingInfo) {
        return await PartnerBookingAdapter.processPartnerBooking(unifiedBooking, request, partnerBookingInfo);
      }

      // Handle internal vs external bookings
      if (item.sourceType === 'internal') {
        return await this.handleInternalBooking(unifiedBooking, request);
      } else {
        return await this.handleExternalBooking(unifiedBooking, request);
      }
    } catch (error) {
      console.error('Booking routing error:', error);
      return {
        success: false,
        error: 'Erreur lors du traitement de la réservation'
      };
    }
  }

  /**
   * Handle internal bookings (redirect to existing booking components)
   */
  private async handleInternalBooking(booking: UnifiedBooking, request: BookingRequest): Promise<BookingResult> {
    try {
      const userProfile = await userPreferencesService.getUserProfile();
      const enrichedBooking: UnifiedBooking = {
        ...booking,
        user_id: userProfile?.userId ?? 'guest',
        metadata: {
          ...booking.metadata,
          simulated: true,
        },
      };

      return {
        success: true,
        booking: enrichedBooking,
        message: 'Réservation interne initiée avec succès'
      };
    } catch (error) {
      console.error('Internal booking error:', error);
      return {
        success: false,
        error: 'Erreur lors de la réservation interne'
      };
    }
  }

  /**
   * Handle external bookings (redirect to external provider)
   */
  private async handleExternalBooking(booking: UnifiedBooking, request: BookingRequest): Promise<BookingResult> {
    try {
      const userProfile = await userPreferencesService.getUserProfile();
      const bookingWithMetadata = {
        ...booking,
        booking_status: 'pending' as const,
        user_id: userProfile?.userId ?? 'guest',
        metadata: {
          ...booking.metadata,
          external_redirect: true,
          redirect_timestamp: new Date().toISOString()
        }
      };

      // Generate redirect URL with tracking parameters
      const redirectUrl = this.buildRedirectUrl(request.item.bookingUrl!, booking.booking_reference);

      return {
        success: true,
        booking: bookingWithMetadata,
        redirectUrl,
        message: 'Redirection vers le partenaire externe'
      };
    } catch (error) {
      console.error('External booking error:', error);
      return {
        success: false,
        error: 'Erreur lors de la redirection externe'
      };
    }
  }

  /**
   * Build redirect URL with tracking parameters
   */
  private buildRedirectUrl(baseUrl: string, bookingId: string): string {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('ref', 'lovable-travel');
      url.searchParams.set('booking_id', bookingId);
      return url.toString();
    } catch {
      // Fallback if URL parsing fails
      return baseUrl;
    }
  }

  /**
   * Generate unique booking reference
   */
  private generateBookingReference(type: BookingType): string {
    const prefix = {
      hotel: 'HTL',
      flight: 'FLT',
      restaurant: 'RST',
      activity: 'ACT',
      transfer: 'TRF'
    }[type];

    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Update booking status (for webhooks/confirmations)
   */
  async updateBookingStatus(bookingId: string, status: 'confirmed' | 'cancelled' | 'completed'): Promise<boolean> {
    try {
      await apiClient.patch(`bookings/reservations/${bookingId}/`, { status });
      return true;
    } catch (error) {
      console.error('Update booking status error:', error);
      return false;
    }
  }

  /**
   * Get user bookings
   */
  async getUserBookings(userId: string): Promise<UnifiedBooking[]> {
    try {
      const bookings = await apiClient.get<any[]>('user/bookings/', { days: 365 });
      return (bookings || []).map((booking) => ({
        booking_reference: booking.id,
        booking_type: booking.metadata?.booking_type ?? 'hotel',
        source_type: 'internal',
        source_provider: 'tasarini',
        item_name: booking.metadata?.destination ?? 'Réservation',
        item_description: '',
        booking_url: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        booking_date: booking.created_at,
        start_date: booking.metadata?.start_date,
        end_date: booking.metadata?.end_date,
        start_time: undefined,
        total_amount: booking.total_amount,
        currency: 'EUR',
        booking_status: booking.status,
        payment_status: 'pending',
        booking_details: booking.metadata,
      }));
    } catch (error) {
      console.error('Get user bookings error:', error);
      return [];
    }
  }
}

export const bookingRouterService = new BookingRouterService();
