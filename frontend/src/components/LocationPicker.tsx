import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Navigation, Locate, Zap } from 'lucide-react';
import { toast } from 'sonner';
import SimpleInteractiveMap from './SimpleInteractiveMap';
import { reverseGeocode } from '@/services/reverseGeocodingService';

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number, address: string, city?: string, country?: string) => void;
  className?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  latitude = 48.8566, 
  longitude = 2.3522, 
  onLocationSelect, 
  className = "w-full rounded-lg" 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLat, setCurrentLat] = useState(latitude);
  const [currentLng, setCurrentLng] = useState(longitude);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);
  const [mapHeight, setMapHeight] = useState(300);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentLat(latitude);
    setCurrentLng(longitude);
  }, [latitude, longitude]);

  // Auto-localisation au chargement du composant
  useEffect(() => {
    if (!hasAutoLocated) {
      getUserLocation(false); // Ne pas mettre à jour le formulaire automatiquement
      setHasAutoLocated(true);
    }
  }, []);

  // Calcul dynamique de la hauteur de la carte
  useEffect(() => {
    const calculateMapHeight = () => {
      if (containerRef.current && controlsRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const controlsHeight = controlsRef.current.clientHeight;
        const padding = 32; // 2rem de padding total
        const newMapHeight = Math.max(250, containerHeight - controlsHeight - padding);
        setMapHeight(newMapHeight);
      }
    };

    calculateMapHeight();

    // Observer pour recalculer quand la taille change
    const resizeObserver = new ResizeObserver(calculateMapHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (controlsRef.current) {
      resizeObserver.observe(controlsRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Recalcul également quand le contenu change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && controlsRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const controlsHeight = controlsRef.current.clientHeight;
        const padding = 32;
        const newMapHeight = Math.max(250, containerHeight - controlsHeight - padding);
        setMapHeight(newMapHeight);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [searchQuery, currentLat, currentLng, userLocation]);

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Utiliser un service de géocodage plus robuste
      const response = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=5b3ce3597851110001cf624822d8c5b0e32f4a3abf5e7e9d6c7b8a9c&text=${encodeURIComponent(searchQuery)}&boundary.country=*&size=1`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Fallback vers Nominatim si OpenRouteService ne fonctionne pas
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&accept-language=fr`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'VoyageAI/1.0',
            },
          }
        );
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            const address = result.display_name;
            
            setCurrentLat(lat);
            setCurrentLng(lng);
            onLocationSelect(lat, lng, address);
          } else {
            toast.error('Aucun résultat trouvé pour cette recherche.');
          }
        } else {
          throw new Error('Services de géocodage indisponibles');
        }
      } else {
        const data = await response.json();
        
        if (data && data.features && data.features.length > 0) {
          const result = data.features[0];
          const [lng, lat] = result.geometry.coordinates;
          const address = result.properties.label;
          
          setCurrentLat(lat);
          setCurrentLng(lng);
          onLocationSelect(lat, lng, address);
        } else {
          toast.error('Aucun résultat trouvé pour cette recherche.');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      toast.error('Erreur lors de la recherche de l\'adresse.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchLocation();
    }
  };

  // Fonction pour déclencher le géocodage inverse avec debounce
  const triggerReverseGeocoding = async (lat: number, lng: number) => {
    // Annuler le timeout précédent s'il existe
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Créer un nouveau timeout avec debounce de 1 seconde
    debounceRef.current = setTimeout(async () => {
      setIsReverseGeocoding(true);
      try {
        const result = await reverseGeocode(lat, lng);
        if (result.success) {
          onLocationSelect(lat, lng, result.address, result.city, result.country);
          toast.success('Adresse récupérée ! 📍', { duration: 2000 });
        } else {
          // Si le géocodage échoue, laisser l'adresse vide pour permettre la saisie manuelle
          onLocationSelect(lat, lng, '', undefined, undefined);
          toast.info('Veuillez saisir l\'adresse manuellement', { duration: 3000 });
        }
      } catch (error) {
        console.error('Erreur géocodage inverse:', error);
        onLocationSelect(lat, lng, '', undefined, undefined);
        toast.error('Impossible de récupérer l\'adresse');
      } finally {
        setIsReverseGeocoding(false);
      }
    }, 1000);
  };

  const getUserLocation = async (shouldUpdateForm: boolean = false) => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });
        setCurrentLat(lat);
        setCurrentLng(lng);
        
        // Si l'utilisateur clique manuellement, faire le géocodage inverse et mettre à jour le formulaire
        if (shouldUpdateForm) {
          try {
            toast.loading('Récupération de l\'adresse...', { id: 'reverse-geocoding' });
            const result = await reverseGeocode(lat, lng);
            onLocationSelect(lat, lng, result.address, result.city, result.country);
            toast.success('Position et adresse récupérées ! 📍', { id: 'reverse-geocoding' });
          } catch (error) {
            console.error('Erreur de géocodage inverse:', error);
            onLocationSelect(lat, lng, `Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            toast.success('Position récupérée ! 📍', { id: 'reverse-geocoding' });
          }
        } else if (hasAutoLocated) {
          toast.success('Position trouvée ! 📍');
        }
        setIsLocating(false);
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        if (shouldUpdateForm || hasAutoLocated) {
          toast.error('Impossible de récupérer votre position');
        }
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };


  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      <div ref={controlsRef} className="flex-none space-y-4">
        {/* Header avec icône et bouton géolocalisation */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 via-blue-50 to-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">Sélecteur de localisation</h3>
              <p className="text-sm text-muted-foreground">
                {isLocating 
                  ? 'Localisation en cours...' 
                  : isReverseGeocoding 
                    ? 'Récupération de l\'adresse...'
                    : 'Cliquez sur la carte ou recherchez une adresse'
                }
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => getUserLocation(true)} // Mettre à jour le formulaire quand l'utilisateur clique
            disabled={isLocating}
            size="sm"
            variant="outline"
            className="gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
          >
            <Locate className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''} ${userLocation ? 'text-green-500' : 'text-primary'}`} />
            {isLocating ? 'Localisation...' : userLocation ? 'Relocalisé ✓' : 'Me localiser'}
          </Button>
        </div>
        {/* Barre de recherche stylisée */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-lg blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
          <div className="relative flex gap-2 p-3 bg-background/80 backdrop-blur-sm border border-primary/30 rounded-lg hover:border-primary/50 transition-all duration-300">
            <div className="flex-1 relative">
              <Label htmlFor="location-search" className="sr-only">Rechercher une adresse</Label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="location-search"
                  placeholder="Rechercher une adresse magique..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 border-0 bg-transparent focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                />
              </div>
            </div>
            <Button 
              onClick={searchLocation} 
              disabled={isSearching || !searchQuery.trim()}
              size="default"
              className="gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-primary/25"
            >
              <Search className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
              {isSearching ? 'Recherche...' : 'Explorer'}
            </Button>
          </div>
        </div>

        {/* Informations de coordonnées stylisées */}
        <div className="space-y-3">
          <div className="flex items-center justify-center p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border border-muted-foreground/20">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <div className="p-1 bg-primary/20 rounded-full">
                <MapPin className="w-3 h-3 text-primary" />
              </div>
              <span className="font-mono font-medium">
                Position: {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
              </span>
              {userLocation && (
                <div className="ml-2 flex items-center gap-1 text-green-600">
                  <Zap className="w-3 h-3" />
                  <span className="text-xs">Géolocalisé</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="manual-lat" className="text-xs font-medium text-muted-foreground">Latitude</Label>
              <div className="relative">
                <Input
                  id="manual-lat"
                  type="number"
                  step="any"
                  value={currentLat}
                  onChange={(e) => {
                    const lat = parseFloat(e.target.value) || 0;
                    setCurrentLat(lat);
                    // Déclencher le géocodage inverse avec debounce
                    triggerReverseGeocoding(lat, currentLng);
                  }}
                  className="text-sm font-mono bg-background/50 border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-lng" className="text-xs font-medium text-muted-foreground">Longitude</Label>
              <div className="relative">
                <Input
                  id="manual-lng"
                  type="number"
                  step="any"
                  value={currentLng}
                  onChange={(e) => {
                    const lng = parseFloat(e.target.value) || 0;
                    setCurrentLng(lng);
                    // Déclencher le géocodage inverse avec debounce
                    triggerReverseGeocoding(currentLat, lng);
                  }}
                  className="text-sm font-mono bg-background/50 border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Carte interactive avec hauteur dynamique */}
      <div className="flex-1 min-h-0 mt-4">
        <SimpleInteractiveMap
          latitude={currentLat}
          longitude={currentLng}
          onLocationSelect={onLocationSelect}
          height={mapHeight}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default LocationPicker;