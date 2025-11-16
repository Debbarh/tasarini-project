import React, { useState } from 'react';
import { Search, Calendar, Users, MapPin, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { amadeusService, AmadeusHotelOffer } from '@/services/amadeusService';
import { EnhancedAmadeusHotel } from '@/services/amadeusTestEnhancer';
import { TestDataBadge } from '@/components/ui/test-data-badge';
import { AmadeusTestWarning } from './AmadeusTestWarning';

interface HotelSearchDialogProps {
  children: React.ReactNode;
  defaultLocation?: {
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

export function HotelSearchDialog({ children, defaultLocation }: HotelSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    location: defaultLocation?.city || '',
    checkInDate: '',
    checkOutDate: '',
    adults: 1,
  });
  const [hotels, setHotels] = useState<EnhancedAmadeusHotel[]>([]);
  const [showTestWarning, setShowTestWarning] = useState(true);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchParams.location || !searchParams.checkInDate || !searchParams.checkOutDate) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let results: EnhancedAmadeusHotel[] = [];

      if (defaultLocation?.latitude && defaultLocation?.longitude) {
        // Use coordinates if available
        results = await amadeusService.searchHotelsByLocation(
          defaultLocation.latitude,
          defaultLocation.longitude,
          searchParams.checkInDate,
          searchParams.checkOutDate,
          searchParams.adults
        ) as EnhancedAmadeusHotel[];
      } else {
        // Use city name
        results = await amadeusService.searchHotelsByCity(
          searchParams.location,
          searchParams.checkInDate,
          searchParams.checkOutDate,
          searchParams.adults
        ) as EnhancedAmadeusHotel[];
      }

      setHotels(results);
      
      if (results.length === 0) {
        toast({
          title: "Aucun hôtel trouvé",
          description: "Essayez de modifier vos critères de recherche.",
        });
      }
    } catch (error) {
      console.error('Hotel search error:', error);
      toast({
        title: "Erreur de recherche",
        description: "Impossible de rechercher les hôtels. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (hotel: EnhancedAmadeusHotel) => {
    if (hotel.bookingUrl) {
      if (hotel.isTestData) {
        toast({
          title: "Redirection vers l'environnement de test",
          description: "Vous allez être redirigé vers la plateforme de test Amadeus.",
        });
      }
      window.open(hotel.bookingUrl, '_blank');
    } else {
      toast({
        title: "Réservation indisponible",
        description: "Le lien de réservation n'est pas disponible pour cet hôtel.",
        variant: "destructive",
      });
    }
  };

  const resetSearch = () => {
    setHotels([]);
    setSearchParams({
      location: defaultLocation?.city || '',
      checkInDate: '',
      checkOutDate: '',
      adults: 1,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetSearch();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recherche d'hôtels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Test Warning */}
          {showTestWarning && (
            <AmadeusTestWarning 
              onDismiss={() => setShowTestWarning(false)}
              showProductionInfo={false}
            />
          )}

          {/* Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Destination</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="Ville ou destination"
                  value={searchParams.location}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="checkIn">Arrivée</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="checkIn"
                  type="date"
                  value={searchParams.checkInDate}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkInDate: e.target.value }))}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="checkOut">Départ</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="checkOut"
                  type="date"
                  value={searchParams.checkOutDate}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkOutDate: e.target.value }))}
                  className="pl-10"
                  min={searchParams.checkInDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adults">Adultes</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adults"
                  type="number"
                  min="1"
                  max="8"
                  value={searchParams.adults}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, adults: parseInt(e.target.value) || 1 }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </>
            )}
          </Button>

          {/* Results */}
          {hotels.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {hotels.length} hôtel{hotels.length > 1 ? 's' : ''} trouvé{hotels.length > 1 ? 's' : ''}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {hotels.map((hotel) => (
                  <Card key={hotel.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base">{hotel.name}</CardTitle>
                            {hotel.testDataBadge && (
                              <TestDataBadge type="hotel" variant="minimal" />
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            {hotel.location.address}
                          </CardDescription>
                          {hotel.enhancedDescription && (
                            <CardDescription className="text-xs mt-1 line-clamp-2">
                              {hotel.enhancedDescription}
                            </CardDescription>
                          )}
                        </div>
                        {hotel.rating && (
                          <Badge variant="secondary">
                            ⭐ {hotel.rating}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {amadeusService.calculateNights(hotel.checkInDate, hotel.checkOutDate)} nuit{amadeusService.calculateNights(hotel.checkInDate, hotel.checkOutDate) > 1 ? 's' : ''}
                        </span>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {amadeusService.formatPrice(hotel.price)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total séjour
                          </div>
                        </div>
                      </div>
                      
                      {hotel.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hotel.amenities.slice(0, 3).map((amenity, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {hotel.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{hotel.amenities.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                       <div className="space-y-2">
                        {hotel.fallbackImageUsed && (
                          <p className="text-xs text-muted-foreground">
                            📷 Images de fallback utilisées
                          </p>
                        )}
                        
                        <Button 
                          onClick={() => handleBooking(hotel)}
                          className="w-full"
                          size="sm"
                          variant={hotel.isTestData ? "outline" : "default"}
                        >
                          {hotel.isTestData ? '🧪 Réserver (Test)' : 'Réserver'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}