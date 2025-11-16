import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Settings, Check, AlertCircle } from 'lucide-react';
import { CountrySelect } from '@/components/ui/country-select';
import { CitySelect } from '@/components/ui/city-select';
import { useToast } from '@/hooks/use-toast';
import LocationPicker from '@/components/LocationPicker';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { locationService } from '@/services/locationService';

interface LocationSectionProps {
  formData: UnifiedPOIFormData;
  updateField: <K extends keyof UnifiedPOIFormData>(field: K, value: UnifiedPOIFormData[K]) => void;
  errors: Record<string, string>;
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  formData,
  updateField,
  errors
}) => {
  const [autoExtract, setAutoExtract] = useState(false);
  const [countryId, setCountryId] = useState<string>();
  const [cityId, setCityId] = useState<string>();
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  // Ensure selects are hydrated when we load existing POI data in edit mode
  useEffect(() => {
    const initializeLocationFromForm = async () => {
      try {
        let resolvedCountryId = countryId;

        if (!resolvedCountryId && formData.country) {
          const countries = await locationService.listCountries(formData.country);
          const match = countries?.find(
            (country) => country.name.toLowerCase() === formData.country.toLowerCase()
          );
          if (match) {
            resolvedCountryId = match.id;
            setCountryId(match.id);
          }
        }

        if (formData.city && resolvedCountryId && !cityId) {
          const cities = await locationService.listCities({ country: resolvedCountryId, search: formData.city });
          const match = cities?.find(
            (city) => city.name.toLowerCase() === formData.city.toLowerCase()
          );
          if (match) {
            setCityId(match.id);
          }
        }
      } catch (error) {
        console.error('Error initializing location ids from form data:', error);
      }
    };

    if (formData.country && (!countryId || (formData.city && !cityId))) {
      initializeLocationFromForm();
    }
  }, [formData.country, formData.city, countryId, cityId]);
  
  const handleLocationSelect = async (lat: number, lng: number, address: string, city?: string, country?: string) => {
    updateField('latitude', lat.toString());
    updateField('longitude', lng.toString());
    updateField('address', address);
    
    // Vérifier automatiquement si le pays et la ville existent quand on clique sur "Relocalisé"
    if (country && city) {
      await verifyAndCreateLocation(country, city, lat, lng);
    }
  };

  const generateCountryCode = (name: string) => {
    const sanitized = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const base = (sanitized || 'CTR').slice(0, 3).padEnd(3, 'X');
    return base;
  };

  const verifyAndCreateLocation = async (countryName: string, cityName: string, lat: number, lng: number) => {
    setIsVerifying(true);
    
    try {
      // Vérifier si le pays existe
      const countryMatches = await locationService.listCountries(countryName);
      const existingCountry = countryMatches?.find(
        (country) => country.name.toLowerCase() === countryName.toLowerCase()
      );

      let finalCountryId = existingCountry?.id;

      // Si le pays n'existe pas, le créer
      if (!existingCountry) {
        const code = generateCountryCode(countryName);
        const newCountry = await locationService.createCountry({
          name: countryName,
          code,
        });
        finalCountryId = newCountry.id;
        toast({
          title: "Pays créé",
          description: `Le pays "${countryName}" a été ajouté à la base de données`,
        });
      }

      // Vérifier si la ville existe
      const cityMatches = await locationService.listCities({
        country: finalCountryId,
        search: cityName,
      });
      const existingCity = cityMatches?.find(
        (city) => city.name.toLowerCase() === cityName.toLowerCase()
      );

      let finalCityId = existingCity?.id;

      // Si la ville n'existe pas, la créer
      if (!existingCity) {
        const newCity = await locationService.createCity({
          name: cityName,
          country: finalCountryId as string,
          latitude: lat,
          longitude: lng,
        });
        finalCityId = newCity.id;
        toast({
          title: "Ville créée",
          description: `La ville "${cityName}" a été ajoutée à la base de données`,
        });
      }

      // Mettre à jour les champs du formulaire
      updateField('country', countryName);
      updateField('city', cityName);
      setCountryId(finalCountryId);
      setCityId(finalCityId);

    } catch (error) {
      console.error('Error verifying/creating location:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier ou créer la localisation",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const selectedLocation = formData.latitude && formData.longitude ? {
    lat: parseFloat(formData.latitude),
    lng: parseFloat(formData.longitude),
    address: formData.address
  } : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Localisation
          <span className="text-destructive">*</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Sélectionnez l'emplacement sur la carte</Label>
          <div className="mt-2">
            <LocationPicker
              latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
              longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
              onLocationSelect={handleLocationSelect}
              className="w-full h-[400px] rounded-lg"
            />
          </div>
          {(errors.latitude || errors.longitude || errors.address) && (
            <p className="text-sm text-destructive mt-1">
              {errors.latitude || errors.longitude || errors.address}
            </p>
          )}
        </div>

        {/* Information sur la vérification automatique */}
        {isVerifying && (
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
            <AlertCircle className="h-4 w-4 text-orange-500 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium">Vérification en cours...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Création automatique des pays/villes si nécessaire
              </p>
            </div>
          </div>
        )}

        {/* Sélection pays et ville */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Pays <span className="text-destructive">*</span></Label>
            <CountrySelect
              value={formData.country || ''}
              onValueChange={(value, id) => {
                updateField('country', value);
                setCountryId(id);
                // Reset city when country changes
                if (formData.city) {
                  updateField('city', '');
                  setCityId(undefined);
                }
              }}
              className="w-full"
            />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ville <span className="text-destructive">*</span></Label>
            <CitySelect
              value={formData.city || ''}
              onValueChange={(value, id) => {
                updateField('city', value);
                setCityId(id);
              }}
              countryId={countryId}
              countryName={formData.country}
              coordinates={formData.latitude && formData.longitude ? {
                lat: parseFloat(formData.latitude),
                lng: parseFloat(formData.longitude)
              } : undefined}
              className="w-full"
            />
            {errors.city && (
              <p className="text-sm text-destructive">{errors.city}</p>
            )}
          </div>
        </div>

        {/* Champ manuel pour l'adresse */}
        <div className="space-y-2">
          <Label htmlFor="manual-address">Adresse complète</Label>
          <Input
            id="manual-address"
            value={formData.address || ''}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Saisissez l'adresse complète"
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            L'adresse peut être mise à jour automatiquement via la carte ou la recherche
          </p>
        </div>

        {selectedLocation && (
          <div className="bg-muted p-3 rounded-md">
            <h4 className="font-medium mb-2">Coordonnées sélectionnées :</h4>
            <p className="text-sm text-muted-foreground">
              Latitude: {formData.latitude}
            </p>
            <p className="text-sm text-muted-foreground">
              Longitude: {formData.longitude}
            </p>
            <p className="text-sm text-muted-foreground">
              Adresse: {formData.address}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
