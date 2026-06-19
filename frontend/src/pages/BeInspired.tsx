import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPOIContributionForm } from "@/components/poi/migration";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Search, Filter, Plus, Bot, Sparkles, UtensilsCrossed, Target, Landmark, Globe, Layers, Hotel, ArrowUpDown, Plane, Store, X } from "lucide-react";

// Chips thématiques → catégorie (valeurs de categorizePOI). key=null = "Tout".
// Les hôtels ne sont PLUS un filtre POI (gérés par Stay22) → chip d'action séparé.
const THEME_CHIPS = [
  { key: null as string | null, labelKey: 'beInspired.chips.all', fallback: 'Tout', icon: Layers },
  { key: 'restaurant', labelKey: 'beInspired.chips.gastronomy', fallback: 'Gastronomie', icon: UtensilsCrossed },
  { key: 'activity', labelKey: 'beInspired.chips.activities', fallback: 'Activités', icon: Target },
  { key: 'tourist', labelKey: 'beInspired.chips.culture', fallback: 'Culture & sites', icon: Landmark },
];
import { InteractiveInspireMap } from "@/components/inspire/InteractiveInspireMap";
import POIList from "@/components/inspire/POIList";
import LocationAutocomplete, { OsmPick } from "@/components/trip/LocationAutocomplete";
import FilterPanel from "@/components/inspire/FilterPanel";
import { TravelAIAssistant } from "@/components/inspire/TravelAIAssistant";
import { SmartRecommendations } from "@/components/inspire/SmartRecommendations";
import Stay22HotelDialog from "@/components/widgets/Stay22HotelDialog";
import FlightSearchDialog from "@/components/widgets/FlightSearchDialog";
import { POI, POIFilters, createTouristPoint, categorizePOI } from "@/services/poiService";
import { toast } from "sonner";
import { useSystemSettings } from "@/hooks/useSystemSettings";

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const [mapCenter, setMapCenter] = useState({ lat: 48.8566, lon: 2.3522 }); // Paris by default
  const [radiusKm, setRadiusKm] = useState(30);
  const [filters, setFilters] = useState<POIFilters>({});
  // Découverte = base (import Overture) uniquement. Les sources live (OSM/Geoapify/
  // Foursquare/LocationIQ) sont retirées (redondantes avec Overture → doublons + lenteur).
  const [includeExternal] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  // Synchronisation carte <-> vue liste
  const [visiblePOIs, setVisiblePOIs] = useState<POI[]>([]);
  const [hoveredPOIId, setHoveredPOIId] = useState<string | null>(null);
  const [focusPOIId, setFocusPOIId] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'popularity'>('distance');
  const [cityQuery, setCityQuery] = useState('');
  const [poiQuery, setPoiQuery] = useState(''); // recherche d'un lieu par nom (filtre la liste)

  // Sélection d'une ville → on recentre la carte sur ses coordonnées (sans pays).
  const handleCityPick = (pick: OsmPick) => {
    if (pick.lat != null && pick.lon != null) {
      setMapCenter({ lat: pick.lat, lon: pick.lon });
      toast.success(t('beInspired.cityCentered', { city: pick.name, defaultValue: 'Carte centrée sur {{city}}' }));
    }
  };

  // Contexte injecté dans l'assistant IA : zone affichée + lieux visibles + thème.
  const aiContext = useMemo(() => {
    const themeLabel = theme
      ? t(`beInspired.map.category.${theme}`, theme)
      : t('beInspired.chips.all', 'Tout');
    const lines = visiblePOIs.slice(0, 18).map((p) => {
      const cat = t(`beInspired.map.category.${categorizePOI(p)}`, categorizePOI(p));
      const rating = p.rating != null ? `, ${Number(p.rating).toFixed(1)}/5` : '';
      const addr = p.address ? `, ${p.address}` : '';
      return `- ${p.name} (${cat}${rating}${addr})`;
    }).join('\n');
    return `Zone affichée : centre lat ${mapCenter.lat.toFixed(4)}, lon ${mapCenter.lon.toFixed(4)}, `
      + `rayon ${radiusKm} km. Filtre thématique : ${themeLabel}. `
      + `Lieux actuellement visibles (${visiblePOIs.length})${lines ? ' :\n' + lines : '.'}`;
  }, [visiblePOIs, mapCenter.lat, mapCenter.lon, radiusKm, theme, t]);

  const aiSuggestions = useMemo(() => [
    t('beInspired.aiSuggestions.must', 'Quels sont les incontournables dans cette zone ?'),
    t('beInspired.aiSuggestions.itinerary', "Compose-moi un itinéraire d'une journée avec ces lieux"),
    t('beInspired.aiSuggestions.halfday', 'Propose-moi une demi-journée culturelle dans ce rayon'),
    t('beInspired.aiSuggestions.food', 'Quels restaurants locaux me recommandes-tu ici ?'),
  ], [t]);

  // Tri de la vue liste (les POI visibles sont déjà filtrés par thème côté carte).
  const sortedVisiblePOIs = useMemo(() => {
    const arr = [...visiblePOIs];
    arr.sort((a, b) => {
      if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (sortBy === 'popularity') return (b.review_count || 0) - (a.review_count || 0);
      return (a.distance ?? Infinity) - (b.distance ?? Infinity); // distance par défaut
    });
    return arr;
  }, [visiblePOIs, sortBy]);
  // Filtre par nom (recherche d'un lieu) appliqué à la liste affichée.
  const displayedPOIs = useMemo(() => {
    const q = poiQuery.trim().toLowerCase();
    if (!q) return sortedVisiblePOIs;
    return sortedVisiblePOIs.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [sortedVisiblePOIs, poiQuery]);
  const [poiCount, setPOICount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingPOI, setIsAddingPOI] = useState(false);
  const [addChooserOpen, setAddChooserOpen] = useState(false);

  // Aller DIRECTEMENT au formulaire d'inscription partenaire (pas de passage par /auth).
  const goToPartnerApplication = () => {
    setAddChooserOpen(false);
    window.location.href = '/partner-application';
  };
  // Renseigner un lieu directement (contribution modérée). Connexion requise sinon /auth.
  const startDirectContribution = () => {
    setAddChooserOpen(false);
    if (user) setIsAddingPOI(true);
    else window.location.href = `/auth?redirectTo=${encodeURIComponent('/inspire')}`;
  };
  const [addPOILoading, setAddPOILoading] = useState(false);
  
  // POI addition form
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

  // Get user position on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          toast.success(t('beInspired.positionDetected'));
        },
        (error) => {
        }
      );
    }
  }, []);

  // Reset du focus après consommation par la carte → permet de re-cliquer la même carte.
  useEffect(() => {
    if (!focusPOIId) return;
    const tm = setTimeout(() => setFocusPOIId(null), 300);
    return () => clearTimeout(tm);
  }, [focusPOIId]);

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
      toast.error(t('beInspired.mustBeLoggedIn'));
      return;
    }

    if (!pointForm.name.trim()) {
      toast.error(t('beInspired.nameRequired'));
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

      toast.success(t('beInspired.successAdded'));
      
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
      console.error('Error adding point of interest:', error);
      toast.error(t('beInspired.errorAdding', { error: error.message }));
    } finally {
      setAddPOILoading(false);
    }
  };

  // Don't render if module is disabled in admin settings
  if (!settings.beInspiredEnabled) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-6 sm:py-8 animate-fade-in">
      <Helmet>
        <title>{t('beInspired.pageTitle')}</title>
        <meta name="description" content={t('beInspired.pageDescription')} />
        <link rel="canonical" href="/inspire" />
      </Helmet>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-6">
        <div className="flex-1">
          <h1 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-semibold">{t('beInspired.title')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('beInspired.subtitle', { radius: radiusKm })}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <TravelAIAssistant initialContext={aiContext} suggestions={aiSuggestions}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Bot className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('beInspired.aiGuide')}</span>
              <span className="sm:hidden">{t('beInspired.aiGuideShort')}</span>
            </Button>
          </TravelAIAssistant>
          
          {user && (
            <Dialog open={isAddingPOI} onOpenChange={setIsAddingPOI}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('beInspired.shareDiscovery')}</span>
                  <span className="sm:hidden">{t('beInspired.shareDiscoveryShort')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">{t('beInspired.dialogTitle')}</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    {t('beInspired.dialogDescription')}
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

          {/* Pont explicite : devenir partenaire pour ajouter/gérer un lieu (visible à tous) */}
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={goToPartnerApplication}
          >
            <Store className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('beInspired.becomePartner', 'Devenir partenaire')}</span>
            <span className="sm:hidden">{t('beInspired.becomePartnerShort', 'Partenaire')}</span>
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        poiCount={poiCount}
        isLoading={isLoading}
      />

      {/* Chips thématiques (filtre POI) + actions Hôtels / Vols */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {THEME_CHIPS.map((chip) => (
          <Button
            key={chip.key ?? 'all'}
            type="button"
            size="sm"
            variant={theme === chip.key ? 'default' : 'outline'}
            aria-pressed={theme === chip.key}
            onClick={() => setTheme(chip.key)}
            className="rounded-full"
          >
            <chip.icon className="w-4 h-4 mr-1.5" />
            {t(chip.labelKey, chip.fallback)}
          </Button>
        ))}

        <span className="mx-1 hidden sm:inline-block w-px h-5 bg-border" aria-hidden />

        {/* Hôtels → Stay22 (réservation, pas un filtre POI) */}
        <Stay22HotelDialog lat={mapCenter.lat} lng={mapCenter.lon}>
          <Button type="button" size="sm" variant="secondary" className="rounded-full">
            <Hotel className="w-4 h-4 mr-1.5" />
            {t('beInspired.chips.hotels', 'Hôtels')}
          </Button>
        </Stay22HotelDialog>

        {/* Vols → TravelPayouts */}
        <FlightSearchDialog>
          <Button type="button" size="sm" variant="secondary" className="rounded-full">
            <Plane className="w-4 h-4 mr-1.5" />
            {t('beInspired.chips.flights', 'Vols')}
          </Button>
        </FlightSearchDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Main column - Map */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          {/* Recherche par ville + rayon — sur une seule ligne */}
          <Card className="mb-4">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                {/* Ville (recentre la carte) */}
                <div className="flex-1 min-w-0">
                  <label htmlFor="city-search" className="text-sm font-medium mb-1 block">
                    {t('beInspired.citySearchLabel', 'Rechercher une ville')}
                  </label>
                  <LocationAutocomplete
                    id="city-search"
                    kind="city"
                    value={cityQuery}
                    onTextChange={setCityQuery}
                    onSelect={handleCityPick}
                    language={i18n.language}
                    placeholder={t('beInspired.citySearchPlaceholder', 'Ex. Fès, Marrakech, Paris…')}
                  />
                </div>

                {/* Rayon */}
                <div className="sm:shrink-0">
                  <label htmlFor="radius-select" className="text-sm font-medium mb-1 block">{t('beInspired.radiusLabel')}</label>
                  <div className="flex items-center gap-2">
                    <select
                      id="radius-select"
                      className="flex-1 sm:flex-none p-2 border rounded-md text-sm bg-background h-10"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                    >
                      <option value="10">{t('beInspired.radius10')}</option>
                      <option value="20">{t('beInspired.radius20')}</option>
                      <option value="30">{t('beInspired.radius30')}</option>
                      <option value="50">{t('beInspired.radius50')}</option>
                      <option value="75">{t('beInspired.radius75', '75 km')}</option>
                      <option value="100">{t('beInspired.radius100', '100 km')}</option>
                    </select>
                    <Badge variant="outline" className="flex items-center gap-1 shrink-0 h-10">
                      <MapPin className="h-3 w-3" />
                      {radiusKm}km
                    </Badge>
                  </div>
                </div>

                {/* Sources live retirées : la découverte s'appuie sur la base (import Overture)
                    — zéro doublon, carte plus rapide. Enrichissement fiche = OpenTripMap/Wikidata. */}
              </div>
            </CardContent>
          </Card>

          {/* Interactive map */}
          <Card className="relative">
            <CardContent className="p-0">
              <div className="h-[400px] sm:h-[500px] lg:h-[600px] w-full">
                <InteractiveInspireMap
                  centerLat={mapCenter.lat}
                  centerLon={mapCenter.lon}
                  radiusKm={radiusKm}
                  filters={filters}
                  includeExternal={includeExternal}
                  onPOISelect={handlePOISelect}
                  onPOICountChange={handlePOICountChange}
                  onLoadingChange={handleLoadingChange}
                  onVisiblePOIsChange={setVisiblePOIs}
                  onPOIHover={setHoveredPOIId}
                  hoveredPOIId={hoveredPOIId}
                  focusPOIId={focusPOIId}
                  categoryFilter={theme}
                />
              </div>

              {/* Ajouter un lieu — sur la carte (masqué quand une fiche est ouverte côté bas-droite) */}
              {!selectedPOI && (
                <Button
                  size="sm"
                  onClick={() => setAddChooserOpen(true)}
                  className="absolute bottom-4 right-4 z-[1000] shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('beInspired.addPlace.button', 'Ajouter un lieu')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Choix d'ajout d'un lieu : contribution directe OU gestion partenaire */}
        <Dialog open={addChooserOpen} onOpenChange={setAddChooserOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('beInspired.addPlace.title', 'Ajouter un lieu')}</DialogTitle>
              <DialogDescription>{t('beInspired.addPlace.desc', 'Comment souhaitez-vous ajouter ce lieu ?')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <button onClick={startDirectContribution} className="text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors flex items-start gap-3">
                <Plus className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span>
                  <span className="block font-medium">{t('beInspired.addPlace.directTitle', 'Renseigner le lieu')}</span>
                  <span className="block text-sm text-muted-foreground">{t('beInspired.addPlace.directDesc', 'Ajoutez le lieu et ses informations. Publié après validation par notre équipe.')}</span>
                </span>
              </button>
              <button onClick={goToPartnerApplication} className="text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors flex items-start gap-3">
                <Store className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span>
                  <span className="block font-medium">{t('beInspired.addPlace.partnerTitle', 'Gérer en tant que partenaire')}</span>
                  <span className="block text-sm text-muted-foreground">{t('beInspired.addPlace.partnerDesc', 'Devenez partenaire pour gérer les réservations et les tarifs de votre établissement.')}</span>
                </span>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sidebar - Vue liste synchronisée + recommandations (fixe au scroll) */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <div className="lg:sticky lg:top-4 space-y-4">
          <Card>
            <CardContent className="p-3">
              {/* Recherche d'un lieu par nom — filtre la liste ci-dessous */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={poiQuery}
                  onChange={(e) => setPoiQuery(e.target.value)}
                  placeholder={t('beInspired.searchPoiPlaceholder', 'Rechercher un lieu…')}
                  className="pl-9 pr-9 h-10"
                />
                {poiQuery && (
                  <button onClick={() => setPoiQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={t('common.clear', 'Effacer')}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Tri de la liste */}
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                <label htmlFor="poi-sort" className="sr-only">{t('beInspired.sort.label', 'Trier par')}</label>
                <select
                  id="poi-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'distance' | 'rating' | 'popularity')}
                  className="text-sm p-1.5 border rounded-md bg-background flex-1"
                >
                  <option value="distance">{t('beInspired.sort.distance', 'Proximité')}</option>
                  <option value="rating">{t('beInspired.sort.rating', 'Note')}</option>
                  <option value="popularity">{t('beInspired.sort.popularity', 'Popularité')}</option>
                </select>
              </div>
              <div className="max-h-[360px] lg:max-h-[42vh] overflow-y-auto pr-1">
                <POIList
                  pois={displayedPOIs}
                  selectedId={selectedPOI?.id ?? null}
                  hoveredId={hoveredPOIId}
                  onHover={setHoveredPOIId}
                  onSelect={(id) => setFocusPOIId(id)}
                  loading={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <SmartRecommendations
            userLat={mapCenter.lat}
            userLon={mapCenter.lon}
            radiusKm={radiusKm}
            onPOISelect={handlePOISelect}
            previewPOIs={displayedPOIs}
          />
          </div>
        </div>
      </div>

      {/* Legend */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">{t('beInspired.legendTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white"><UtensilsCrossed className="w-3.5 h-3.5" /></div>
              <span>{t('beInspired.legendRestaurants')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white"><Target className="w-3.5 h-3.5" /></div>
              <span>{t('beInspired.legendActivities')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Landmark className="w-3.5 h-3.5" /></div>
              <span>{t('beInspired.legendTourist')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white"><MapPin className="w-3.5 h-3.5" /></div>
              <span>{t('beInspired.legendCenter')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default BeInspired;
