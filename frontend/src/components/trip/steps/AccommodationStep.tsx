import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Home, Shield, MapPin, Heart, Accessibility } from "lucide-react";
import { TripFormData, AccommodationPreferences } from "@/types/trip";
import { useAccommodationSettings } from "@/hooks/useAccommodationSettings";

interface AccommodationStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

export const AccommodationStep = ({ data, onUpdate, onValidate }: AccommodationStepProps) => {
  const { 
    accommodationTypes, 
    accommodationAmenities, 
    accommodationLocations,
    accommodationAccessibility,
    accommodationSecurity,
    accommodationAmbiance,
    loading 
  } = useAccommodationSettings();
  
  const [accommodation, setAccommodation] = useState<AccommodationPreferences>(
    data.accommodationPreferences || {
      type: [],
      amenities: [],
      location: [],
      accessibility: [],
      security: [],
      ambiance: []
    }
  );

  useEffect(() => {
    const isValid = accommodation.type.length > 0;
    onValidate(isValid);
    onUpdate({ accommodationPreferences: accommodation });
  }, [accommodation, onUpdate, onValidate]);

  const updateAccommodation = (updates: Partial<AccommodationPreferences>) => {
    setAccommodation(prev => ({ ...prev, ...updates }));
  };

  const toggleType = (type: string) => {
    const current = accommodation.type;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateAccommodation({ type: updated });
  };

  const toggleAmenity = (amenity: string) => {
    const current = accommodation.amenities;
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    updateAccommodation({ amenities: updated });
  };

  const toggleLocation = (location: string) => {
    const current = accommodation.location;
    const updated = current.includes(location)
      ? current.filter(l => l !== location)
      : [...current, location];
    updateAccommodation({ location: updated });
  };

  const toggleAccessibility = (accessibility: string) => {
    const current = accommodation.accessibility;
    const updated = current.includes(accessibility)
      ? current.filter(a => a !== accessibility)
      : [...current, accessibility];
    updateAccommodation({ accessibility: updated });
  };

  const toggleSecurity = (security: string) => {
    const current = accommodation.security;
    const updated = current.includes(security)
      ? current.filter(s => s !== security)
      : [...current, security];
    updateAccommodation({ security: updated });
  };

  const toggleAmbiance = (ambiance: string) => {
    const current = accommodation.ambiance;
    const updated = current.includes(ambiance)
      ? current.filter(a => a !== ambiance)
      : [...current, ambiance];
    updateAccommodation({ ambiance: updated });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Préférences d'hébergement</h3>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Préférences d'hébergement</h3>
        <p className="text-muted-foreground">
          Choisissez le type d'hébergement et les services qui vous importent
        </p>
      </div>

      {/* Accommodation Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-4 w-4 text-primary" />
            Type d'hébergement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accommodationTypes.filter(t => t.is_active).map((type) => (
              <Button
                key={type.id}
                variant={accommodation.type.includes(type.label_fr) ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-4"
                onClick={() => toggleType(type.label_fr)}
              >
                <span className="text-2xl">{type.icon_emoji}</span>
                <span className="text-sm text-center">{type.label_fr}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Amenities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-primary" />
            Services et équipements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {accommodationAmenities.filter(a => a.is_active).map((amenity) => (
              <div key={amenity.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`amenity-${amenity.id}`}
                  checked={accommodation.amenities.includes(amenity.label_fr)}
                  onCheckedChange={() => toggleAmenity(amenity.label_fr)}
                />
                <Label htmlFor={`amenity-${amenity.id}`} className="text-sm flex items-center gap-1">
                  {amenity.icon_emoji && <span>{amenity.icon_emoji}</span>}
                  <span>{amenity.label_fr}</span>
                  {amenity.category && (
                    <Badge variant="outline" className="text-xs ml-1">{amenity.category}</Badge>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Location Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            Localisation préférée
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accommodationLocations.filter(l => l.is_active).map((location) => (
              <Button
                key={location.id}
                variant={accommodation.location.includes(location.label_fr) ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-3"
                onClick={() => toggleLocation(location.label_fr)}
              >
                <span className="text-xl">{location.icon_emoji}</span>
                <span className="text-xs text-center">{location.label_fr}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Accessibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Accessibility className="h-4 w-4 text-primary" />
              Accessibilité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {accommodationAccessibility.filter(a => a.is_active).map((accessibility) => (
                <div key={accessibility.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`accessibility-${accessibility.id}`}
                    checked={accommodation.accessibility.includes(accessibility.label_fr)}
                    onCheckedChange={() => toggleAccessibility(accessibility.label_fr)}
                  />
                  <Label htmlFor={`accessibility-${accessibility.id}`} className="text-sm">
                    {accessibility.icon_emoji && <span className="mr-1">{accessibility.icon_emoji}</span>}
                    {accessibility.label_fr}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {accommodationSecurity.filter(s => s.is_active).map((security) => (
                <div key={security.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`security-${security.id}`}
                    checked={accommodation.security.includes(security.label_fr)}
                    onCheckedChange={() => toggleSecurity(security.label_fr)}
                  />
                  <Label htmlFor={`security-${security.id}`} className="text-sm">
                    {security.icon_emoji && <span className="mr-1">{security.icon_emoji}</span>}
                    {security.label_fr}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ambiance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-primary" />
              Ambiance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {accommodationAmbiance.filter(a => a.is_active).map((ambiance) => (
                <div key={ambiance.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ambiance-${ambiance.id}`}
                    checked={accommodation.ambiance.includes(ambiance.label_fr)}
                    onCheckedChange={() => toggleAmbiance(ambiance.label_fr)}
                  />
                  <Label htmlFor={`ambiance-${ambiance.id}`} className="text-sm">
                    {ambiance.icon_emoji && <span className="mr-1">{ambiance.icon_emoji}</span>}
                    {ambiance.label_fr}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium">Résumé de vos préférences d'hébergement</h4>
            <div className="space-y-2">
              {accommodation.type.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">Types :</span>
                  {accommodation.type.map(type => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
              
              {accommodation.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">Services :</span>
                  {accommodation.amenities.slice(0, 3).map(amenity => (
                    <Badge key={amenity} variant="outline" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                  {accommodation.amenities.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{accommodation.amenities.length - 3} autres
                    </Badge>
                  )}
                </div>
              )}

              {accommodation.location.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">Emplacements :</span>
                  {accommodation.location.slice(0, 2).map(location => (
                    <Badge key={location} variant="outline" className="text-xs">
                      {location}
                    </Badge>
                  ))}
                  {accommodation.location.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{accommodation.location.length - 2} autres
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};