import { BookingRequest, BookingResult, UnifiedBooking } from '@/types/booking';
import { partnerService, PartnerBookingConfig } from '@/services/partnerService';

interface PartnerBookingInfo {
  partnerId: string;
  config: PartnerBookingConfig;
  touristPointId: string;
}

export class PartnerBookingAdapter {
  
  static async checkPartnerBooking(touristPointId?: string): Promise<PartnerBookingInfo | null> {
    if (!touristPointId) return null;
    
    try {
      const config = await partnerService.getBookingConfigByPoint(touristPointId);
      if (!config || !config.is_active) {
        return null;
      }

      return {
        partnerId: String(config.partner),
        config,
        touristPointId: touristPointId
      };
    } catch (error) {
      console.error('Error checking partner booking system:', error);
      return null;
    }
  }

  static async processPartnerBooking(
    booking: UnifiedBooking, 
    request: BookingRequest, 
    partnerInfo: PartnerBookingInfo
  ): Promise<BookingResult> {
    const { config, partnerId, touristPointId } = partnerInfo;

    try {
      // Save booking transaction for tracking
      await this.saveBookingTransaction(booking, request, partnerInfo);

      switch (config.system_type) {
        case 'external':
          return this.handleExternalRedirect(booking, config);
        
        case 'api':
          return await this.handleApiBooking(booking, request, config);
        
        case 'webhook':
          return await this.handleWebhookBooking(booking, request, config);
        
        default:
          throw new Error(`Unsupported booking system type: ${config.system_type}`);
      }
    } catch (error) {
      console.error('Error processing partner booking:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du traitement de la réservation partenaire'
      };
    }
  }

  private static async saveBookingTransaction(
    booking: UnifiedBooking, 
    request: BookingRequest, 
    partnerInfo: PartnerBookingInfo
  ) {
    const { partnerId, touristPointId } = partnerInfo;
    
    // Calculate commission (basic rate - could be enhanced with partner subscription logic)
    const commissionRate = 0.15; // 15% default
    const commissionAmount = booking.total_amount * commissionRate;

    const transactionData = {
      booking_reference: booking.booking_reference,
      tourist_point_id: touristPointId,
      partner_id: partnerId,
      customer_email: booking.customer_email,
      customer_name: booking.customer_name,
      booking_amount: booking.total_amount,
      commission_amount: commissionAmount,
      commission_rate: commissionRate,
      booking_status: 'pending',
      booking_data: {
        booking_type: booking.booking_type,
        dates: request.dates,
        participants: request.participants,
        special_requests: request.specialRequests
      }
    };

    console.debug('Partner booking transaction (mock)', transactionData);
  }

  private static handleExternalRedirect(
    booking: UnifiedBooking, 
    config: PartnerBookingConfig
  ): BookingResult {
    if (!config.endpoint_url) {
      return {
        success: false,
        error: 'URL de redirection non configurée'
      };
    }

    // Build redirect URL with booking parameters
    const url = new URL(config.endpoint_url);
    url.searchParams.set('booking_ref', booking.booking_reference);
    url.searchParams.set('customer_name', booking.customer_name);
    url.searchParams.set('customer_email', booking.customer_email);
    url.searchParams.set('amount', booking.total_amount.toString());
    
    // Add custom fields if configured
    if (config.custom_fields) {
      Object.entries(config.custom_fields).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    return {
      success: true,
      booking: booking,
      redirectUrl: url.toString(),
      message: 'Redirection vers le système de réservation du partenaire'
    };
  }

  private static async handleApiBooking(
    booking: UnifiedBooking, 
    request: BookingRequest, 
    config: PartnerBookingConfig
  ): Promise<BookingResult> {
    if (!config.endpoint_url || !config.api_credentials) {
      return {
        success: false,
        error: 'Configuration API incomplète'
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add authentication headers
      if (config.api_credentials.api_key) {
        const authHeader = config.api_credentials.auth_header || 'Authorization';
        headers[authHeader] = `Bearer ${config.api_credentials.api_key}`;
      }

      const payload = {
        booking_reference: booking.booking_reference,
        customer: {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone
        },
        booking_details: {
          type: booking.booking_type,
          item_name: booking.item_name,
          amount: booking.total_amount,
          currency: booking.currency,
          dates: request.dates,
          participants: request.participants,
          special_requests: request.specialRequests
        },
        test_mode: config.test_mode
      };

      const response = await fetch(config.endpoint_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        booking: {
          ...booking,
          metadata: {
            ...booking.metadata,
            external_booking_id: result.booking_id,
            api_response: result
          }
        },
        message: 'Réservation transmise avec succès au partenaire'
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur API partenaire: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  private static async handleWebhookBooking(
    booking: UnifiedBooking, 
    request: BookingRequest, 
    config: PartnerBookingConfig
  ): Promise<BookingResult> {
    if (!config.webhook_url) {
      return {
        success: false,
        error: 'URL webhook non configurée'
      };
    }

    try {
      const payload = {
        event: 'booking_created',
        booking_reference: booking.booking_reference,
        timestamp: new Date().toISOString(),
        data: {
          booking: booking,
          request: request,
          test_mode: config.test_mode
        }
      };

      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Type': 'booking_created'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook Error: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        booking: booking,
        message: 'Réservation transmise au partenaire via webhook'
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur webhook: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  static async updateBookingStatus(
    bookingReference: string, 
    status: 'confirmed' | 'cancelled' | 'completed',
    externalBookingId?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { booking_status: status };
      if (externalBookingId) {
        updateData.external_booking_id = externalBookingId;
      }

      console.debug('Partner booking status update (mock)', bookingReference, status, updateData);
      return true;
    } catch (error) {
      console.error('Error updating booking status:', error);
      return false;
    }
  }
}
