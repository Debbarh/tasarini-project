import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { useAccommodationSettings } from '@/hooks/useAccommodationSettings';
import { useTranslation } from 'react-i18next';
import { TaxonomyIcon } from '@/lib/taxonomyIcon';
import { getLocalizedLabel } from '@/utils/multilingualHelpers';

interface AccommodationSectionProps {
  formData: UnifiedPOIFormData;
  updateField: <K extends keyof UnifiedPOIFormData>(field: K, value: UnifiedPOIFormData[K]) => void;
  errors: Record<string, string>;
}

export const AccommodationSection: React.FC<AccommodationSectionProps> = ({
  formData,
  updateField,
  errors
}) => {
  const {
    accommodationTypes: types,
    accommodationAmenities: amenities,
    accommodationLocations: locations,
    accommodationAccessibility: accessibility,
    accommodationSecurity: security,
    accommodationAmbiance: ambiance,
    loading
  } = useAccommodationSettings();
  const { i18n } = useTranslation();

  const handleArrayFieldToggle = (field: keyof UnifiedPOIFormData, value: string) => {
    const currentArray = formData[field] as string[];
    const updated = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateField(field, updated);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Services d'hébergement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Chargement des options d'hébergement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services d'hébergement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_accommodation}
            onCheckedChange={(checked) => updateField('is_accommodation', checked)}
          />
          <Label>Proposez-vous des services d'hébergement ?</Label>
        </div>

        {formData.is_accommodation && (
          <>
            <div className="space-y-3">
              <Label>Types d'hébergement</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {types.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => handleArrayFieldToggle('accommodation_types', type.code)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.accommodation_types.includes(type.code)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-medium flex items-center gap-2">
                      <TaxonomyIcon iconName={type.icon_name} code={type.code} className="h-4 w-4 mr-2" fallback="Tag" /> {getLocalizedLabel(type, i18n.language) || type.label_fr}
                    </div>
                    {type.description_fr && (
                      <div className="text-xs text-muted-foreground mt-1">{type.description_fr}</div>
                    )}
                  </div>
                ))}
              </div>
              {errors.accommodation_types && (
                <p className="text-sm text-destructive">{errors.accommodation_types}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Équipements et services</Label>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <Badge
                    key={amenity.id}
                    variant={formData.accommodation_amenities.includes(amenity.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleArrayFieldToggle('accommodation_amenities', amenity.code)}
                  >
                    <TaxonomyIcon iconName={amenity.icon_name} code={amenity.code} className="h-4 w-4 mr-2" fallback="Tag" /> {getLocalizedLabel(amenity, i18n.language) || amenity.label_fr}
                    {formData.accommodation_amenities.includes(amenity.code) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Emplacement</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    onClick={() => handleArrayFieldToggle('accommodation_locations', location.code)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.accommodation_locations.includes(location.code)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-medium flex items-center gap-2">
                      <TaxonomyIcon iconName={location.icon_name} code={location.code} className="h-4 w-4 mr-2" fallback="Tag" /> {getLocalizedLabel(location, i18n.language) || location.label_fr}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Accessibilité</Label>
              <div className="flex flex-wrap gap-2">
                {accessibility.map((access) => (
                  <Badge
                    key={access.id}
                    variant={formData.accommodation_accessibility.includes(access.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleArrayFieldToggle('accommodation_accessibility', access.code)}
                  >
                    <TaxonomyIcon iconName={access.icon_name} code={access.code} className="h-4 w-4 mr-2" fallback="Tag" /> {getLocalizedLabel(access, i18n.language) || access.label_fr}
                    {formData.accommodation_accessibility.includes(access.code) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Mesures de sécurité</Label>
              <div className="flex flex-wrap gap-2">
                {security.map((sec) => (
                  <Badge
                    key={sec.id}
                    variant={formData.accommodation_security.includes(sec.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleArrayFieldToggle('accommodation_security', sec.code)}
                  >
                    <TaxonomyIcon iconName={sec.icon_name} code={sec.code} className="h-4 w-4 mr-2" fallback="Tag" /> {getLocalizedLabel(sec, i18n.language) || sec.label_fr}
                    {formData.accommodation_security.includes(sec.code) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Ambiance</Label>
              <div className="flex flex-wrap gap-2">
                {ambiance.map((amb) => (
                  <Badge
                    key={amb.id}
                    variant={formData.accommodation_ambiance.includes(amb.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleArrayFieldToggle('accommodation_ambiance', amb.code)}
                  >
                    <TaxonomyIcon iconName={amb.icon_name} code={amb.code} className="h-4 w-4 mr-2" fallback="Tag" /> {getLocalizedLabel(amb, i18n.language) || amb.label_fr}
                    {formData.accommodation_ambiance.includes(amb.code) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};