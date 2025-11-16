import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Phone, Globe, Navigation, Heart, Plus, Route, MessageCircle } from "lucide-react";
import { POI, getPOIsInRadius, categorizePOI, getPOIIcon, getPOIColor, POIFilters } from "@/services/poiService";
import { POIFavoriteButton } from "./POIFavoriteButton";
import { CreateItineraryDialog } from "./CreateItineraryDialog";
import { POIReviews } from "./POIReviews";
import { toast } from "sonner";

interface InteractiveInspireMapProps {
  centerLat?: number;
  centerLon?: number;
  radiusKm?: number;
  filters?: POIFilters;
  onPOISelect?: (poi: POI) => void;
  onPOICountChange?: (count: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export const InteractiveInspireMap = ({
  centerLat = 48.8566,
  centerLon = 2.3522,
  radiusKm = 30,
  filters,
  onPOISelect,
  onPOICountChange,
  onLoadingChange
}: InteractiveInspireMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [selectedPOIs, setSelectedPOIs] = useState<POI[]>([]); // Pour l'itinéraire
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const markers = useRef<any[]>([]);

  // Charger Leaflet dynamiquement
  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;

      try {
        // @ts-ignore
        const L = (await import('leaflet')).default;
        
        // Importer les styles CSS une seule fois
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!mapRef.current) return;

        // Vérifier si le conteneur est déjà initialisé
        const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
        if (container._leaflet_id) {
          return; // Carte déjà initialisée
        }

        // Initialiser la carte
        const mapInstance = L.map(mapRef.current).setView([centerLat, centerLon], 12);

        // Ajouter les tuiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance);

        // Ajouter un cercle pour visualiser le rayon
        L.circle([centerLat, centerLon], {
          color: 'hsl(var(--primary))',
          fillColor: 'hsl(var(--primary))',
          fillOpacity: 0.1,
          radius: radiusKm * 1000
        }).addTo(mapInstance);

        // Marker du centre
        const centerIcon = L.divIcon({
          html: `<div style="background: hsl(var(--primary)); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        L.marker([centerLat, centerLon], { icon: centerIcon })
          .addTo(mapInstance)
          .bindPopup('Centre de recherche');

        setMap(mapInstance);

      } catch (error) {
        console.error('Erreur lors du chargement de Leaflet:', error);
        toast.error('Impossible de charger la carte');
      }
    };

    loadLeaflet();

    // Cleanup function
    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
  }, [centerLat, centerLon, radiusKm]);

  // Charger les POI
  useEffect(() => {
    const loadPOIs = async () => {
      setLoading(true);
      onLoadingChange?.(true);
      try {
        const poisData = await getPOIsInRadius(centerLat, centerLon, radiusKm, filters);
        setPois(poisData);
        onPOICountChange?.(poisData.length);
        toast.success(`${poisData.length} points d'intérêt trouvés`);
      } catch (error) {
        console.error('Erreur lors du chargement des POI:', error);
        toast.error('Erreur lors du chargement des points d\'intérêt');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    loadPOIs();
  }, [centerLat, centerLon, radiusKm, filters]);

  // Afficher les POI sur la carte
  useEffect(() => {
    if (!map || !pois.length) return;

    // @ts-ignore
    const L = window.L;
    if (!L) return;

    // Nettoyer les anciens markers
    markers.current.forEach(marker => map.removeLayer(marker));
    markers.current = [];

    // Ajouter les nouveaux markers
    pois.forEach(poi => {
      if (!poi.latitude || !poi.longitude) return;

      const category = categorizePOI(poi);
      const icon = getPOIIcon(category);
      const color = getPOIColor(category);

      const poiIcon = L.divIcon({
        html: `<div style="background: ${color}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer;">${icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([Number(poi.latitude), Number(poi.longitude)], { icon: poiIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedPOI(poi);
          onPOISelect?.(poi);
        })
        .on('dblclick', () => {
          // Double-clic pour ajouter à l'itinéraire
          handleAddToItinerary(poi);
        });

      // Popup basique
      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">${poi.name}</h3>
          ${poi.description ? `<p style="margin: 0 0 8px 0; font-size: 14px;">${poi.description.substring(0, 100)}...</p>` : ''}
          ${poi.rating ? `<div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;"><span style="color: #fbbf24;">⭐</span><span style="font-size: 14px;">${poi.rating.toFixed(1)} (${poi.review_count || 0} avis)</span></div>` : ''}
          <button onclick="window.selectPOI('${poi.id}')" style="background: hsl(var(--primary)); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Voir détails</button>
        </div>
      `;

      marker.bindPopup(popupContent);
      markers.current.push(marker);
    });

    // Fonction globale pour sélectionner un POI depuis le popup
    (window as any).selectPOI = (poiId: string) => {
      const poi = pois.find(p => p.id === poiId);
      if (poi) {
        setSelectedPOI(poi);
        onPOISelect?.(poi);
      }
    };

  }, [map, pois, onPOISelect]);

  // Fonctions pour l'itinéraire
  const handleAddToItinerary = (poi: POI) => {
    if (selectedPOIs.find(p => p.id === poi.id)) {
      toast.info('Ce point d\'intérêt est déjà dans votre itinéraire');
      return;
    }
    
    setSelectedPOIs(prev => [...prev, poi]);
    toast.success(`${poi.name} ajouté à votre itinéraire !`);
  };

  const handleRemoveFromItinerary = (poiId: string) => {
    setSelectedPOIs(prev => prev.filter(p => p.id !== poiId));
  };

  const handleItineraryCreated = () => {
    setSelectedPOIs([]);
    toast.success('Votre itinéraire a été créé !');
  };

  // Obtenir la localisation de l'utilisateur
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLocation({ lat, lon });
          
          if (map) {
            map.setView([lat, lon], 12);
            toast.success('Position mise à jour');
          }
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          toast.error('Impossible d\'obtenir votre position');
        }
      );
    } else {
      toast.error('Géolocalisation non supportée');
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Carte */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg border z-0" 
        style={{ minHeight: '500px' }}
      />

      {/* Contrôles de la carte */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <Button
          onClick={getUserLocation}
          size="sm"
          className="bg-white/90 hover:bg-white text-gray-700 border border-gray-300 shadow-lg"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Ma position
        </Button>
        
        {selectedPOIs.length > 0 && (
          <CreateItineraryDialog
            selectedPOIs={selectedPOIs}
            onPOIRemove={handleRemoveFromItinerary}
            onItineraryCreated={handleItineraryCreated}
          >
            <Button
              size="sm"
              className="bg-primary/90 hover:bg-primary text-white shadow-lg"
            >
              <Route className="w-4 h-4 mr-2" />
              Créer itinéraire ({selectedPOIs.length})
            </Button>
          </CreateItineraryDialog>
        )}
      </div>

      {/* Indicateur de chargement */}
      {loading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm">Chargement des points d'intérêt...</p>
          </div>
        </div>
      )}

      {/* Compteur de POI */}
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="outline" className="bg-white/90 shadow-lg">
          {pois.length} points d'intérêt trouvés
        </Badge>
      </div>

      {/* Aide */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-gray-600 bg-white/90 px-2 py-1 rounded shadow-lg">
        💡 Double-cliquez sur un point pour l'ajouter à votre itinéraire
      </div>

      {/* Panel détails POI sélectionné */}
      {selectedPOI && (
        <Card className="absolute bottom-4 right-4 z-10 w-80 max-h-64 overflow-y-auto animate-fade-in shadow-lg bg-white">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg">{selectedPOI.name}</h3>
              <div className="flex items-center gap-1">
                <POIReviews touristPointId={selectedPOI.id}>
                  <Button variant="ghost" size="sm" className="hover-scale">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </POIReviews>
                <POIFavoriteButton touristPointId={selectedPOI.id} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddToItinerary(selectedPOI)}
                  className="hover-scale"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {selectedPOI.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {selectedPOI.description}
              </p>
            )}
            
            <div className="space-y-2 text-sm">
              {selectedPOI.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="break-words">{selectedPOI.address}</span>
                </div>
              )}
              
              {selectedPOI.rating && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{selectedPOI.rating}/5 ({selectedPOI.review_count || 0} avis)</span>
                </div>
              )}
              
              {selectedPOI.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${selectedPOI.contact_phone}`} className="story-link">
                    {selectedPOI.contact_phone}
                  </a>
                </div>
              )}
              
              {selectedPOI.website_url && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={selectedPOI.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="story-link"
                  >
                    Site web
                  </a>
                </div>
              )}
            </div>
            
            {selectedPOI.tags && selectedPOI.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {selectedPOI.tags.slice(0, 4).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {selectedPOI.tags.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedPOI.tags.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};