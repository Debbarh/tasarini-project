import { useState, useEffect } from "react";
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

interface Country {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface City {
  id: string;
  name: string;
  country_id: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

interface DestinationStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

export default function DestinationStep({ data, onUpdate, onValidate }: DestinationStepProps) {
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
    setCountries(countriesData || []);
  };

  const fetchCities = async () => {
    const citiesData = await apiClient.get<City[]>("locations/cities/", {
      is_active: true,
      ordering: "name"
    });
    setCities(citiesData || []);
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
      const selectedCity = cities.find(c => c.name === value && 
        countries.find(country => country.id === c.country_id)?.name === updated[index].country
      );
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
    return cities.filter(c => c.country_id === country.id);
  };

  const refreshCountriesAndCities = async () => {
    await Promise.all([fetchCountries(), fetchCities()]);
  };

  const handleLocationSelect = (latitude: number, longitude: number, address: string) => {
    
    // Extraire le pays et la ville de l'adresse si possible
    const addressParts = address.split(',').map(part => part.trim());
    
    // Si on a des destinations, mettre à jour la dernière
    if (destinations.length > 0) {
      const lastIndex = destinations.length - 1;
      const updated = [...destinations];
      
      // Essayer d'extraire le pays et la ville depuis l'adresse
      if (addressParts.length >= 2) {
        const country = addressParts[addressParts.length - 1] || '';
        const city = addressParts[addressParts.length - 2] || '';
        
        // Vérifier si le pays existe dans notre liste
        const existingCountry = countries.find(c => 
          c.name.toLowerCase().includes(country.toLowerCase()) || 
          country.toLowerCase().includes(c.name.toLowerCase())
        );
        
        if (existingCountry) {
          updated[lastIndex].country = existingCountry.name;
          
          // Vérifier si la ville existe dans notre liste pour ce pays
          const existingCity = cities.find(c => 
            c.country_id === existingCountry.id && 
            (c.name.toLowerCase().includes(city.toLowerCase()) || 
             city.toLowerCase().includes(c.name.toLowerCase()))
          );
          
          if (existingCity) {
            updated[lastIndex].city = existingCity.name;
          } else {
            updated[lastIndex].city = city;
          }
        } else {
          updated[lastIndex].country = country;
          updated[lastIndex].city = city;
        }
      }
      
      // Mettre à jour les coordonnées
      updated[lastIndex].latitude = latitude;
      updated[lastIndex].longitude = longitude;
      
      setDestinations(updated);
    } else {
      // Si pas de destinations, en créer une nouvelle
      const country = addressParts[addressParts.length - 1] || 'Pays sélectionné';
      const city = addressParts[addressParts.length - 2] || 'Ville sélectionnée';
      
      setDestinations([{
        country,
        city,
        latitude,
        longitude,
        duration: 3,
        dateMode: 'duration'
      }]);
    }
    
    // Fermer la carte après sélection
    setTimeout(() => {
      setShowLocationPicker(false);
    }, 100);
  };

  const totalDuration = destinations.reduce((sum, dest) => sum + dest.duration, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Quelles sont vos destinations ?</h3>
        <p className="text-muted-foreground">
          Sélectionnez les pays et villes que vous souhaitez visiter
        </p>
      </div>

      <div className="space-y-4">
        {destinations.map((destination, index) => (
          <Card key={index} className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Destination {index + 1}
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
                  <Label htmlFor={`country-select-${index}`}>Pays</Label>
                  <Select 
                    value={destination.country} 
                    onValueChange={(value) => updateDestination(index, 'country', value)}
                  >
                    <SelectTrigger id={`country-select-${index}`}>
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                          <SelectContent>
                            {countries.filter(country => country.id && country.name).map((country) => (
                              <SelectItem key={country.id} value={country.name}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`city-select-${index}`}>Ville</Label>
                  <Select 
                    value={destination.city} 
                    onValueChange={(value) => updateDestination(index, 'city', value)}
                    disabled={!destination.country}
                  >
                    <SelectTrigger id={`city-select-${index}`}>
                      <SelectValue placeholder="Sélectionner une ville" />
                    </SelectTrigger>
                          <SelectContent>
                            {getAvailableCities(destination.country).filter(city => city.id && city.name).map((city) => (
                              <SelectItem key={city.id} value={city.name}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`duration-${index}`}>Durée</Label>
                  <Tabs 
                    value={destination.dateMode || 'duration'} 
                    onValueChange={(value) => updateDestination(index, 'dateMode', value)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="duration">Nombre de jours</TabsTrigger>
                      <TabsTrigger value="dates">Dates exactes</TabsTrigger>
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
                        <span className="text-sm text-muted-foreground">jour{destination.duration > 1 ? 's' : ''}</span>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="dates" className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`start-date-${index}`} className="text-xs">Date de début</Label>
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
                                {destination.startDate ? format(destination.startDate, "dd/MM") : "Début"}
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
                          <Label htmlFor={`end-date-${index}`} className="text-xs">Date de fin</Label>
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
                                {destination.endDate ? format(destination.endDate, "dd/MM") : "Fin"}
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
                            {destination.duration} jour{destination.duration > 1 ? 's' : ''}
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
          Ajouter une destination
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
        Choisir sur la carte
        {destinations.length === 0 && (
          <span className="ml-2 text-xs text-muted-foreground">(Ajoutez d'abord une destination)</span>
        )}
      </Button>

      <Dialog open={showLocationPicker} onOpenChange={setShowLocationPicker}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="map-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Sélectionnez votre destination sur la carte
            </DialogTitle>
          </DialogHeader>
          <div id="map-description" className="sr-only">
            Sélectionnez une destination en cliquant sur la carte ou en recherchant une adresse
          </div>
          <div className="mt-4">
            <LocationPicker
              onLocationSelect={(lat, lng, address) => {
                handleLocationSelect(lat, lng, address);
                // Rafraîchir les listes après sélection d'une nouvelle localisation
                setTimeout(() => refreshCountriesAndCities(), 1000);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Durée totale du voyage</span>
            </div>
            <Badge variant="secondary" className="text-primary">
              {totalDuration} jour{totalDuration > 1 ? 's' : ''}
            </Badge>
          </div>
          
          {destinations.some(d => d.country && d.city) && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground mb-2">Itinéraire :</p>
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