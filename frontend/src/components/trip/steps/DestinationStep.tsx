import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getLocalizedName } from "@/utils/multilingualHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DestinationSuggestions } from "@/components/trip/DestinationSuggestions";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, MapPin, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Destination, TripFormData } from "@/types/trip";
import LocationPicker from "@/components/LocationPicker";
import { apiClient } from "@/integrations/api/client";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { locationService } from "@/services/locationService";
import { toast } from "sonner";

interface Country {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  // Multilingual fields
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  name_it?: string;
  name_pt?: string;
  name_ru?: string;
  name_ja?: string;
  name_zh?: string;
  name_hi?: string;
  name_ar?: string;
}

interface City {
  id: string;
  name: string;
  country: string; // ID of the country
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  // Multilingual fields
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  name_it?: string;
  name_pt?: string;
  name_ru?: string;
  name_ja?: string;
  name_zh?: string;
  name_hi?: string;
  name_ar?: string;
}

interface DestinationStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

export default function DestinationStep({ data, onUpdate, onValidate }: DestinationStepProps) {
  const { t, i18n } = useTranslation();
  const [destinations, setDestinations] = useState<Destination[]>(
    data.destinations || [{ country: "", city: "", duration: 3, dateMode: 'duration' }]
  );
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    fetchCountries();
    fetchCities();
  }, []);

  useEffect(() => {
    const isValid = destinations.length > 0 && destinations.every(
      dest => dest.country && dest.city && dest.duration > 0
    );
    onValidate(isValid);
    if (isValid) {
      onUpdate({ destinations });
    }
  }, [destinations, onUpdate, onValidate]);

  const fetchCountries = async () => {
    const countriesData = await apiClient.get<Country[]>("locations/countries/", {
      is_active: true,
      ordering: "name"
    });
    // Handle both array response and paginated response {results: [...]}
    const normalized = Array.isArray(countriesData)
      ? countriesData
      : (countriesData as any)?.results || [];
    setCountries(normalized);
    return normalized;
  };

  const fetchCities = async () => {
    const citiesData = await apiClient.get<City[]>("locations/cities/", {
      is_active: true,
      ordering: "name"
    });
    // Handle both array response and paginated response {results: [...]}
    const normalized = Array.isArray(citiesData)
      ? citiesData
      : (citiesData as any)?.results || [];
    setCities(normalized);
    return normalized;
  };

  const addDestination = () => {
    const lastDestination = destinations[destinations.length - 1];
    const newStartDate = lastDestination?.endDate ? addDays(lastDestination.endDate, 1) : undefined;
    
    setDestinations([...destinations, { 
      country: "", 
      city: "", 
      duration: 3,
      dateMode: 'duration',
      startDate: newStartDate,
      endDate: newStartDate ? addDays(newStartDate, 2) : undefined
    }]);
  };

  const removeDestination = (index: number) => {
    if (destinations.length > 1) {
      setDestinations(destinations.filter((_, i) => i !== index));
    }
  };

  const updateDestination = (index: number, field: keyof Destination, value: any) => {
    const updated = [...destinations];
    updated[index] = { ...updated[index], [field]: value };

    // Si on change le pays, on met à jour les coordonnées et on reset la ville
    if (field === 'country') {
      const selectedCountry = countries.find(c => c.name === value);
      if (selectedCountry) {
        updated[index].city = "";
      }
    }

    // Si on change la ville, on met à jour les coordonnées
    if (field === 'city') {
      const selectedCity = cities.find(c => {
        if (c.name !== value) return false;
        const cityCountry = countries.find(country => country.id === c.country);
        return cityCountry?.name === updated[index].country;
      });
      if (selectedCity) {
        updated[index].latitude = selectedCity.latitude;
        updated[index].longitude = selectedCity.longitude;
      }
    }

    // Si on change le mode de date
    if (field === 'dateMode') {
      if (value === 'duration') {
        updated[index].startDate = undefined;
        updated[index].endDate = undefined;
      } else if (value === 'dates' && !updated[index].startDate) {
        // Initialiser avec des dates par défaut
        const baseDate = index === 0 ? new Date() : (destinations[index - 1]?.endDate ? addDays(destinations[index - 1].endDate, 1) : new Date());
        updated[index].startDate = baseDate;
        updated[index].endDate = addDays(baseDate, updated[index].duration - 1);
      }
    }

    // Si on change la date de début, recalculer la durée ou ajuster la date de fin
    if (field === 'startDate' && value && updated[index].endDate) {
      const days = differenceInDays(updated[index].endDate!, value) + 1;
      updated[index].duration = Math.max(1, days);
    }

    // Si on change la date de fin, recalculer la durée
    if (field === 'endDate' && value && updated[index].startDate) {
      const days = differenceInDays(value, updated[index].startDate!) + 1;
      updated[index].duration = Math.max(1, days);
    }

    // Si on change la durée en mode dates, ajuster la date de fin
    if (field === 'duration' && updated[index].dateMode === 'dates' && updated[index].startDate) {
      updated[index].endDate = addDays(updated[index].startDate!, value - 1);
    }

    setDestinations(updated);
  };

  const getAvailableCities = (countryName: string) => {
    const country = countries.find(c => c.name === countryName);
    if (!country) return [];
    return cities.filter(c => c.country === country.id);
  };

  const normalizeCoordinate = (value?: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Number(value.toFixed(6))
      : undefined;

  const handleLocationSelect = async (
    latitude: number,
    longitude: number,
    address: string,
    providedCity?: string,
    providedCountry?: string
  ) => {
    const addressParts = address
      ? address.split(',').map(part => part.trim()).filter(Boolean)
      : [];
    const fallbackCountry = providedCountry || addressParts[addressParts.length - 1] || '';
    const fallbackCity = providedCity || addressParts[addressParts.length - 2] || '';

    const safeLatitude = normalizeCoordinate(latitude);
    const safeLongitude = normalizeCoordinate(longitude);

    let finalCountryName = fallbackCountry;
    let finalCityName = fallbackCity;
    let finalLatitude = safeLatitude ?? latitude;
    let finalLongitude = safeLongitude ?? longitude;

    if (finalCountryName && finalCityName) {
      try {
        // Récupérer les traductions multilingues via Nominatim
        toast.info(t('planTrip.destinationStep.fetchingTranslations') || 'Récupération des traductions...');

        const { getMultilingualLocationNamesQuick } = await import('@/services/multilingualGeocodingService');
        const multilingualData = await getMultilingualLocationNamesQuick(
          latitude,
          longitude,
          fallbackCity,
          fallbackCountry
        );

        // Préparer les traductions pour l'API
        const countryTranslations: Record<string, string> = {};
        const cityTranslations: Record<string, string> = {};

        // Extraire les traductions du pays
        Object.keys(multilingualData.country).forEach(key => {
          if (key.startsWith('name_') && multilingualData.country[key as keyof typeof multilingualData.country]) {
            countryTranslations[key] = multilingualData.country[key as keyof typeof multilingualData.country] as string;
          }
        });

        // Extraire les traductions de la ville
        Object.keys(multilingualData.city).forEach(key => {
          if (key.startsWith('name_') && multilingualData.city[key as keyof typeof multilingualData.city]) {
            cityTranslations[key] = multilingualData.city[key as keyof typeof multilingualData.city] as string;
          }
        });

        const resolution = await locationService.resolveLocation({
          country_name: finalCountryName,
          city_name: finalCityName,
          latitude: safeLatitude,
          longitude: safeLongitude,
          country_translations: countryTranslations,
          city_translations: cityTranslations
        });

        const [refreshedCountries, refreshedCities] = await Promise.all([
          fetchCountries(),
          fetchCities()
        ]);

        const resolvedCountry = refreshedCountries.find(
          country => country.id === resolution.country_id
        );
        const resolvedCity = refreshedCities.find(
          city => city.id === resolution.city_id
        );

        finalCountryName = resolvedCountry?.name || resolution.country_name;
        finalCityName = resolvedCity?.name || resolution.city_name;
        finalLatitude = resolvedCity?.latitude ?? latitude;
        finalLongitude = resolvedCity?.longitude ?? longitude;

        toast.success(t('planTrip.destinationStep.locationSaved'));
      } catch (error) {
        console.error('Error resolving location:', error);
        toast.error(t('planTrip.destinationStep.locationSaveError'));
      }
    }

    if (!finalCountryName && !finalCityName) {
      toast.error(t('planTrip.destinationStep.invalidAddress'));
      return;
    }

    const updateLastDestination = () => {
      const lastIndex = destinations.length - 1;
      const updated = [...destinations];
      updated[lastIndex] = {
        ...updated[lastIndex],
        country: finalCountryName || updated[lastIndex].country,
        city: finalCityName || updated[lastIndex].city,
        latitude: finalLatitude,
        longitude: finalLongitude
      };
      setDestinations(updated);
    };

    if (destinations.length > 0) {
      updateLastDestination();
    } else {
      setDestinations([{
        country: finalCountryName,
        city: finalCityName,
        latitude: finalLatitude,
        longitude: finalLongitude,
        duration: 3,
        dateMode: 'duration'
      }]);
    }

    setTimeout(() => {
      setShowLocationPicker(false);
    }, 100);
  };

  const totalDuration = destinations.reduce((sum, dest) => sum + dest.duration, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{t('planTrip.destinationStep.title')}</h3>
        <p className="text-muted-foreground">
          {t('planTrip.destinationStep.selectDescription')}
        </p>
      </div>

      <div className="space-y-4">
        {destinations.map((destination, index) => (
          <Card key={index} className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {t('planTrip.destinationStep.destination')} {index + 1}
                </span>
                {destinations.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDestination(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`country-select-${index}`}>{t('planTrip.destinationStep.country')}</Label>
                  <Select 
                    value={destination.country} 
                    onValueChange={(value) => updateDestination(index, 'country', value)}
                  >
                    <SelectTrigger id={`country-select-${index}`}>
                      <SelectValue placeholder={t('planTrip.destinationStep.selectCountry')} />
                    </SelectTrigger>
                          <SelectContent>
                            {countries.filter(country => country.id && country.name).map((country) => (
                              <SelectItem key={country.id} value={country.name}>
                                {getLocalizedName(country, i18n.language)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`city-select-${index}`}>{t('planTrip.destinationStep.city')}</Label>
                  <Select 
                    value={destination.city} 
                    onValueChange={(value) => updateDestination(index, 'city', value)}
                    disabled={!destination.country}
                  >
                    <SelectTrigger id={`city-select-${index}`}>
                      <SelectValue placeholder={t('planTrip.destinationStep.selectCity')} />
                    </SelectTrigger>
                          <SelectContent>
                            {getAvailableCities(destination.country).filter(city => city.id && city.name).map((city) => (
                              <SelectItem key={city.id} value={city.name}>
                                {getLocalizedName(city, i18n.language)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`duration-${index}`}>{t('planTrip.destinationStep.duration')}</Label>
                  <Tabs 
                    value={destination.dateMode || 'duration'} 
                    onValueChange={(value) => updateDestination(index, 'dateMode', value)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="duration">{t('planTrip.destinationStep.numberOfDays')}</TabsTrigger>
                      <TabsTrigger value="dates">{t('planTrip.destinationStep.exactDates')}</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="duration" className="mt-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id={`duration-input-${index}`}
                          name={`duration-${index}`}
                          type="number"
                          min="1"
                          max="30"
                          value={destination.duration}
                          onChange={(e) => updateDestination(index, 'duration', parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">{destination.duration > 1 ? t('planTrip.destinationStep.days') : t('planTrip.destinationStep.day')}</span>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="dates" className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`start-date-${index}`} className="text-xs">{t('planTrip.destinationStep.startDate')}</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id={`start-date-${index}`}
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !destination.startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {destination.startDate ? format(destination.startDate, "dd/MM") : t('planTrip.destinationStep.start')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={destination.startDate}
                                onSelect={(date) => updateDestination(index, 'startDate', date)}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div>
                          <Label htmlFor={`end-date-${index}`} className="text-xs">{t('planTrip.destinationStep.endDate')}</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id={`end-date-${index}`}
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !destination.endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {destination.endDate ? format(destination.endDate, "dd/MM") : t('planTrip.destinationStep.end')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={destination.endDate}
                                onSelect={(date) => updateDestination(index, 'endDate', date)}
                                disabled={(date) => destination.startDate ? date < destination.startDate : false}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      {destination.startDate && destination.endDate && (
                        <div className="text-center">
                          <Badge variant="secondary" className="text-primary">
                            {destination.duration} {destination.duration > 1 ? t('planTrip.destinationStep.days') : t('planTrip.destinationStep.day')}
                          </Badge>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outline"
          onClick={addDestination}
          className="w-full border-dashed border-2 hover:border-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('planTrip.destinationStep.addDestination')}
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowLocationPicker(true);
        }}
        className="w-full border-dashed border-2 hover:border-primary"
        disabled={destinations.length === 0}
      >
        <MapPin className="h-4 w-4 mr-2" />
        {t('planTrip.destinationStep.chooseOnMap')}
        {destinations.length === 0 && (
          <span className="ml-2 text-xs text-muted-foreground">({t('planTrip.destinationStep.addFirstDestination')})</span>
        )}
      </Button>

      <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
        <DialogContent
          className="max-w-4xl w-[90vw] h-[85vh] p-0 overflow-hidden flex flex-col"
          aria-describedby="map-description"
        >
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {t('planTrip.destinationStep.selectOnMap')}
              </DialogTitle>
            </DialogHeader>
            <div id="map-description" className="sr-only">
              {t('planTrip.destinationStep.mapDescription')}
            </div>
          </div>
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {showLocationPicker && (
              <LocationPicker
                onLocationSelect={(lat, lng, address, city, country) => {
                  handleLocationSelect(lat, lng, address, city, country);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">{t('planTrip.destinationStep.totalDuration')}</span>
            </div>
            <Badge variant="secondary" className="text-primary">
              {totalDuration} {totalDuration > 1 ? t('planTrip.destinationStep.days') : t('planTrip.destinationStep.day')}
            </Badge>
          </div>
          
          {destinations.some(d => d.country && d.city) && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground mb-2">{t('planTrip.destinationStep.itinerary')}</p>
              <div className="flex flex-wrap gap-2">
                {destinations
                  .filter(d => d.country && d.city)
                  .map((dest, index) => (
                    <Badge key={index} variant="outline">
                      {dest.city}, {dest.country} ({dest.duration}j)
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
