import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Phone, Mail, Globe, Clock, Euro, Wifi } from 'lucide-react';
import PartnerBadge from '@/components/partner/PartnerBadge';
import { PartnerBookingButton } from '@/components/partner/PartnerBookingButton';

interface TouristPoint {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  tags: string[];
  contact_phone: string;
  contact_email: string;
  website_url: string;
  opening_hours: any;
  price_range: string;
  amenities: string[];
  media_images: string[];
  media_videos: string[];
  is_partner_point: boolean;
  partner_featured: boolean;
  partner_badge_text: string;
  has_booking_system?: boolean;
  booking_system_type?: string;
  created_at: string;
}

interface TouristPointCardProps {
  point: TouristPoint;
  variant?: 'default' | 'compact' | 'featured';
  showActions?: boolean;
  onEdit?: (pointId: string) => void;
  onDelete?: (pointId: string) => void;
}

const TouristPointCard: React.FC<TouristPointCardProps> = ({
  point,
  variant = 'default',
  showActions = false,
  onEdit,
  onDelete
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const formatRating = (rating: number) => {
    return rating > 0 ? rating.toFixed(1) : '0.0';
  };

  const formatPriceRange = (range: string) => {
    switch (range) {
      case '€': return 'Budget';
      case '€€': return 'Modéré';
      case '€€€': return 'Élevé';
      case '€€€€': return 'Luxe';
      default: return range;
    }
  };

  const getMainImage = () => {
    if (point.media_images && point.media_images.length > 0) {
      // Vérifier que l'URL n'est pas vide ou corrompue
      const imageUrl = point.media_images[0];
      if (imageUrl && imageUrl.trim() !== '' && imageUrl.includes('supabase')) {
        return imageUrl;
      }
    }
    return null;
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const cardClasses = {
    default: 'h-auto',
    compact: 'h-32',
    featured: 'h-auto border-2 border-primary/20 shadow-lg'
  };

  const imageHeight = {
    default: 'h-48',
    compact: 'h-20',
    featured: 'h-56'
  };

  return (
    <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${cardClasses[variant]} ${point.partner_featured ? 'ring-2 ring-yellow-400/50' : ''}`}>
      {/* Image */}
      {variant !== 'compact' && getMainImage() && !imageError && (
        <div className={`relative ${imageHeight[variant]} overflow-hidden bg-muted`}>
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          <img
            src={getMainImage()!}
            alt={point.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          
          {/* Badges en overlay */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-2">
            <PartnerBadge
              isPartner={point.is_partner_point}
              partnerBadgeText={point.partner_badge_text}
              isFeatured={point.partner_featured}
              variant="small"
            />
          </div>

          {/* Rating en overlay */}
          {point.rating > 0 && (
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-yellow-400" />
              {formatRating(point.rating)}
            </div>
          )}
        </div>
      )}

      <CardContent className={variant === 'compact' ? 'p-3' : 'p-4'}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className={`font-semibold ${variant === 'compact' ? 'text-sm' : 'text-lg'} line-clamp-1`}>
              {point.name}
            </h3>
            
            {variant === 'compact' ? (
              // Version compacte
              <div className="flex items-center gap-2 mt-1">
                <PartnerBadge
                  isPartner={point.is_partner_point}
                  partnerBadgeText={point.partner_badge_text}
                  isFeatured={point.partner_featured}
                  variant="small"
                />
                {point.rating > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="w-3 h-3 fill-current text-yellow-400" />
                    {formatRating(point.rating)}
                  </div>
                )}
              </div>
            ) : (
              // Version complète
              <>
                {point.address && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3" />
                    {point.address}
                  </div>
                )}

                {point.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {point.description}
                  </p>
                )}

                {/* Badges et infos */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <PartnerBadge
                    isPartner={point.is_partner_point}
                    partnerBadgeText={point.partner_badge_text}
                    isFeatured={point.partner_featured}
                    variant="small"
                  />
                  
                  {point.rating > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Star className="w-3 h-3 mr-1 fill-current text-yellow-400" />
                      {formatRating(point.rating)} ({point.review_count})
                    </Badge>
                  )}
                  
                  {point.price_range && (
                    <Badge variant="outline" className="text-xs">
                      <Euro className="w-3 h-3 mr-1" />
                      {formatPriceRange(point.price_range)}
                    </Badge>
                  )}
                </div>

                {/* Tags */}
                {point.tags && point.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {point.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {point.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{point.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Équipements */}
                {point.amenities && point.amenities.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-muted-foreground">
                    {point.amenities.slice(0, 3).map((amenity, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <Wifi className="w-3 h-3" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                )}

                {/* Contact */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {point.contact_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {point.contact_phone}
                    </div>
                  )}
                  {point.contact_email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {point.contact_email}
                    </div>
                  )}
                  {point.website_url && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Site web
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Booking Button */}
        {variant !== 'compact' && (
          <div className="mt-4">
            <PartnerBookingButton
              touristPoint={{
                id: point.id,
                name: point.name,
                description: point.description,
                price_range: point.price_range,
                has_booking_system: point.has_booking_system,
                booking_system_type: point.booking_system_type as 'redirect' | 'api' | 'webhook' | undefined,
                booking_instructions: undefined
              }}
              bookingType="activity"
              variant="outline"
            />
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => onEdit?.(point.id)}>
              Modifier
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete?.(point.id)}>
              Supprimer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TouristPointCard;