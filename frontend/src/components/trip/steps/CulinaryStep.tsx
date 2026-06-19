import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Utensils, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { TaxonomyIcon } from "@/lib/taxonomyIcon";
import { TripFormData, CulinaryPreferences } from "@/types/trip";
import { useCulinarySettings } from "@/hooks/useCulinarySettings";
import { getLocalizedLabel, getLocalizedDescription } from "@/utils/multilingualHelpers";

interface CulinaryStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

export const CulinaryStep = ({ data, onUpdate, onValidate }: CulinaryStepProps) => {
  const { t, i18n } = useTranslation();
  const { dietaryRestrictions, cuisineTypes, adventureLevels, restaurantCategories, loading } = useCulinarySettings();

  const [culinary, setCulinary] = useState<CulinaryPreferences>(
    data.culinaryPreferences || {
      dietaryRestrictions: [],
      cuisineTypes: [],
      restaurantCategories: [],
      foodAdventure: 'moderate',
      alcoholConsumption: true
    }
  );

  // Sections avancées (restaurants + régimes) masquées par défaut pour alléger
  // l'interface ; ouvertes d'emblée si l'utilisateur les avait déjà renseignées.
  const [showAdvanced, setShowAdvanced] = useState<boolean>(
    Boolean(data.culinaryPreferences?.restaurantCategories?.length || data.culinaryPreferences?.dietaryRestrictions?.length)
  );

  // Sélection par défaut de "Spécialités locales" (une seule fois, si l'utilisateur
  // n'a pas déjà de préférences enregistrées).
  const defaultedRef = useRef(false);
  useEffect(() => {
    if (defaultedRef.current) return;
    if (data.culinaryPreferences) { defaultedRef.current = true; return; }
    if (cuisineTypes.length === 0) return;
    const local = cuisineTypes.find(c => c.code === 'local_specialties' && c.is_active)
      || cuisineTypes.find(c => c.is_active);
    if (local) {
      defaultedRef.current = true;
      setCulinary(prev => (prev.cuisineTypes.length ? prev : { ...prev, cuisineTypes: [local.label_fr] }));
    }
  }, [cuisineTypes, data.culinaryPreferences]);

  useEffect(() => {
    // La validation pour l'étape culinaire est toujours vraie car tout est optionnel
    onValidate(true);
  }, []); // Validation une seule fois au montage du composant

  useEffect(() => {
    onUpdate({ culinaryPreferences: culinary });
  }, [culinary]); // Mise à jour seulement quand culinary change

  const updateCulinary = (updates: Partial<CulinaryPreferences>) => {
    setCulinary(prev => ({ ...prev, ...updates }));
  };

  const toggleDietaryRestriction = (restriction: string) => {
    const current = culinary.dietaryRestrictions;
    const updated = current.includes(restriction)
      ? current.filter(r => r !== restriction)
      : [...current, restriction];
    updateCulinary({ dietaryRestrictions: updated });
  };

  const toggleCuisineType = (cuisine: string) => {
    const current = culinary.cuisineTypes;
    const updated = current.includes(cuisine)
      ? current.filter(c => c !== cuisine)
      : [...current, cuisine];
    updateCulinary({ cuisineTypes: updated });
  };

  const toggleRestaurantCategory = (category: string) => {
    const current = culinary.restaurantCategories;
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updateCulinary({ restaurantCategories: updated });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">{t('planTrip.culinaryStep.title')}</h3>
          <p className="text-muted-foreground">{t('planTrip.culinaryStep.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* 1. Types de cuisine préférés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4 text-primary" />
            {t('planTrip.culinaryStep.cuisineTypes')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {cuisineTypes.filter(c => c.is_active).map((cuisine) => (
              <div key={cuisine.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`cuisine-${cuisine.id}`}
                  checked={culinary.cuisineTypes.includes(cuisine.label_fr)}
                  onCheckedChange={() => toggleCuisineType(cuisine.label_fr)}
                />
                <Label htmlFor={`cuisine-${cuisine.id}`} className="text-sm">
                  {getLocalizedLabel(cuisine, i18n.language)}
                  {cuisine.region && <span className="text-xs text-muted-foreground ml-1">({cuisine.region})</span>}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Niveau d'aventure culinaire */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4 text-primary" />
            {t('planTrip.culinaryStep.adventureLevel')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {adventureLevels.filter(l => l.is_active).sort((a, b) => a.level_value - b.level_value).map((level) => (
              <Button
                key={level.id}
                variant={culinary.foodAdventure === level.code ? "default" : "outline"}
                className="h-auto flex-col gap-1 p-3 whitespace-normal text-center"
                onClick={() => updateCulinary({ foodAdventure: level.code as CulinaryPreferences['foodAdventure'] })}
              >
                <div className="font-medium">{getLocalizedLabel(level, i18n.language)}</div>
                <div className={`text-xs ${culinary.foodAdventure === level.code ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{getLocalizedDescription(level, i18n.language)}</div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Préférences avancées (restaurants + régimes) — repliées par défaut */}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-2 hover:border-primary"
        onClick={() => setShowAdvanced(v => !v)}
      >
        <Sparkles className="h-4 w-4 mr-2 text-primary" />
        {showAdvanced
          ? t('planTrip.culinaryStep.refineLess', 'Masquer les préférences avancées')
          : t('planTrip.culinaryStep.refineMore', 'Affiner mes préférences (restaurants, régimes alimentaires)')}
        {showAdvanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
      </Button>

      {showAdvanced && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Utensils className="h-4 w-4 text-primary" />
                {t('planTrip.culinaryStep.restaurantCategories')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {restaurantCategories.filter(c => c.is_active).map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={culinary.restaurantCategories.includes(category.label_fr)}
                      onCheckedChange={() => toggleRestaurantCategory(category.label_fr)}
                    />
                    <Label htmlFor={`category-${category.id}`} className="text-sm flex items-center gap-1">
                      <TaxonomyIcon iconName={category.icon_name} code={category.code} className="h-4 w-4" fallback="Utensils" />
                      <span>{getLocalizedLabel(category, i18n.language)}</span>
                      {category.price_range_min && category.price_range_max && (
                        <span className="text-xs text-muted-foreground">
                          ({category.price_range_min}-{category.price_range_max}€)
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Utensils className="h-4 w-4 text-primary" />
                {t('planTrip.culinaryStep.dietaryRestrictions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {dietaryRestrictions.filter(r => r.is_active).map((restriction) => (
                  <div key={restriction.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`restriction-${restriction.id}`}
                      checked={culinary.dietaryRestrictions.includes(restriction.label_fr)}
                      onCheckedChange={() => toggleDietaryRestriction(restriction.label_fr)}
                    />
                    <Label htmlFor={`restriction-${restriction.id}`} className="text-sm">
                      <TaxonomyIcon iconName={restriction.icon_name} code={restriction.code} className="h-4 w-4 mr-1" />
                      {getLocalizedLabel(restriction, i18n.language)}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium">{t('planTrip.culinaryStep.summary')}</h4>
            <div className="flex flex-wrap gap-2">
              {culinary.dietaryRestrictions.length > 0 && (
                <Badge variant="outline">
                  {culinary.dietaryRestrictions.length} {culinary.dietaryRestrictions.length > 1 ? t('planTrip.culinaryStep.restrictionsPlural') : t('planTrip.culinaryStep.restriction')}
                </Badge>
              )}
              <Badge variant="outline">
                {culinary.cuisineTypes.length} {culinary.cuisineTypes.length > 1 ? t('planTrip.culinaryStep.cuisineTypesPlural') : t('planTrip.culinaryStep.cuisineType')}
              </Badge>
              {culinary.restaurantCategories.length > 0 && (
                <Badge variant="outline">
                  {culinary.restaurantCategories.length} {culinary.restaurantCategories.length > 1 ? t('planTrip.culinaryStep.restaurantCategoriesPlural') : t('planTrip.culinaryStep.restaurantCategory')}
                </Badge>
              )}
              <Badge variant="outline">
                {t('planTrip.culinaryStep.culinaryAdventure')} : {culinary.foodAdventure === 'conservative' ? t('planTrip.culinaryStep.conservative') :
                                   culinary.foodAdventure === 'moderate' ? t('planTrip.culinaryStep.moderate') : t('planTrip.culinaryStep.adventurous')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
