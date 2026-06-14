import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedBookingDialog } from '@/components/booking/UnifiedBookingDialog';
import { HotelDetailsDialog } from '@/components/hotels/HotelDetailsDialog';
import { BookingItem, BookingType, HotelSearchCard } from '@/types/booking';
import { DetailedItinerary, TripFormData } from '@/types/trip';
import { HotelBedsHotel } from '@/services/hotelBedsService';
import {
  Plane,
  Hotel,
  UtensilsCrossed,
  MapPin,
  Clock,
  Star,
  ExternalLink,
  Euro,
  Car,
  Search,
  Info,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { providerManager } from '@/services/providerManagerService';
import { DestinationCodeAutocomplete } from '@/components/ui/destination-code-autocomplete';
import { AirportCodeAutocomplete } from '@/components/ui/airport-code-autocomplete';
import { mapHotelToSearchCard, mapHotelToBookingItem, formatHotelPrice, getStarRating, renderStars } from '@/utils/hotelUtils';

interface BookingEnrichmentPanelProps {
  itinerary?: DetailedItinerary;
  tripData?: TripFormData;
  standalone?: boolean; // Mode standalone pour la page d'accueil
}

interface SearchResults {
  hotels: HotelSearchCard[];
  flights: any[];
  activities: any[];
}

export const BookingEnrichmentPanel: React.FC<BookingEnrichmentPanelProps> = ({
  itinerary,
  tripData,
  standalone = false
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // Charger les fournisseurs au montage du composant
  React.useEffect(() => {
    providerManager.loadProviders().catch((error) => {
      console.error('❌ Erreur chargement fournisseurs:', error);
    });
  }, []);
  const [searchResults, setSearchResults] = useState<SearchResults>({
    hotels: [],
    flights: [],
    activities: []
  });

  const [isSearching, setIsSearching] = useState({
    hotels: false,
    flights: false,
    activities: false
  });

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

  const [hotelDetailsDialog, setHotelDetailsDialog] = useState<{
    isOpen: boolean;
    hotelCode: string;
    hotel: any;
  }>({
    isOpen: false,
    hotelCode: '',
    hotel: null
  });

  // Formulaires de recherche (préremplis depuis l'URL si présents : /booking?destination=PAR&checkIn=...&checkOut=...)
  const [hotelSearch, setHotelSearch] = useState({
    destination: tripData?.destinations?.[0]?.city || searchParams.get('destination') || '',
    checkIn: tripData?.startDate ? new Date(tripData.startDate).toISOString().split('T')[0] : (searchParams.get('checkIn') || ''),
    checkOut: tripData?.endDate ? new Date(tripData.endDate).toISOString().split('T')[0] : (searchParams.get('checkOut') || ''),
    guests: tripData?.travelGroup?.size || (parseInt(searchParams.get('guests') || '') || 2)
  });

  const [flightSearch, setFlightSearch] = useState({
    origin: '',
    destination: tripData?.destinations?.[0]?.city || '',
    departureDate: tripData?.startDate ? new Date(tripData.startDate).toISOString().split('T')[0] : '',
    returnDate: tripData?.endDate ? new Date(tripData.endDate).toISOString().split('T')[0] : '',
    passengers: tripData?.travelGroup?.size || 1
  });

  const [transferSearch, setTransferSearch] = useState({
    from: '',
    to: tripData?.destinations?.[0]?.city || '',
    date: tripData?.startDate ? new Date(tripData.startDate).toISOString().split('T')[0] : '',
    time: '10:00',
    passengers: tripData?.travelGroup?.size || 1
  });

  const [activitySearch, setActivitySearch] = useState({
    destination: tripData?.destinations?.[0]?.city || '',
    date: tripData?.startDate ? new Date(tripData.startDate).toISOString().split('T')[0] : '',
    participants: tripData?.travelGroup?.size || 1
  });

  const formatPrice = (amount: number, currency: string) => {
    return `${amount}${currency === 'EUR' ? '€' : currency}`;
  };

  const handleBookingClick = (item: any, type: BookingType, dates?: any) => {
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
      ...item
    };

    setBookingDialog({
      isOpen: true,
      item: bookingItem,
      type,
      dates
    });
  };

  // Fonctions de recherche
  const searchHotels = async () => {
    const destinationCode = hotelSearch.destination.trim().toUpperCase();

    if (!destinationCode || !hotelSearch.checkIn || !hotelSearch.checkOut) {
      toast({
        title: t('booking.toastRequiredTitle'),
        description: t('booking.toastRequiredDesc'),
        variant: "destructive"
      });
      return;
    }

    // Destination must be a HotelBeds code (3 lettres)
    if (!/^[A-Z]{3}$/.test(destinationCode)) {
      toast({
        title: t('booking.toastInvalidCodeTitle'),
        description: t('booking.toastInvalidCodeDesc'),
        variant: "destructive"
      });
      return;
    }

    // Validation: check-out doit être après check-in
    if (hotelSearch.checkOut <= hotelSearch.checkIn) {
      toast({
        title: t('booking.toastInvalidDatesTitle'),
        description: t('booking.toastInvalidDatesDesc'),
        variant: "destructive"
      });
      return;
    }

    setIsSearching(prev => ({ ...prev, hotels: true }));

    try {
      // Utilisation du Provider Manager pour rechercher les hôtels
      // Il gère automatiquement la sélection du fournisseur actif avec la meilleure priorité
      const hotels = await providerManager.searchHotels({
        destination: destinationCode,
        checkIn: hotelSearch.checkIn,
        checkOut: hotelSearch.checkOut,
        guests: hotelSearch.guests,
        rooms: 1
      });

      // Formater les résultats pour l'affichage avec la fonction de mapping dédiée
      const formattedHotels: HotelSearchCard[] = hotels.map((hotel) =>
        mapHotelToSearchCard(hotel, {
          checkIn: hotelSearch.checkIn,
          checkOut: hotelSearch.checkOut,
          destination: destinationCode
        })
      );

      setSearchResults(prev => ({ ...prev, hotels: formattedHotels }));

      toast({
        title: t('booking.toastDoneTitle'),
        description: t('booking.toastHotelsFound', { count: formattedHotels.length }),
      });
    } catch (error: any) {
      console.error('❌ Erreur recherche hôtels:', error);
      toast({
        title: t('booking.toastErrorTitle'),
        description: error?.message || t('booking.toastHotelsError'),
        variant: "destructive"
      });
      setSearchResults(prev => ({ ...prev, hotels: [] }));
    } finally {
      setIsSearching(prev => ({ ...prev, hotels: false }));
    }
  };

  const searchFlights = async () => {
    if (!flightSearch.origin || !flightSearch.destination || !flightSearch.departureDate) {
      toast({
        title: t('booking.toastRequiredTitle'),
        description: t('booking.toastRequiredDesc'),
        variant: "destructive"
      });
      return;
    }

    setIsSearching(prev => ({ ...prev, flights: true }));

    try {
      // Utilisation du Provider Manager pour rechercher les vols
      // Il gère automatiquement la sélection du fournisseur actif avec la meilleure priorité
      const flights = await providerManager.searchFlights({
        origin: flightSearch.origin,
        destination: flightSearch.destination,
        departureDate: flightSearch.departureDate,
        returnDate: flightSearch.returnDate || undefined,
        passengers: flightSearch.passengers
      });

      // Formater les résultats pour l'affichage
      const formattedFlights = flights.slice(0, 10).map((flight: any) => ({
        id: flight.id,
        departure: flightSearch.origin,
        destination: flightSearch.destination,
        departureDate: flightSearch.departureDate,
        returnDate: flightSearch.returnDate,
        airline: flight.validatingAirlineCodes?.[0] || 'N/A',
        duration: flight.itineraries?.[0]?.duration || 'N/A',
        stops: (flight.itineraries?.[0]?.segments?.length || 1) - 1,
        price: {
          amount: parseFloat(flight.price?.total || '0') || 0,
          currency: flight.price?.currency || 'EUR'
        },
        bookingUrl: flight.testBookingUrl || flight.bookingUrl,
        provider: 'Amadeus'
      }));

      setSearchResults(prev => ({ ...prev, flights: formattedFlights }));

      toast({
        title: t('booking.toastDoneTitle'),
        description: t('booking.toastFlightsFound', { count: formattedFlights.length }),
      });
    } catch (error: any) {
      console.error('❌ Erreur recherche vols:', error);
      toast({
        title: t('booking.toastErrorTitle'),
        description: error?.message || t('booking.toastFlightsError'),
        variant: "destructive"
      });
      setSearchResults(prev => ({ ...prev, flights: [] }));
    } finally {
      setIsSearching(prev => ({ ...prev, flights: false }));
    }
  };

  const searchActivities = async () => {
    if (!activitySearch.destination || !activitySearch.date) {
      toast({
        title: t('booking.toastRequiredTitle'),
        description: t('booking.toastRequiredDesc'),
        variant: "destructive"
      });
      return;
    }

    setIsSearching(prev => ({ ...prev, activities: true }));

    try {
      // Utilisation du Provider Manager pour rechercher les activités
      // Il gère automatiquement la sélection du fournisseur actif avec la meilleure priorité
      const activities = await providerManager.searchActivities({
        destination: activitySearch.destination
      });

      // Formater les résultats pour l'affichage
      const formattedActivities = activities.map((activity: any) => ({
        id: activity.code,
        name: activity.name,
        description: activity.content?.description || '',
        duration: activity.modalities?.[0]?.duration?.value
          ? `${activity.modalities[0].duration.value} ${activity.modalities[0].duration.metric}`
          : 'N/A',
        cost: activity.modalities?.[0]?.amountUnitPrice?.amount || 0,
        rating: activity.modalities?.[0]?.rating || undefined,
        date: activitySearch.date,
        time: '10:00',
        bookingRequired: true,
        bookingUrl: activity.modalities?.[0]?.bookingUrl,
        provider: 'HotelBeds',
        category: activity.category?.name,
        images: activity.images?.[0]?.url
      }));

      setSearchResults(prev => ({ ...prev, activities: formattedActivities }));

      toast({
        title: t('booking.toastDoneTitle'),
        description: t('booking.toastActivitiesFound', { count: formattedActivities.length }),
      });
    } catch (error: any) {
      console.error('❌ Erreur recherche activités:', error);
      toast({
        title: t('booking.toastErrorTitle'),
        description: error?.message || t('booking.toastActivitiesError'),
        variant: "destructive"
      });
      setSearchResults(prev => ({ ...prev, activities: [] }));
    } finally {
      setIsSearching(prev => ({ ...prev, activities: false }));
    }
  };

  return (
    <Card className="mt-6 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ExternalLink className="h-5 w-5 text-primary" />
          {t('booking.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('booking.subtitle')}
        </p>
        <div className="flex items-center gap-2 mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('booking.info')}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hotels" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="hotels" className="flex items-center gap-1">
              <Hotel className="h-4 w-4" />
              <span className="hidden sm:inline">{t('booking.tabs.hotels')}</span>
            </TabsTrigger>
            <TabsTrigger value="flights" className="flex items-center gap-1">
              <Plane className="h-4 w-4" />
              <span className="hidden sm:inline">{t('booking.tabs.flights')}</span>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-1">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">{t('booking.tabs.transfers')}</span>
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-1">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">{t('booking.tabs.restaurants')}</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">{t('booking.tabs.activities')}</span>
            </TabsTrigger>
          </TabsList>

          {/* HOTELS TAB */}
          <TabsContent value="hotels" className="mt-4 space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg border">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" />
                {t('booking.searchHotel')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="hotel-destination">{t('booking.destination')}</Label>
                  <DestinationCodeAutocomplete
                    value={hotelSearch.destination}
                    onValueChange={(code) => setHotelSearch({ ...hotelSearch, destination: code.toUpperCase() })}
                    placeholder={t('booking.selectDestination')}
                  />
                </div>
                <div>
                  <Label htmlFor="hotel-guests">{t('booking.guests')}</Label>
                  <Input
                    id="hotel-guests"
                    type="number"
                    min="1"
                    value={hotelSearch.guests}
                    onChange={(e) => setHotelSearch({ ...hotelSearch, guests: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="hotel-checkin">{t('booking.checkIn')}</Label>
                  <Input
                    id="hotel-checkin"
                    type="date"
                    value={hotelSearch.checkIn}
                    onChange={(e) => {
                      const checkIn = e.target.value;
                      // Auto-set checkout to at least 1 day after check-in
                      const minCheckout = new Date(checkIn);
                      minCheckout.setDate(minCheckout.getDate() + 1);
                      const minCheckoutStr = minCheckout.toISOString().split('T')[0];

                      setHotelSearch({
                        ...hotelSearch,
                        checkIn,
                        // Update checkout only if it's invalid or not set
                        checkOut: !hotelSearch.checkOut || hotelSearch.checkOut <= checkIn
                          ? minCheckoutStr
                          : hotelSearch.checkOut
                      });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="hotel-checkout">{t('booking.checkOut')}</Label>
                  <Input
                    id="hotel-checkout"
                    type="date"
                    value={hotelSearch.checkOut}
                    min={hotelSearch.checkIn ? new Date(new Date(hotelSearch.checkIn).getTime() + 86400000).toISOString().split('T')[0] : undefined}
                    onChange={(e) => setHotelSearch({ ...hotelSearch, checkOut: e.target.value })}
                  />
                </div>
              </div>
              <Button
                className="w-full mt-3"
                onClick={searchHotels}
                disabled={isSearching.hotels}
              >
                {isSearching.hotels ? (
                  <>{t('booking.searching')}</>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    {t('booking.searchHotelsBtn')}
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              {searchResults.hotels.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-muted-foreground">
                    {t('booking.emptyTitle')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('booking.emptyDesc')}
                  </p>
                </div>
              ) : (
                searchResults.hotels.map((hotel, index) => {
                  const starRating = hotel.rating || getStarRating(hotel.categoryCode);

                  return (
                    <Card key={index} className="overflow-hidden hover:shadow-lg transition-all">
                      <div className="flex flex-col md:flex-row">
                        {/* Image Section */}
                        <div className="relative w-full md:w-64 h-48 md:h-auto bg-muted flex-shrink-0">
                          {hotel.imageUrl ? (
                            <img
                              src={hotel.imageUrl}
                              alt={hotel.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Hotel className="h-12 w-12 text-muted-foreground/50" />
                            </div>
                          )}
                          {starRating > 0 && (
                            <Badge className="absolute top-2 left-2 bg-white/90 text-black hover:bg-white">
                              {renderStars(starRating)}
                            </Badge>
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 p-4">
                          <div className="flex flex-col h-full">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg mb-2">{hotel.name}</h4>

                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{hotel.destinationCity}</span>
                                </div>
                                {hotel.destinationCountry && (
                                  <span className="text-muted-foreground/60">• {hotel.destinationCountry}</span>
                                )}
                              </div>

                              {hotel.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                  {hotel.description}
                                </p>
                              )}

                              {/* Quick Amenities Preview */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                {hotel.facilities && hotel.facilities.length > 0 ? (
                                  <>
                                    {/* Afficher les 2 premières facilities principales */}
                                    {hotel.facilities.slice(0, 2).map((facility: any, fidx: number) => {
                                      const facilityName = facility.description?.content || facility.description || '';
                                      if (!facilityName) return null;

                                      return (
                                        <Badge key={fidx} variant="secondary" className="text-xs">
                                          {facilityName.length > 15 ? facilityName.substring(0, 15) + '...' : facilityName}
                                        </Badge>
                                      );
                                    })}
                                    {/* Badge pour le nombre total d'équipements */}
                                    {hotel.facilities.length > 2 && (
                                      <Badge variant="secondary" className="text-xs">
                                        {t('booking.moreAmenities', { count: hotel.facilities.length - 2 })}
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="secondary" className="text-xs opacity-50">
                                    {t('booking.amenitiesUnspecified')}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Price and Actions */}
                            <div className="flex items-end justify-between gap-4 pt-3 border-t">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">{t('booking.fromPrice')}</div>
                                {hotel.price.amount > 0 ? (
                                  <div className="text-2xl font-bold text-primary">
                                    {formatHotelPrice(hotel.price.amount, hotel.price.currency)}
                                    <span className="text-sm font-normal text-muted-foreground">{t('booking.perNight')}</span>
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    {t('booking.priceUnavailable')}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setHotelDetailsDialog({
                                    isOpen: true,
                                    hotelCode: hotel.id,
                                    hotel: hotel
                                  })}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('booking.details')}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleBookingClick(hotel, 'hotel', {
                                    start: hotel.checkInDate,
                                    end: hotel.checkOutDate
                                  })}
                                  disabled={hotel.price.amount <= 0}
                                >
                                  {t('booking.book')}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* FLIGHTS TAB */}
          <TabsContent value="flights" className="mt-4 space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg border">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" />
                {t('booking.searchFlight')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="flight-origin">{t('booking.origin')}</Label>
                  <AirportCodeAutocomplete
                    value={flightSearch.origin}
                    onValueChange={(code) => setFlightSearch({ ...flightSearch, origin: code })}
                    placeholder={t('booking.selectOriginAirport')}
                  />
                </div>
                <div>
                  <Label htmlFor="flight-destination">{t('booking.destination')}</Label>
                  <AirportCodeAutocomplete
                    value={flightSearch.destination}
                    onValueChange={(code) => setFlightSearch({ ...flightSearch, destination: code })}
                    placeholder={t('booking.selectDestAirport')}
                  />
                </div>
                <div>
                  <Label htmlFor="flight-departure">{t('booking.departDate')}</Label>
                  <Input
                    id="flight-departure"
                    type="date"
                    value={flightSearch.departureDate}
                    onChange={(e) => setFlightSearch({ ...flightSearch, departureDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="flight-return">{t('booking.returnDate')}</Label>
                  <Input
                    id="flight-return"
                    type="date"
                    value={flightSearch.returnDate}
                    onChange={(e) => setFlightSearch({ ...flightSearch, returnDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="flight-passengers">{t('booking.passengers')}</Label>
                  <Input
                    id="flight-passengers"
                    type="number"
                    min="1"
                    value={flightSearch.passengers}
                    onChange={(e) => setFlightSearch({ ...flightSearch, passengers: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <Button
                className="w-full mt-3"
                onClick={searchFlights}
                disabled={isSearching.flights}
              >
                {isSearching.flights ? (
                  <>{t('booking.searching')}</>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    {t('booking.searchFlightsBtn')}
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3">
              {searchResults.flights.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-muted-foreground">
                    {t('booking.emptyTitle')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('booking.emptyDesc')}
                  </p>
                </div>
              ) : (
                searchResults.flights.map((flight, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium">{flight.departure} → {flight.destination}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{flight.departureDate}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{flight.duration}</span>
                        </div>
                        {flight.stops > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {t('booking.stops', { count: flight.stops })}
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
                        {t('booking.book')}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TRANSFERS TAB */}
          <TabsContent value="transfers" className="mt-4">
            <div className="bg-muted/30 p-4 rounded-lg border mb-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" />
                {t('booking.searchTransfer')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="transfer-from">{t('booking.origin')}</Label>
                  <Input
                    id="transfer-from"
                    placeholder={t('booking.transferFromPlaceholder')}
                    value={transferSearch.from}
                    onChange={(e) => setTransferSearch({ ...transferSearch, from: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="transfer-to">{t('booking.destination')}</Label>
                  <Input
                    id="transfer-to"
                    placeholder={t('booking.transferToPlaceholder')}
                    value={transferSearch.to}
                    onChange={(e) => setTransferSearch({ ...transferSearch, to: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="transfer-date">{t('booking.date')}</Label>
                  <Input
                    id="transfer-date"
                    type="date"
                    value={transferSearch.date}
                    onChange={(e) => setTransferSearch({ ...transferSearch, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="transfer-time">{t('booking.time')}</Label>
                  <Input
                    id="transfer-time"
                    type="time"
                    value={transferSearch.time}
                    onChange={(e) => setTransferSearch({ ...transferSearch, time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="transfer-passengers">{t('booking.passengers')}</Label>
                  <Input
                    id="transfer-passengers"
                    type="number"
                    min="1"
                    value={transferSearch.passengers}
                    onChange={(e) => setTransferSearch({ ...transferSearch, passengers: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <Button className="w-full mt-3" disabled>
                <Search className="h-4 w-4 mr-2" />
                {t('booking.searchTransfersBtnSoon')}
              </Button>
            </div>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t('booking.transfersSoon')}
              </p>
            </div>
          </TabsContent>

          {/* RESTAURANTS TAB */}
          <TabsContent value="restaurants" className="mt-4">
            <div className="text-center py-8 space-y-2">
              <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">
                {t('booking.restaurantsIncludedTitle')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('booking.restaurantsIncludedDesc')}
              </p>
            </div>
          </TabsContent>

          {/* ACTIVITIES TAB */}
          <TabsContent value="activities" className="mt-4 space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg border">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" />
                {t('booking.searchActivity')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="activity-destination">{t('booking.destination')}</Label>
                  <DestinationCodeAutocomplete
                    value={activitySearch.destination}
                    onValueChange={(code) => setActivitySearch({ ...activitySearch, destination: code })}
                    placeholder={t('booking.selectDestination')}
                  />
                </div>
                <div>
                  <Label htmlFor="activity-date">{t('booking.date')}</Label>
                  <Input
                    id="activity-date"
                    type="date"
                    value={activitySearch.date}
                    onChange={(e) => setActivitySearch({ ...activitySearch, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="activity-participants">{t('booking.participants')}</Label>
                  <Input
                    id="activity-participants"
                    type="number"
                    min="1"
                    value={activitySearch.participants}
                    onChange={(e) => setActivitySearch({ ...activitySearch, participants: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <Button
                className="w-full mt-3"
                onClick={searchActivities}
                disabled={isSearching.activities}
              >
                {isSearching.activities ? (
                  <>{t('booking.searching')}</>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    {t('booking.searchActivitiesBtn')}
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3">
              {searchResults.activities.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-muted-foreground">
                    {t('booking.emptyTitle')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('booking.emptyDesc')}
                  </p>
                </div>
              ) : (
                searchResults.activities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium">{activity.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
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
                    </div>
                    <div className="text-right">
                      <Button
                        size="sm"
                        variant="default"
                        className="mt-2"
                        onClick={() => handleBookingClick(activity, 'activity', {
                          start: activity.date,
                          time: activity.time
                        })}
                      >
                        {t('booking.book')}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
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

      {/* Hotel Details Dialog */}
      {hotelDetailsDialog.isOpen && (
        <HotelDetailsDialog
          isOpen={hotelDetailsDialog.isOpen}
          onClose={() => setHotelDetailsDialog({ isOpen: false, hotelCode: '', hotel: null })}
          hotelCode={hotelDetailsDialog.hotelCode}
          checkIn={hotelSearch.checkIn}
          checkOut={hotelSearch.checkOut}
          guests={hotelSearch.guests}
          onBook={(hotel: HotelBedsHotel) => {
            // Fermer le dialogue de détails
            setHotelDetailsDialog({ isOpen: false, hotelCode: '', hotel: null });

            // Ouvrir le dialogue de réservation avec la fonction de mapping
            setBookingDialog({
              isOpen: true,
              item: mapHotelToBookingItem(hotel, {
                start: hotelSearch.checkIn,
                end: hotelSearch.checkOut
              }),
              type: 'hotel',
              dates: {
                start: hotelSearch.checkIn,
                end: hotelSearch.checkOut
              }
            });
          }}
        />
      )}
    </Card>
  );
};
