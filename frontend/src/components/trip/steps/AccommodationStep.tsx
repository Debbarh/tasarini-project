import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Home, Shield, MapPin, Heart, Accessibility, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { TaxonomyIcon } from "@/lib/taxonomyIcon";
import { TripFormData, AccommodationPreferences } from "@/types/trip";
import { useAccommodationSettings } from "@/hooks/useAccommodationSettings";
import { AccommodationTaxonomyEntry } from "@/services/accommodationSettingsService";
import { getLocalizedLabel } from "@/utils/multilingualHelpers";

// Ordre de popularité des types d'hébergement (les plus demandés en premier).
const TYPE_POPULARITY = ['hotel', 'apartment', 'resort', 'guesthouse', 'bnb', 'hostel', 'serviced_apartment', 'camping'];
const typeRank = (code: string) => {
  const i = TYPE_POPULARITY.indexOf(code);
  return i === -1 ? 999 : i;
};

const matchEntryByValue = (value: string, entries: AccommodationTaxonomyEntry[]) => {
  return entries.find((entry) =>
    entry.code === value ||
    entry.label_fr === value ||
    entry.label_en === value ||
    entry.label_es === value ||
    entry.label_de === value ||
    entry.label_it === value ||
    entry.label_pt === value ||
    entry.label_ru === value ||
    entry.label_ja === value ||
    entry.label_zh === value ||
    entry.label_hi === value ||
    entry.label_ar === value
  );
};

const normalizeSelection = (values: string[], entries: AccommodationTaxonomyEntry[]) => {
  if (!values || values.length === 0) return [];

  const normalized: string[] = [];
  values.forEach((value) => {
    const match = matchEntryByValue(value, entries);
    const nextValue = match ? match.code : value;
    if (nextValue && !normalized.includes(nextValue)) {
      normalized.push(nextValue);
    }
  });

  return normalized;
};

const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const getLabelFromCode = (code: string, entries: AccommodationTaxonomyEntry[], language: string) => {
  const item = entries.find((entry) => entry.code === code);
  return getLocalizedLabel(item, language) || code;
};

interface AccommodationStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

export const AccommodationStep = ({ data, onUpdate, onValidate }: AccommodationStepProps) => {
  const { t, i18n } = useTranslation();
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

  // Sections avancées masquées par défaut (services, accessibilité, sécurité,
  // ambiance) pour réduire la taille du stepper ; ouvertes si déjà renseignées.
  const [showAdvanced, setShowAdvanced] = useState<boolean>(
    Boolean(
      data.accommodationPreferences?.amenities?.length ||
      data.accommodationPreferences?.accessibility?.length ||
      data.accommodationPreferences?.security?.length ||
      data.accommodationPreferences?.ambiance?.length
    )
  );

  useEffect(() => {
    if (loading) return;

    setAccommodation((prev) => {
      const normalized = {
        type: normalizeSelection(prev.type, accommodationTypes),
        amenities: normalizeSelection(prev.amenities, accommodationAmenities),
        location: normalizeSelection(prev.location, accommodationLocations),
        accessibility: normalizeSelection(prev.accessibility, accommodationAccessibility),
        security: normalizeSelection(prev.security, accommodationSecurity),
        ambiance: normalizeSelection(prev.ambiance, accommodationAmbiance),
      };

      const unchanged =
        arraysEqual(prev.type, normalized.type) &&
        arraysEqual(prev.amenities, normalized.amenities) &&
        arraysEqual(prev.location, normalized.location) &&
        arraysEqual(prev.accessibility, normalized.accessibility) &&
        arraysEqual(prev.security, normalized.security) &&
        arraysEqual(prev.ambiance, normalized.ambiance);

      if (unchanged) {
        return prev;
      }

      return {
        ...prev,
        ...normalized,
      };
    });
  }, [
    loading,
    accommodationTypes,
    accommodationAmenities,
    accommodationLocations,
    accommodationAccessibility,
    accommodationSecurity,
    accommodationAmbiance,
  ]);

  // Sélection par défaut de "Hotel" (une seule fois, si pas de préférences enregistrées).
  const typeDefaultedRef = useRef(false);
  useEffect(() => {
    if (typeDefaultedRef.current) return;
    if (data.accommodationPreferences) { typeDefaultedRef.current = true; return; }
    if (accommodationTypes.length === 0) return;
    const hotel = accommodationTypes.find((t) => t.code === 'hotel' && t.is_active);
    if (hotel) {
      typeDefaultedRef.current = true;
      setAccommodation((prev) => (prev.type.length ? prev : { ...prev, type: ['hotel'] }));
    }
  }, [accommodationTypes, data.accommodationPreferences]);

  useEffect(() => {
    const isValid = accommodation.type.length > 0;
    onValidate(isValid);
    onUpdate({ accommodationPreferences: accommodation });
  }, [accommodation, onUpdate, onValidate]);

  const updateAccommodation = (updates: Partial<AccommodationPreferences>) => {
    setAccommodation(prev => ({ ...prev, ...updates }));
  };

  const toggleType = (code: string) => {
    const current = accommodation.type;
    const updated = current.includes(code) ? current.filter((t) => t !== code) : [...current, code];
    updateAccommodation({ type: updated });
  };

  const toggleAmenity = (code: string) => {
    const current = accommodation.amenities;
    const updated = current.includes(code) ? current.filter((a) => a !== code) : [...current, code];
    updateAccommodation({ amenities: updated });
  };

  const toggleLocation = (code: string) => {
    const current = accommodation.location;
    const updated = current.includes(code) ? current.filter((l) => l !== code) : [...current, code];
    updateAccommodation({ location: updated });
  };

  const toggleAccessibility = (code: string) => {
    const current = accommodation.accessibility;
    const updated = current.includes(code) ? current.filter((a) => a !== code) : [...current, code];
    updateAccommodation({ accessibility: updated });
  };

  const toggleSecurity = (code: string) => {
    const current = accommodation.security;
    const updated = current.includes(code) ? current.filter((s) => s !== code) : [...current, code];
    updateAccommodation({ security: updated });
  };

  const toggleAmbiance = (code: string) => {
    const current = accommodation.ambiance;
    const updated = current.includes(code) ? current.filter((a) => a !== code) : [...current, code];
    updateAccommodation({ ambiance: updated });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">{t('planTrip.accommodationStep.title')}</h3>
          <p className="text-muted-foreground">{t('planTrip.accommodationStep.loading')}</p>
        </div>
      </div>
    );
  }

  const sortedTypes = [...accommodationTypes]
    .filter((t) => t.is_active)
    .sort((a, b) => typeRank(a.code) - typeRank(b.code));

  return (
    <div className="space-y-6">

      {/* 1. Accommodation Types (triés par popularité, Hotel par défaut) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-4 w-4 text-primary" />
            {t('planTrip.accommodationStep.accommodationType')}
            <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sortedTypes.map((type) => (
              <Button
                key={type.id}
                variant={accommodation.type.includes(type.code) ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-4 whitespace-normal text-center"
                onClick={() => toggleType(type.code)}
              >
                <TaxonomyIcon iconName={type.icon_name} code={type.code} className={`h-6 w-6 ${accommodation.type.includes(type.code) ? 'text-primary-foreground' : 'text-primary'}`} fallback="Hotel" />
                <span className="text-sm text-center">
                  {getLabelFromCode(type.code, accommodationTypes, i18n.language)}
                </span>
              </Button>
            ))}
          </div>
          {accommodation.type.length === 0 && (
            <p className="text-sm text-destructive">
              {t('planTrip.accommodationStep.typeRequired', "Sélectionnez au moins un type d'hébergement pour continuer.")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Location Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            {t('planTrip.accommodationStep.location')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accommodationLocations.filter(l => l.is_active).map((location) => (
              <Button
                key={location.id}
                variant={accommodation.location.includes(location.code) ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-3 whitespace-normal text-center"
                onClick={() => toggleLocation(location.code)}
              >
                <TaxonomyIcon iconName={location.icon_name} code={location.code} className={`h-5 w-5 ${accommodation.location.includes(location.code) ? 'text-primary-foreground' : 'text-primary'}`} fallback="MapPin" />
                <span className="text-xs text-center">
                  {getLabelFromCode(location.code, accommodationLocations, i18n.language)}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Préférences avancées (services, accessibilité, sécurité, ambiance) — repliées */}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-2 hover:border-primary"
        onClick={() => setShowAdvanced(v => !v)}
      >
        <Sparkles className="h-4 w-4 mr-2 text-primary" />
        {showAdvanced
          ? t('planTrip.accommodationStep.refineLess', 'Masquer les préférences avancées')
          : t('planTrip.accommodationStep.refineMore', 'Affiner mes préférences (services, accessibilité, sécurité, ambiance)')}
        {showAdvanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
      </Button>

      {showAdvanced && (
        <>
          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4 text-primary" />
                {t('planTrip.accommodationStep.amenities')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {accommodationAmenities.filter(a => a.is_active).map((amenity) => (
                  <div key={amenity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`amenity-${amenity.id}`}
                      checked={accommodation.amenities.includes(amenity.code)}
                      onCheckedChange={() => toggleAmenity(amenity.code)}
                    />
                    <Label htmlFor={`amenity-${amenity.id}`} className="text-sm flex items-center gap-1">
                      <TaxonomyIcon iconName={amenity.icon_name} code={amenity.code} className="h-4 w-4" />
                      <span>{getLabelFromCode(amenity.code, accommodationAmenities, i18n.language)}</span>
                      {amenity.category && (
                        <Badge variant="outline" className="text-xs ml-1">{amenity.category}</Badge>
                      )}
                    </Label>
                  </div>
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
                  {t('planTrip.accommodationStep.accessibility')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {accommodationAccessibility.filter(a => a.is_active).map((accessibility) => (
                    <div key={accessibility.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`accessibility-${accessibility.id}`}
                        checked={accommodation.accessibility.includes(accessibility.code)}
                        onCheckedChange={() => toggleAccessibility(accessibility.code)}
                      />
                      <Label htmlFor={`accessibility-${accessibility.id}`} className="text-sm">
                        <TaxonomyIcon iconName={accessibility.icon_name} code={accessibility.code} className="h-4 w-4 mr-2" />
                        {getLabelFromCode(accessibility.code, accommodationAccessibility, i18n.language)}
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
                  {t('planTrip.accommodationStep.security')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {accommodationSecurity.filter(s => s.is_active).map((security) => (
                    <div key={security.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`security-${security.id}`}
                        checked={accommodation.security.includes(security.code)}
                        onCheckedChange={() => toggleSecurity(security.code)}
                      />
                      <Label htmlFor={`security-${security.id}`} className="text-sm">
                        <TaxonomyIcon iconName={security.icon_name} code={security.code} className="h-4 w-4 mr-2" />
                        {getLabelFromCode(security.code, accommodationSecurity, i18n.language)}
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
                  {t('planTrip.accommodationStep.ambiance')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {accommodationAmbiance.filter(a => a.is_active).map((ambiance) => (
                    <div key={ambiance.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ambiance-${ambiance.id}`}
                        checked={accommodation.ambiance.includes(ambiance.code)}
                        onCheckedChange={() => toggleAmbiance(ambiance.code)}
                      />
                      <Label htmlFor={`ambiance-${ambiance.id}`} className="text-sm">
                        <TaxonomyIcon iconName={ambiance.icon_name} code={ambiance.code} className="h-4 w-4 mr-2" />
                        {getLabelFromCode(ambiance.code, accommodationAmbiance, i18n.language)}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium">{t('planTrip.accommodationStep.summary')}</h4>
            <div className="space-y-2">
              {accommodation.type.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">{t('planTrip.accommodationStep.types')} :</span>
                  {accommodation.type.map(code => (
                    <Badge key={code} variant="outline" className="text-xs">
                      {getLabelFromCode(code, accommodationTypes, i18n.language)}
                    </Badge>
                  ))}
                </div>
              )}

              {accommodation.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">{t('planTrip.accommodationStep.services')} :</span>
                  {accommodation.amenities.slice(0, 3).map(code => (
                    <Badge key={code} variant="outline" className="text-xs">
                      {getLabelFromCode(code, accommodationAmenities, i18n.language)}
                    </Badge>
                  ))}
                  {accommodation.amenities.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{accommodation.amenities.length - 3} {t('planTrip.accommodationStep.others')}
                    </Badge>
                  )}
                </div>
              )}

              {accommodation.location.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">{t('planTrip.accommodationStep.locations')} :</span>
                  {accommodation.location.slice(0, 2).map(code => (
                    <Badge key={code} variant="outline" className="text-xs">
                      {getLabelFromCode(code, accommodationLocations, i18n.language)}
                    </Badge>
                  ))}
                  {accommodation.location.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{accommodation.location.length - 2} {t('planTrip.accommodationStep.others')}
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
