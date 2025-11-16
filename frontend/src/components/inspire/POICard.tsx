import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, ExternalLink, Calendar } from 'lucide-react';
import { POIFavoriteButton } from './POIFavoriteButton';
import { PartnerBookingButton } from '@/components/partner/PartnerBookingButton';
import { BookingType } from '@/types/booking';

interface POI {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  rating?: number;
  price_range?: string;
  latitude?: number;
  longitude?: number;
  has_booking_system?: boolean;
  booking_system_type?: 'redirect' | 'api' | 'webhook';
  booking_instructions?: string;
  is_partner_point?: boolean;
  media_images?: string[];
}

interface POICardProps {
  poi: POI;
  onSelect?: (poi: POI) => void;
  variant?: 'default' | 'compact' | 'featured';
  showBooking?: boolean;
}

export const POICard: React.FC<POICardProps> = ({
  poi,
  onSelect,
  variant = 'default',
  showBooking = true
}) => {
  const getBookingType = (): BookingType => {
    if (poi.tags?.some(tag => 
      ['restaurant', 'café', 'bar', 'bistrot'].some(keyword => 
        tag.toLowerCase().includes(keyword)
      )
    )) {
      return 'restaurant';
    }
    
    if (poi.tags?.some(tag => 
      ['activité', 'sport', 'aventure', 'tour', 'visite'].some(keyword => 
        tag.toLowerCase().includes(keyword)
      )
    )) {
      return 'activity';
    }
    
    return 'activity'; // Default fallback
  };

  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <Card 
      className={`
        hover-scale cursor-pointer transition-all duration-200
        ${isFeatured ? 'ring-2 ring-primary/20 shadow-lg' : ''}
        ${isCompact ? 'h-auto' : 'h-full'}
      `}
      onClick={() => onSelect?.(poi)}
    >
      <CardContent className={`p-${isCompact ? '3' : '4'}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold line-clamp-1 ${isCompact ? 'text-sm' : 'text-base'}`}>
              {poi.name}
            </h3>
            
            {/* Rating & Price */}
            <div className="flex items-center gap-2 mt-1">
              {poi.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  <span className="text-xs font-medium">{poi.rating}</span>
                </div>
              )}
              
              {poi.price_range && (
                <Badge variant="outline" className="text-xs">
                  {poi.price_range}
                </Badge>
              )}
              
              {poi.is_partner_point && (
                <Badge variant="secondary" className="text-xs">
                  <ExternalLink className="w-2 h-2 mr-1" />
                  Partenaire
                </Badge>
              )}
            </div>
          </div>
          
          <POIFavoriteButton touristPointId={poi.id} />
        </div>

        {/* Description */}
        {!isCompact && poi.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {poi.description}
          </p>
        )}

        {/* Tags */}
        {poi.tags && poi.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {poi.tags.slice(0, isCompact ? 2 : 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {poi.tags.length > (isCompact ? 2 : 3) && (
              <Badge variant="outline" className="text-xs">
                +{poi.tags.length - (isCompact ? 2 : 3)}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size={isCompact ? "sm" : "default"}
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              if (poi.latitude && poi.longitude) {
                window.location.href = `/inspire?lat=${poi.latitude}&lng=${poi.longitude}`;
              }
            }}
          >
            <MapPin className="w-3 h-3 mr-1" />
            <span className={isCompact ? "text-xs" : "text-sm"}>Carte</span>
          </Button>

          {/* Partner Booking Button */}
          {showBooking && poi.has_booking_system && (
            <PartnerBookingButton
              touristPoint={{
                id: poi.id,
                name: poi.name,
                description: poi.description,
                price_range: poi.price_range,
                has_booking_system: poi.has_booking_system,
                booking_system_type: poi.booking_system_type,
                booking_instructions: poi.booking_instructions
              }}
              bookingType={getBookingType()}
              variant={isCompact ? 'compact' : 'default'}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};