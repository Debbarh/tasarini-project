import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, MapPin } from 'lucide-react';
import { UnifiedBookingDialog } from '@/components/booking/UnifiedBookingDialog';
import { BookingItem, BookingType } from '@/types/booking';

interface PartnerBookingButtonProps {
  touristPoint: {
    id: string;
    name: string;
    description?: string;
    price_range?: string;
    has_booking_system?: boolean;
    booking_system_type?: 'redirect' | 'api' | 'webhook';
    booking_instructions?: string;
  };
  bookingType: BookingType;
  variant?: 'default' | 'compact' | 'outline';
  className?: string;
}

export const PartnerBookingButton: React.FC<PartnerBookingButtonProps> = ({
  touristPoint,
  bookingType,
  variant = 'default',
  className = ''
}) => {
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  // Convert tourist point to booking item format
  const createBookingItem = (): BookingItem => ({
    id: touristPoint.id,
    name: touristPoint.name,
    description: touristPoint.description || '',
    location: '',
    address: '',
    coordinates: { lat: 0, lng: 0 },
    price: {
      amount: 0,
      currency: 'EUR'
    },
    sourceType: touristPoint.has_booking_system ? 'external' : 'internal',
    sourceProvider: touristPoint.has_booking_system ? 'partner' : 'internal',
    externalData: touristPoint.has_booking_system ? {
      provider: 'partner',
      bookingUrl: '',
      partnerId: touristPoint.id
    } : undefined
  });

  const handleBookingClick = () => {
    setShowBookingDialog(true);
  };

  // Don't show button if no booking system is configured
  if (!touristPoint.has_booking_system && bookingType !== 'activity') {
    return null;
  }

  const isExternal = touristPoint.has_booking_system;
  const buttonText = isExternal ? 'Réserver' : 'Réserver';
  const buttonIcon = isExternal ? ExternalLink : Calendar;

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return 'h-8 px-3 text-xs';
      case 'outline':
        return 'variant-outline';
      default:
        return '';
    }
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          onClick={handleBookingClick}
          variant={variant === 'outline' ? 'outline' : 'default'}
          size={variant === 'compact' ? 'sm' : 'default'}
          className={getVariantStyles()}
        >
          {React.createElement(buttonIcon, { className: 'h-4 w-4 mr-2' })}
          {buttonText}
        </Button>

        {isExternal && (
          <Badge variant="secondary" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            Partenaire
          </Badge>
        )}
      </div>

      <UnifiedBookingDialog
        isOpen={showBookingDialog}
        onClose={() => setShowBookingDialog(false)}
        item={createBookingItem()}
        bookingType={bookingType}
      />
    </>
  );
};