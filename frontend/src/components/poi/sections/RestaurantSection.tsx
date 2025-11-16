import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { useCulinarySettings } from '@/hooks/useCulinarySettings';

interface RestaurantSectionProps {
  formData: UnifiedPOIFormData;
  updateField: <K extends keyof UnifiedPOIFormData>(field: K, value: UnifiedPOIFormData[K]) => void;
  errors: Record<string, string>;
}

export const RestaurantSection: React.FC<RestaurantSectionProps> = ({
  formData,
  updateField,
  errors
}) => {
  const {
    cuisineTypes,
    dietaryRestrictions,
    restaurantCategories,
    adventureLevels,
    loading
  } = useCulinarySettings();

  const handleCuisineTypeToggle = (cuisineType: string) => {
    const updated = formData.cuisine_types.includes(cuisineType)
      ? formData.cuisine_types.filter(type => type !== cuisineType)
      : [...formData.cuisine_types, cuisineType];
    updateField('cuisine_types', updated);
  };

  const handleDietaryRestrictionToggle = (restriction: string) => {
    const updated = formData.dietary_restrictions_supported.includes(restriction)
      ? formData.dietary_restrictions_supported.filter(r => r !== restriction)
      : [...formData.dietary_restrictions_supported, restriction];
    updateField('dietary_restrictions_supported', updated);
  };

  const handleRestaurantCategoryToggle = (category: string) => {
    const updated = formData.restaurant_categories.includes(category)
      ? formData.restaurant_categories.filter(cat => cat !== category)
      : [...formData.restaurant_categories, category];
    updateField('restaurant_categories', updated);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Services de restauration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Chargement des options culinaires...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services de restauration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_restaurant}
            onCheckedChange={(checked) => updateField('is_restaurant', checked)}
          />
          <Label>Proposez-vous des services de restauration ?</Label>
        </div>

        {formData.is_restaurant && (
          <>
            <div className="space-y-3">
              <Label>Types de cuisine</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {cuisineTypes.map((cuisine) => (
                  <div
                    key={cuisine.id}
                    onClick={() => handleCuisineTypeToggle(cuisine.code)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.cuisine_types.includes(cuisine.code)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-medium">{cuisine.label_fr}</div>
                    {cuisine.region && (
                      <div className="text-xs text-muted-foreground">{cuisine.region}</div>
                    )}
                  </div>
                ))}
              </div>
              {errors.cuisine_types && (
                <p className="text-sm text-destructive">{errors.cuisine_types}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Restrictions alimentaires supportées</Label>
              <div className="flex flex-wrap gap-2">
                {dietaryRestrictions.map((restriction) => (
                  <Badge
                    key={restriction.id}
                    variant={formData.dietary_restrictions_supported.includes(restriction.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleDietaryRestrictionToggle(restriction.code)}
                  >
                    {restriction.icon_emoji} {restriction.label_fr}
                    {formData.dietary_restrictions_supported.includes(restriction.code) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Catégories de restaurant</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {restaurantCategories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => handleRestaurantCategoryToggle(category.code)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.restaurant_categories.includes(category.code)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-medium flex items-center gap-2">
                      {category.icon_emoji} {category.label_fr}
                    </div>
                    {category.price_range_min && category.price_range_max && (
                      <div className="text-xs text-muted-foreground">
                        {category.price_range_min}€ - {category.price_range_max}€
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Niveau d'aventure culinaire</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {adventureLevels.map((level) => (
                  <div
                    key={level.id}
                    onClick={() => updateField('culinary_adventure_level_id', level.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.culinary_adventure_level_id === level.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-medium">{level.label_fr}</div>
                    <div className="text-xs text-muted-foreground">{level.description_fr}</div>
                  </div>
                ))}
              </div>
              {errors.culinary_adventure_level_id && (
                <p className="text-sm text-destructive">{errors.culinary_adventure_level_id}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};