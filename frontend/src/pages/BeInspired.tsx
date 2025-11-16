import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPOIContributionForm } from "@/components/poi/migration";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Search, Filter, Plus, Bot, Sparkles } from "lucide-react";
import { InteractiveInspireMap } from "@/components/inspire/InteractiveInspireMap";
import FilterPanel from "@/components/inspire/FilterPanel";
import { TravelAIAssistant } from "@/components/inspire/TravelAIAssistant";
import { SmartRecommendations } from "@/components/inspire/SmartRecommendations";
import { HotelSearchDialog } from "@/components/amadeus/HotelSearchDialog";
import { POI, POIFilters, createTouristPoint } from "@/services/poiService";
import { toast } from "sonner";

interface TouristPointFormData {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  tags: string;
  contact_phone: string;
  contact_email: string;
  website_url: string;
  opening_hours: string;
  price_range: string;
  amenities: string;
  media_images?: string[] | null;
  media_videos?: string[] | null;
}

const BeInspired = () => {
  const { user } = useAuth();
  const [mapCenter, setMapCenter] = useState({ lat: 48.8566, lon: 2.3522 }); // Paris par défaut
  const [radiusKm, setRadiusKm] = useState(30);
  const [filters, setFilters] = useState<POIFilters>({});
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [poiCount, setPOICount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingPOI, setIsAddingPOI] = useState(false);
  const [addPOILoading, setAddPOILoading] = useState(false);
  
  // Formulaire d'ajout de POI
  const [pointForm, setPointForm] = useState<TouristPointFormData>({
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    tags: '',
    contact_phone: '',
    contact_email: '',
    website_url: '',
    opening_hours: '',
    price_range: '',
    amenities: '',
    media_images: null,
    media_videos: null
  });
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null);

  // Obtenir la position de l'utilisateur au chargement
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          toast.success("Position détectée !");
        },
        (error) => {
        }
      );
    }
  }, []);

  const handlePOISelect = (poi: POI) => {
    setSelectedPOI(poi);
  };

  const handleFiltersChange = (newFilters: POIFilters) => {
    setFilters(newFilters);
  };

  const handlePOICountChange = (count: number) => {
    setPOICount(count);
  };

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setSelectedLocation({ lat, lng, address });
    setPointForm(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
      address
    }));
  };

  const handlePointSubmit = async (e: React.FormEvent, mediaImages: string[], mediaVideos: string[]) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Vous devez être connecté pour ajouter un point d\'intérêt');
      return;
    }

    if (!pointForm.name.trim()) {
      toast.error('Le nom du point d\'intérêt est requis');
      return;
    }

    setAddPOILoading(true);

    try {
      const pointData = {
        name: pointForm.name.trim(),
        description: pointForm.description.trim(),
        address: pointForm.address.trim(),
        latitude: parseFloat(pointForm.latitude) || null,
        longitude: parseFloat(pointForm.longitude) || null,
        tags: pointForm.tags ? pointForm.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        contact_phone: pointForm.contact_phone.trim() || null,
        contact_email: pointForm.contact_email.trim() || null,
        website_url: pointForm.website_url.trim() || null,
        amenities: pointForm.amenities ? pointForm.amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
        media_images: mediaImages.length > 0 ? mediaImages : [],
        is_active: true,
        is_verified: false,
        status_enum: 'pending_validation' as const
      };

      await createTouristPoint(pointData);

      toast.success('Point d\'intérêt ajouté avec succès !');
      
      // Reset form
      setPointForm({
        name: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        tags: '',
        contact_phone: '',
        contact_email: '',
        website_url: '',
        opening_hours: '',
        price_range: '',
        amenities: '',
        media_images: null,
        media_videos: null
      });
      setSelectedLocation(null);
      setIsAddingPOI(false);
      
      // Trigger a refresh of POI data by updating map center slightly
      setMapCenter(prev => ({ 
        lat: prev.lat + 0.0001, 
        lon: prev.lon + 0.0001 
      }));
      setTimeout(() => {
        setMapCenter(prev => ({ 
          lat: prev.lat - 0.0001, 
          lon: prev.lon - 0.0001 
        }));
      }, 100);
      
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du point d\'intérêt:', error);
      toast.error(`Erreur lors de l'ajout: ${error.message}`);
    } finally {
      setAddPOILoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-6 sm:py-8 animate-fade-in">
      <Helmet>
        <title>Laissez-vous inspirer | Voyage AI</title>
        <meta name="description" content="Explorez un monde de merveilles cachées autour de vous. Découvrez des joyaux secrets, des saveurs authentiques et des expériences magiques qui n'attendent que vous." />
        <link rel="canonical" href="/inspire" />
      </Helmet>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-6">
        <div className="flex-1">
          <h1 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-semibold">✨ Laissez-vous inspirer</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Partez à la découverte de trésors cachés dans un rayon de {radiusKm}km. Chaque lieu raconte une histoire, chaque expérience crée un souvenir impérissable.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <HotelSearchDialog defaultLocation={{ 
            latitude: mapCenter.lat, 
            longitude: mapCenter.lon 
          }}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Search className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">🏨 Hôtels</span>
              <span className="sm:hidden">🏨</span>
            </Button>
          </HotelSearchDialog>
          
          <TravelAIAssistant initialContext={`L'utilisateur explore la région autour de ${mapCenter.lat}, ${mapCenter.lon}`}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Bot className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">🤖 Guide IA</span>
              <span className="sm:hidden">🤖 Guide</span>
            </Button>
          </TravelAIAssistant>
          
          {user && (
            <Dialog open={isAddingPOI} onOpenChange={setIsAddingPOI}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">🌟 Partager un trésor</span>
                  <span className="sm:hidden">🌟 Partager</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">🌟 Partagez votre découverte</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Révélez un lieu magique que vous aimez à la communauté des explorateurs
                  </DialogDescription>
                </DialogHeader>
                <UserPOIContributionForm
                  isOpen={true}
                  onClose={() => setIsAddingPOI(false)}
                  onSuccess={() => {
                    setIsAddingPOI(false);
                    // Trigger a refresh of POI data by updating map center slightly
                    setMapCenter(prev => ({ 
                      lat: prev.lat + 0.0001, 
                      lon: prev.lon + 0.0001 
                    }));
                    setTimeout(() => {
                      setMapCenter(prev => ({ 
                        lat: prev.lat - 0.0001, 
                        lon: prev.lon - 0.0001 
                      }));
                    }, 100);
                  }}
                  initialData={{
                    name: pointForm.name,
                    description: pointForm.description,
                    address: pointForm.address,
                    latitude: pointForm.latitude,
                    longitude: pointForm.longitude,
                    tags: pointForm.tags ? pointForm.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
                    contact_phone: pointForm.contact_phone,
                    contact_email: pointForm.contact_email,
                    website_url: pointForm.website_url,
                    opening_hours: pointForm.opening_hours,
                    price_range: pointForm.price_range,
                    amenities: pointForm.amenities,
                    media_images: pointForm.media_images || [],
                    media_videos: pointForm.media_videos || []
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Panneau de filtres */}
      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        poiCount={poiCount}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Colonne principale - Carte */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          {/* Contrôles de rayon de recherche */}
          <Card className="mb-4">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <label className="text-sm font-medium">🎯 Rayon d'exploration</label>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    className="flex-1 sm:flex-none p-2 border rounded-md text-sm bg-background"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                  >
                    <option value="10">10 km</option>
                    <option value="20">20 km</option>
                    <option value="30">30 km</option>
                    <option value="50">50 km</option>
                  </select>
                  <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                    <MapPin className="h-3 w-3" />
                    {radiusKm}km
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carte interactive */}
          <Card>
            <CardContent className="p-0">
              <div className="h-[400px] sm:h-[500px] lg:h-[600px] w-full">
                <InteractiveInspireMap
                  centerLat={mapCenter.lat}
                  centerLon={mapCenter.lon}
                  radiusKm={radiusKm}
                  filters={filters}
                  onPOISelect={handlePOISelect}
                  onPOICountChange={handlePOICountChange}
                  onLoadingChange={handleLoadingChange}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale - Recommandations */}
        <div className="space-y-4 order-1 lg:order-2">
          <SmartRecommendations
            userLat={mapCenter.lat}
            userLon={mapCenter.lon}
            radiusKm={radiusKm}
            onPOISelect={handlePOISelect}
          />
        </div>
      </div>

      {/* Légende */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Légende</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">🍽️</div>
              <span>Restaurants & Cafés</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">🎯</div>
              <span>Activités & Loisirs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">🏛️</div>
              <span>Points d'Intérêt Touristiques</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">📍</div>
              <span>Centre de recherche</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default BeInspired;
