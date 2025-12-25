import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  Star,
  ExternalLink,
  Wifi,
  Calendar,
  Users,
  Hotel,
  Image as ImageIcon,
  Info,
  X
} from 'lucide-react';
import { HotelBedsHotel, hotelBedsService } from '@/services/hotelBedsService';
import {
  getBestHotelImage,
  mapFacilities,
  formatHotelPrice,
  getGoogleMapsUrl,
  getStarRating,
  renderStars,
  calculateNights,
  formatDate
} from '@/utils/hotelUtils';

interface HotelDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hotelCode: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  onBook?: (hotel: HotelBedsHotel) => void;
}

export const HotelDetailsDialog: React.FC<HotelDetailsDialogProps> = ({
  isOpen,
  onClose,
  hotelCode,
  checkIn,
  checkOut,
  guests,
  onBook
}) => {
  const [hotel, setHotel] = useState<HotelBedsHotel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && hotelCode) {
      loadHotelDetails();
    }
  }, [isOpen, hotelCode, checkIn, checkOut]);

  const loadHotelDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const details = await hotelBedsService.getHotelDetails(
        hotelCode,
        checkIn,
        checkOut,
        {
          rooms: 1,
          adults: guests,
          children: 0
        }
      );

      if (details) {
        setHotel(details);
      } else {
        setError('Impossible de charger les détails de l\'hôtel');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des détails');
    } finally {
      setIsLoading(false);
    }
  };

  const heroImage = hotel ? getBestHotelImage(hotel) : null;
  const starRating = hotel ? getStarRating(hotel.categoryCode) : 0;
  const facilities = hotel?.facilities ? mapFacilities(hotel.facilities) : [];
  const mapsUrl = hotel ? getGoogleMapsUrl(hotel.coordinates, hotel.name) : null;
  const nights = calculateNights(checkIn, checkOut);

  const handleBooking = () => {
    if (hotel && onBook) {
      onBook(hotel);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-destructive">{error}</p>
              <Button onClick={onClose} className="mt-4">Fermer</Button>
            </div>
          ) : hotel ? (
            <>
              {/* Hero Section */}
              <div className="relative h-64 md:h-80 bg-muted">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Hotel className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Hotel Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h1 className="text-2xl md:text-3xl font-bold mb-2">{hotel.name}</h1>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {starRating > 0 && (
                          <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm">
                            {renderStars(starRating)}
                          </Badge>
                        )}
                        {hotel.destinationName && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{hotel.destinationName}</span>
                          </div>
                        )}
                        {hotel.zoneName && (
                          <span className="text-white/80">• {hotel.zoneName}</span>
                        )}
                      </div>
                    </div>
                    {hotel.minRate && (
                      <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardContent className="p-4">
                          <div className="text-right">
                            <div className="text-xs text-white/80">À partir de</div>
                            <div className="text-2xl font-bold">
                              {formatHotelPrice(hotel.minRate, hotel.currency)}
                            </div>
                            <div className="text-xs text-white/80">/nuit</div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Tabs */}
              <div className="p-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">
                      <Info className="h-4 w-4 mr-2" />
                      Vue d'ensemble
                    </TabsTrigger>
                    <TabsTrigger value="amenities">
                      <Wifi className="h-4 w-4 mr-2" />
                      Équipements
                    </TabsTrigger>
                    <TabsTrigger value="location">
                      <MapPin className="h-4 w-4 mr-2" />
                      Localisation
                    </TabsTrigger>
                    <TabsTrigger value="photos">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Photos
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    {hotel.description && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Description</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {hotel.description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <h4 className="font-medium">Dates du séjour</h4>
                          </div>
                          <div className="text-sm space-y-1">
                            <p><strong>Arrivée:</strong> {formatDate(checkIn)}</p>
                            <p><strong>Départ:</strong> {formatDate(checkOut)}</p>
                            <p className="text-muted-foreground">{nights} nuit{nights > 1 ? 's' : ''}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-primary" />
                            <h4 className="font-medium">Voyageurs</h4>
                          </div>
                          <div className="text-sm">
                            <p>{guests} personne{guests > 1 ? 's' : ''}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {hotel.categoryName && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Catégorie</h3>
                        <Badge variant="outline">{hotel.categoryName}</Badge>
                      </div>
                    )}
                  </TabsContent>

                  {/* Amenities Tab */}
                  <TabsContent value="amenities" className="mt-4">
                    {facilities.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {facilities.map((category, idx) => (
                          <div key={idx}>
                            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                              <span className="text-2xl">{category.icon}</span>
                              {category.label}
                            </h3>
                            <ul className="space-y-2">
                              {category.facilities.map((facility, fidx) => (
                                <li key={fidx} className="flex items-start gap-2 text-sm">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{facility}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wifi className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Aucune information sur les équipements disponible</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Location Tab */}
                  <TabsContent value="location" className="space-y-4 mt-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Adresse</h3>
                      {hotel.address?.content ? (
                        <div className="space-y-2 text-sm">
                          <p>{hotel.address.content}</p>
                          {hotel.city?.content && <p>{hotel.city.content}</p>}
                          {hotel.postalCode && <p>Code postal: {hotel.postalCode}</p>}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">Adresse non disponible</p>
                      )}
                    </div>

                    {mapsUrl && (
                      <div>
                        <Button asChild variant="outline" className="w-full">
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                            <MapPin className="h-4 w-4 mr-2" />
                            Voir sur Google Maps
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </a>
                        </Button>
                      </div>
                    )}

                    {hotel.coordinates && (
                      <div className="text-xs text-muted-foreground">
                        <p>Coordonnées GPS:</p>
                        <p>Latitude: {hotel.coordinates.latitude}</p>
                        <p>Longitude: {hotel.coordinates.longitude}</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Photos Tab */}
                  <TabsContent value="photos" className="mt-4">
                    {hotel.images && hotel.images.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {hotel.images.slice(0, 12).map((image, idx) => (
                          <div
                            key={idx}
                            className="aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                            onClick={() => setSelectedImage(`https://photos.hotelbeds.com/giata/original/${image.path}`)}
                          >
                            <img
                              src={`https://photos.hotelbeds.com/giata/original/${image.path}`}
                              alt={`${hotel.name} - Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Aucune photo disponible</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Booking Widget */}
                <div className="mt-6 p-6 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Prix total du séjour</div>
                      <div className="text-2xl font-bold">
                        {hotel.minRate && formatHotelPrice(hotel.minRate * nights, hotel.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hotel.minRate && formatHotelPrice(hotel.minRate, hotel.currency)} × {nights} nuit{nights > 1 ? 's' : ''}
                      </div>
                    </div>
                    <Button size="lg" onClick={handleBooking} className="min-w-[200px]">
                      Réserver cet hôtel
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={selectedImage}
            alt="Agrandir"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
};
