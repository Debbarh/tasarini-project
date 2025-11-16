import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EnrichmentOptions } from '@/services/tripEnrichmentService';
import { UnifiedBookingDialog } from '@/components/booking/UnifiedBookingDialog';
import { BookingItem, BookingType } from '@/types/booking';
import { 
  Plane, 
  Hotel, 
  UtensilsCrossed, 
  MapPin, 
  Clock, 
  Star,
  ExternalLink,
  Euro,
  Car
} from 'lucide-react';
import { TransferCard } from './TransferCard';

interface BookingEnrichmentPanelProps {
  enrichmentData: EnrichmentOptions | null;
  isEnriching: boolean;
}

export const BookingEnrichmentPanel: React.FC<BookingEnrichmentPanelProps> = ({
  enrichmentData,
  isEnriching
}) => {
  const [bookingDialog, setBookingDialog] = useState<{
    isOpen: boolean;
    item: BookingItem | null;
    type: BookingType;
    dates?: { start?: string; end?: string; time?: string };
  }>({
    isOpen: false,
    item: null,
    type: 'hotel'
  });

  if (!isEnriching && !enrichmentData) return null;

  const formatPrice = (amount: number, currency: string) => {
    return `${amount}${currency === 'EUR' ? '€' : currency}`;
  };

  const handleBookingClick = (item: any, type: BookingType, dates?: any) => {
    // Convert enrichment item to BookingItem format
    const bookingItem: BookingItem = {
      id: item.id || `${type}-${Date.now()}`,
      name: item.name || `${item.departure} → ${item.destination}` || item.title,
      description: item.description || item.address,
      price: {
        amount: item.price?.amount || item.cost || 0,
        currency: item.price?.currency || 'EUR'
      },
      bookingUrl: item.bookingUrl || item.url,
      sourceType: item.bookingUrl ? 'external' : 'internal',
      sourceProvider: item.source || item.provider || 'partner',
      ...item // Include all original properties
    };

    setBookingDialog({
      isOpen: true,
      item: bookingItem,
      type,
      dates
    });
  };

  const LoadingSkeleton = ({ count = 3 }: { count?: number }) => (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );

  return (
    <Card className="mt-6 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ExternalLink className="h-5 w-5 text-primary" />
          Options de réservation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isEnriching 
            ? "Recherche des meilleures options en cours..."
            : "Options de réservation basées sur votre itinéraire"
          }
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hotels" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="hotels" className="flex items-center gap-1">
              <Hotel className="h-4 w-4" />
              <span className="hidden sm:inline">Hôtels</span>
            </TabsTrigger>
            <TabsTrigger value="flights" className="flex items-center gap-1">
              <Plane className="h-4 w-4" />
              <span className="hidden sm:inline">Vols</span>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-1">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Transferts</span>
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-1">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Restaurants</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Activités</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hotels" className="mt-4">
            {enrichmentData?.loading.hotels ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-3">
                {enrichmentData?.hotels.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun hôtel trouvé pour vos dates
                  </p>
                ) : (
                  enrichmentData?.hotels.map((hotel, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium">{hotel.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{hotel.destinationCity}, {hotel.destinationCountry}</span>
                          {hotel.rating && (
                            <>
                              <Star className="h-3 w-3 fill-current text-yellow-500" />
                              <span>{hotel.rating}</span>
                            </>
                          )}
                        </div>
                        {hotel.address && (
                          <p className="text-xs text-muted-foreground mt-1">{hotel.address}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatPrice(hotel.price.amount, hotel.price.currency)}
                          <span className="text-xs text-muted-foreground">/nuit</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => handleBookingClick(hotel, 'hotel', {
                            start: hotel.checkInDate,
                            end: hotel.checkOutDate
                          })}
                        >
                          Réserver
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="flights" className="mt-4">
            {enrichmentData?.loading.flights ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-3">
                {enrichmentData?.flights.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun vol trouvé pour vos destinations
                  </p>
                ) : (
                  enrichmentData?.flights.map((flight, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium">{flight.departure} → {flight.destination}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{flight.departureDate}</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{flight.duration}</span>
                          </div>
                          <span>{flight.airline}</span>
                          {flight.stops > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {flight.stops} escale{flight.stops > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatPrice(flight.price.amount, flight.price.currency)}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => handleBookingClick(flight, 'flight', {
                            start: flight.departureDate
                          })}
                        >
                          Réserver
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="restaurants" className="mt-4">
            {enrichmentData?.loading.restaurants ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-3">
                {enrichmentData?.restaurants.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun restaurant dans votre itinéraire
                  </p>
                ) : (
                  enrichmentData?.restaurants.map((restaurant, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{restaurant.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            Jour {restaurant.dayNumber}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{restaurant.time}</span>
                          </div>
                          <span className="capitalize">{restaurant.cuisine}</span>
                          <span>{restaurant.priceRange}</span>
                          {restaurant.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current text-yellow-500" />
                              <span>{restaurant.rating}</span>
                            </div>
                          )}
                        </div>
                        {restaurant.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {restaurant.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => handleBookingClick(restaurant, 'restaurant', {
                            start: restaurant.date,
                            time: restaurant.time
                          })}
                        >
                          Réserver
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transfers" className="mt-4">
            {enrichmentData?.loading.transfers ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-3">
                {enrichmentData?.transfers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun transfert trouvé pour votre itinéraire
                  </p>
                ) : (
                  enrichmentData?.transfers.map((transfer, index) => (
                    <TransferCard
                      key={index}
                      transfer={transfer}
                      onBook={(transfer) => handleBookingClick(transfer, 'transfer')}
                    />
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            {enrichmentData?.loading.activities ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-3">
                {enrichmentData?.activities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune activité dans votre itinéraire
                  </p>
                ) : (
                  enrichmentData?.activities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{activity.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            Jour {activity.dayNumber}
                          </Badge>
                          {activity.bookingRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Réservation requise
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{activity.time}</span>
                          </div>
                          <span>{activity.duration}</span>
                          {activity.cost > 0 && (
                            <div className="flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              <span>{activity.cost}€</span>
                            </div>
                          )}
                          {activity.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current text-yellow-500" />
                              <span>{activity.rating}</span>
                            </div>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {activity.bookingRequired && (
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="mt-2"
                            onClick={() => handleBookingClick(activity, 'activity', {
                              start: activity.date,
                              time: activity.time
                            })}
                          >
                            Réserver
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <UnifiedBookingDialog
        isOpen={bookingDialog.isOpen}
        onClose={() => setBookingDialog(prev => ({ ...prev, isOpen: false }))}
        item={bookingDialog.item}
        bookingType={bookingDialog.type}
        defaultDates={bookingDialog.dates}
      />
    </Card>
  );
};