import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';

interface SimpleInteractiveMapProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  className?: string;
  height?: string | number;
}

const SimpleInteractiveMap: React.FC<SimpleInteractiveMapProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  className = "h-80",
  height = "h-64"
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fonction pour vérifier et créer le pays et la ville dans la base de données
  const ensureCountryAndCityExist = async (countryName: string, cityName: string, lat: number, lng: number) => {
    try {
      // 1. Vérifier si le pays existe
      const existingCountries = await apiClient.get<any[]>('locations/countries/', {
        name__iexact: countryName,
        limit: 1
      });

      let countryId: string;

      if (existingCountries && existingCountries.length > 0) {
        // Le pays existe déjà
        countryId = existingCountries[0].id;
      } else {
        // Créer le nouveau pays
        const countryCode = countryName.substring(0, 2).toUpperCase();
        const newCountry = await apiClient.post<any>('locations/countries/', {
          name: countryName,
          code: countryCode,
          is_active: true
        });

        countryId = newCountry.id;
      }

      // 2. Vérifier si la ville existe dans ce pays
      const existingCities = await apiClient.get<any[]>('locations/cities/', {
        country: countryId,
        name__iexact: cityName,
        limit: 1
      });

      if (!existingCities || existingCities.length === 0) {
        // Créer la nouvelle ville
        await apiClient.post<any>('locations/cities/', {
          name: cityName,
          country: countryId,
          latitude: lat,
          longitude: lng,
          is_active: true
        });
      } else {
        // Optionnellement, mettre à jour les coordonnées si elles n'existent pas
        const cityData = existingCities[0];

        if (!cityData.latitude || !cityData.longitude) {
          await apiClient.patch<any>(`locations/cities/${cityData.id}/`, {
            latitude: lat,
            longitude: lng
          });
        }
      }

    } catch (error) {
      console.error('Erreur lors de la gestion du pays/ville:', error);
    }
  };

  // Initialisation de la carte (une seule fois)
  useEffect(() => {
    if (isInitialized || !mapRef.current) return;

    const loadLeaflet = async () => {
      try {
        // Import dynamique de Leaflet
        const L = await import('leaflet');
        
        // Configuration des icônes par défaut avec des URLs plus fiables
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Créer une icône personnalisée avec la couleur primaire bleue
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background-color: hsl(221.2 83.2% 53.3%); 
            width: 25px; 
            height: 25px; 
            border-radius: 50% 50% 50% 0; 
            transform: rotate(-45deg); 
            border: 3px solid #ffffff;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [25, 25],
          iconAnchor: [12, 24]
        });

        // Nettoyer le conteneur avant de créer la carte
        if (mapRef.current) {
          mapRef.current.innerHTML = '';
        }

        // Créer la carte
        const mapInstance = L.map(mapRef.current!).setView([latitude, longitude], 13);
        
        // Ajouter la couche de tuiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance);

        // Créer le marqueur initial avec l'icône personnalisée
        const initialMarker = L.marker([latitude, longitude], { icon: customIcon }).addTo(mapInstance);
        
        // Gérer les clics sur la carte
        mapInstance.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
          
          // Supprimer tous les marqueurs existants de la carte
          mapInstance.eachLayer((layer: any) => {
            if (layer instanceof L.Marker) {
              mapInstance.removeLayer(layer);
            }
          });
          
          // Créer un nouveau marqueur unique à la position cliquée avec l'icône personnalisée
          const preciseLatLng = L.latLng(lat, lng);
          const newMarker = L.marker(preciseLatLng, { icon: customIcon }).addTo(mapInstance);
          setMarker(newMarker);
          
          try {
            // Faire du reverse geocoding avec Nominatim pour obtenir la ville et le pays
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`,
              {
                headers: {
                  'User-Agent': 'VoyageAI/1.0',
                },
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              
              // Extraire la ville et le pays de la réponse
              const address = data.address || {};
              const cityName = address.city || address.town || address.village || address.suburb || '';
              const countryName = address.country || '';
              
              
              if (cityName && countryName) {
                // Vérifier et créer le pays/ville dans la base de données
                await ensureCountryAndCityExist(countryName, cityName, lat, lng);
                
                // Appeler la fonction callback avec la ville et le pays
                onLocationSelect(
                  Number(lat.toFixed(8)), 
                  Number(lng.toFixed(8)), 
                  `${cityName}, ${countryName}`
                );
              } else {
                // Fallback si pas de données suffisantes
                onLocationSelect(
                  Number(lat.toFixed(8)), 
                  Number(lng.toFixed(8)), 
                  `Position sélectionnée: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
                );
              }
            } else {
              // Fallback si le reverse geocoding échoue
              onLocationSelect(
                Number(lat.toFixed(8)), 
                Number(lng.toFixed(8)), 
                `Position sélectionnée: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
              );
            }
          } catch (error) {
            console.error('Erreur lors du reverse geocoding:', error);
            // Fallback si le reverse geocoding échoue
            onLocationSelect(
              Number(lat.toFixed(8)), 
              Number(lng.toFixed(8)), 
              `Position sélectionnée: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
            );
          }
        });

        setMap(mapInstance);
        setMarker(initialMarker);
        setIsInitialized(true);
        
        // Force un redimensionnement de la carte après son initialisation
        setTimeout(() => {
          mapInstance.invalidateSize();
        }, 300);

        // Observer pour redimensionner la carte quand le conteneur change
        const resizeObserver = new ResizeObserver(() => {
          if (mapInstance) {
            mapInstance.invalidateSize();
          }
        });

        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }

        // Stocker l'observer pour le nettoyage
        (mapInstance as any)._resizeObserver = resizeObserver;
      } catch (error) {
        console.error('Erreur lors du chargement de Leaflet:', error);
      }
    };

    const timer = setTimeout(() => {
      loadLeaflet();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [latitude, longitude, onLocationSelect, isInitialized]);

  // Mettre à jour la position du marqueur quand les coordonnées changent
  useEffect(() => {
    if (map && isInitialized) {
      const L = (window as any).L;
      if (L) {
        // Supprimer tous les marqueurs existants
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });
        
        // Créer un nouveau marqueur unique à la nouvelle position avec l'icône personnalisée
        const preciseLatLng = L.latLng(Number(latitude.toFixed(8)), Number(longitude.toFixed(8)));
        
        // Créer l'icône personnalisée pour le nouveau marqueur avec la couleur primaire
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background-color: hsl(221.2 83.2% 53.3%); 
            width: 25px; 
            height: 25px; 
            border-radius: 50% 50% 50% 0; 
            transform: rotate(-45deg); 
            border: 3px solid #ffffff;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [25, 25],
          iconAnchor: [12, 24]
        });
        
        const newMarker = L.marker(preciseLatLng, { icon: customIcon }).addTo(map);
        setMarker(newMarker);
        map.setView(preciseLatLng, map.getZoom());
        
        // Force le redimensionnement de la carte
        map.invalidateSize();
      }
    }
  }, [latitude, longitude, map, isInitialized]);

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      if (map) {
        // Nettoyer l'observer
        if ((map as any)._resizeObserver) {
          (map as any)._resizeObserver.disconnect();
        }
        
        if (typeof map.remove === 'function') {
          try {
            map.remove();
          } catch (error) {
            console.warn('Erreur lors de la suppression de la carte:', error);
          }
        }
      }
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
      setMap(null);
      setMarker(null);
      setIsInitialized(false);
    };
  }, []);

  const heightStyle = typeof height === 'number' ? { height: `${height}px` } : {};
  const heightClass = typeof height === 'string' ? height : '';

  return (
    <div ref={containerRef} className="relative w-full h-full z-0">
      {/* Lien vers le CSS de Leaflet */}
      <link 
        rel="stylesheet" 
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      
      {/* Styles pour le marqueur personnalisé */}
      <style>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      
      <div 
        className={`w-full rounded-lg overflow-hidden border-2 border-primary/20 shadow-lg ${heightClass} ${className} z-0`}
        style={heightStyle}
      >
        <div ref={mapRef} className="w-full h-full z-0" />
        
        {/* Instructions d'utilisation - déplacées à droite */}
        <div className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/20 z-10">
          <div className="flex items-center gap-2 text-xs text-white font-medium">
            <MapPin className="w-3 h-3" />
            <span>Cliquez sur la carte pour sélectionner</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleInteractiveMap;