import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Utensils, Wine } from "lucide-react";
import { TripFormData, CulinaryPreferences } from "@/types/trip";
import { useCulinarySettings } from "@/hooks/useCulinarySettings";

interface CulinaryStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

export const CulinaryStep = ({ data, onUpdate, onValidate }: CulinaryStepProps) => {
  const { dietaryRestrictions, cuisineTypes, adventureLevels, restaurantCategories, loading } = useCulinarySettings();
  
  const [culinary, setCulinary] = useState<CulinaryPreferences>(
    data.culinaryPreferences || {
      dietaryRestrictions: [],
      cuisineTypes: cuisineTypes.length > 0 ? [cuisineTypes[0]?.label_fr || 'Cuisine locale'] : ['Cuisine locale'],
      restaurantCategories: [],
      foodAdventure: 'moderate',
      alcoholConsumption: true
    }
  );

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
          <h3 className="text-lg font-semibold mb-2">Préférences culinaires</h3>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Préférences culinaires</h3>
        <p className="text-muted-foreground">
          Partagez vos goûts pour des recommandations personnalisées
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4 text-primary" />
            Restrictions alimentaires
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
                  {restriction.icon_emoji && <span className="mr-1">{restriction.icon_emoji}</span>}
                  {restriction.label_fr}
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
            Types de cuisine appréciés
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
                  {cuisine.label_fr}
                  {cuisine.region && <span className="text-xs text-muted-foreground ml-1">({cuisine.region})</span>}
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
            Catégories de restaurants préférées
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
                  {category.icon_emoji && <span>{category.icon_emoji}</span>}
                  <span>{category.label_fr}</span>
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
            Niveau d'aventure culinaire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {adventureLevels.filter(l => l.is_active).sort((a, b) => a.level_value - b.level_value).map((level) => (
              <Button
                key={level.id}
                variant={culinary.foodAdventure === level.code ? "default" : "outline"}
                className="h-auto flex-col gap-1 p-3"
                onClick={() => updateCulinary({ foodAdventure: level.code as CulinaryPreferences['foodAdventure'] })}
              >
                <div className="font-medium">{level.label_fr}</div>
                <div className="text-xs text-muted-foreground">{level.description_fr}</div>
              </Button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="alcohol"
              checked={culinary.alcoholConsumption}
              onCheckedChange={(checked) => updateCulinary({ alcoholConsumption: !!checked })}
            />
            <Label htmlFor="alcohol" className="flex items-center gap-2">
              <Wine className="h-4 w-4" />
              Je consomme de l'alcool
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium">Résumé de vos préférences culinaires</h4>
            <div className="flex flex-wrap gap-2">
              {culinary.dietaryRestrictions.length > 0 && (
                <Badge variant="outline">
                  {culinary.dietaryRestrictions.length} restriction{culinary.dietaryRestrictions.length > 1 ? 's' : ''}
                </Badge>
              )}
              <Badge variant="outline">
                {culinary.cuisineTypes.length} type{culinary.cuisineTypes.length > 1 ? 's' : ''} de cuisine
              </Badge>
              {culinary.restaurantCategories.length > 0 && (
                <Badge variant="outline">
                  {culinary.restaurantCategories.length} catégorie{culinary.restaurantCategories.length > 1 ? 's' : ''} de restaurant
                </Badge>
              )}
              <Badge variant="outline">
                Aventure culinaire : {culinary.foodAdventure === 'conservative' ? 'Conservateur' : 
                                   culinary.foodAdventure === 'moderate' ? 'Modéré' : 'Aventureux'}
              </Badge>
              {culinary.alcoholConsumption && (
                <Badge variant="outline">
                  <Wine className="h-3 w-3 mr-1" />
                  Consomme de l'alcool
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};