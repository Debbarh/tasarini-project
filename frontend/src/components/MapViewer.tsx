import React, { useState, useEffect } from 'react';
import { MapPin, ExternalLink, Navigation2, Globe, Sparkles, Locate, Zap, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MapViewerProps {
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  className?: string;
}

const MapViewer: React.FC<MapViewerProps> = ({ 
  latitude, 
  longitude, 
  title, 
  description,
  className = "h-64 w-full rounded-lg" 
 }) => {
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showUserLocation, setShowUserLocation] = useState(false);

  const mapUrl = showUserLocation && userLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}&marker=${userLocation.lat},${userLocation.lng}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;
  
  const openInMapsUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`;

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setShowUserLocation(true);
        toast.success('Votre position ajoutée à la carte ! 📍');
      },
      (error) => {
        toast.error('Impossible de récupérer votre position');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header avec titre stylisé et contrôles */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 via-blue-50/50 to-purple-50/30 rounded-lg border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <span>{title}</span>
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
            </h4>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
        </div>
        
        <Button
          onClick={getUserLocation}
          size="sm"
          variant="ghost"
          className="gap-1 text-xs hover:bg-primary/10 transition-all duration-300"
        >
          <Locate className={`w-3 h-3 ${showUserLocation ? 'text-green-500' : 'text-primary'}`} />
          <span className="hidden sm:inline">{showUserLocation ? 'Localisé' : 'Me voir'}</span>
        </Button>
      </div>

      {/* Carte avec cadre magique */}
      <div className="relative group">
        {/* Effet de lueur animée */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-blue-500/30 to-purple-500/30 rounded-xl blur opacity-20 group-hover:opacity-40 transition-all duration-700 animate-pulse"></div>
        
        <div className="relative h-48 w-full border-2 border-primary/20 rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted/30 shadow-xl group-hover:shadow-2xl transition-all duration-500">
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ 
              border: 0,
              filter: 'hue-rotate(10deg) saturate(1.15) contrast(1.05) brightness(1.05)',
              transition: 'all 0.5s ease'
            }}
            title={`Carte interactive de ${title}`}
            loading="lazy"
            className="transition-all duration-700 group-hover:scale-105"
          />
          
          {/* Overlay décoratif avec gradient et texture */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-primary/10 pointer-events-none"></div>
          
          {/* Texture de points décorative */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <div className="w-full h-full" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(99, 102, 241, 0.4) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}></div>
          </div>
          
          {/* Badge de localisation principal */}
          <div className="absolute top-3 left-3 bg-background/95 backdrop-blur-sm rounded-full p-2 shadow-lg border border-primary/30 group-hover:scale-110 transition-transform duration-300">
            <Navigation2 className="w-4 h-4 text-primary animate-pulse" />
          </div>

          {/* Badge utilisateur si affiché */}
          {showUserLocation && userLocation && (
            <div className="absolute top-3 right-3 bg-green-500/90 backdrop-blur-sm rounded-full p-2 shadow-lg border border-green-400/30">
              <Crosshair className="w-4 h-4 text-white animate-bounce" style={{ animationDuration: '1.5s' }} />
            </div>
          )}

          {/* Indicateur de position du lieu */}
          <div className="absolute bottom-3 left-3 bg-gradient-to-r from-primary/90 to-blue-600/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg border border-white/20">
            <div className="flex items-center gap-1 text-xs text-white font-medium">
              <MapPin className="w-3 h-3 animate-bounce" style={{ animationDuration: '2s' }} />
              <span>Point d'intérêt</span>
            </div>
          </div>

          {/* Badge distance si utilisateur localisé */}
          {showUserLocation && userLocation && (
            <div className="absolute bottom-3 right-3 bg-gradient-to-r from-green-500/90 to-emerald-600/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg border border-white/20">
              <div className="flex items-center gap-1 text-xs text-white font-medium">
                <Zap className="w-3 h-3" />
                <span>Vous</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer avec coordonnées et action */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border border-muted-foreground/20">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-primary/20 rounded-full">
            <MapPin className="w-3 h-3 text-primary" />
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary transition-all duration-300 group"
          onClick={() => window.open(openInMapsUrl, '_blank')}
        >
          <ExternalLink className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" />
          <span className="hidden sm:inline">Explorer</span>
        </Button>
      </div>
    </div>
  );
};

export default MapViewer;