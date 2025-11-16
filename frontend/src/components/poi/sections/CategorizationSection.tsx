import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { useBudgetSettings } from '@/hooks/useBudgetSettings';
import { TagsAutocomplete } from './TagsAutocomplete';

interface CategorizationSectionProps {
  formData: UnifiedPOIFormData;
  updateField: <K extends keyof UnifiedPOIFormData>(field: K, value: UnifiedPOIFormData[K]) => void;
  errors: Record<string, string>;
}

// Options de prix prédéfinies
const PRICE_RANGE_OPTIONS = [
  { value: '€', label: '€ - Économique' },
  { value: '€€', label: '€€ - Modéré' },
  { value: '€€€', label: '€€€ - Élevé' },
  { value: '€€€€', label: '€€€€ - Luxe' }
];

// Catégories principales prédéfinies
const MAIN_CATEGORIES = [
  'restaurant',
  'hébergement',
  'activité',
  'monument',
  'musée',
  'parc',
  'shopping',
  'transport',
  'service',
  'divertissement'
];

export const CategorizationSection: React.FC<CategorizationSectionProps> = ({
  formData,
  updateField,
  errors
}) => {
  const { budgetLevels, loading } = useBudgetSettings();
  const [newCategory, setNewCategory] = useState('');

  const handleAddTag = (tag: string) => {
    if (!formData.tags.some(existingTag => existingTag.toLowerCase() === tag.toLowerCase())) {
      updateField('tags', [...formData.tags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateField('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !formData.categories.includes(newCategory.trim())) {
      updateField('categories', [...formData.categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    updateField('categories', formData.categories.filter(cat => cat !== categoryToRemove));
  };

  const handlePredefinedCategoryAdd = (category: string) => {
    if (!formData.categories.includes(category)) {
      updateField('categories', [...formData.categories, category]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catégorisation et tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Tags (mots-clés)</Label>
          <TagsAutocomplete
            tags={formData.tags}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            placeholder="Commencez à taper pour voir les suggestions..."
          />
          {errors.tags && (
            <p className="text-sm text-destructive">{errors.tags}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label>Catégories principales</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.categories.map((category) => (
              <Badge key={category} variant="default" className="gap-1">
                {category}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleRemoveCategory(category)}
                />
              </Badge>
            ))}
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Catégories prédéfinies :</div>
            <div className="flex flex-wrap gap-2">
              {MAIN_CATEGORIES.filter(cat => !formData.categories.includes(cat)).map((category) => (
                <Badge 
                  key={category} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => handlePredefinedCategoryAdd(category)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ajouter une catégorie personnalisée..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddCategory}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {errors.categories && (
            <p className="text-sm text-destructive">{errors.categories}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label>Gamme de prix</Label>
          <Select 
            value={formData.price_range} 
            onValueChange={(value) => updateField('price_range', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez une gamme de prix" />
            </SelectTrigger>
            <SelectContent>
              {PRICE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.price_range && (
            <p className="text-sm text-destructive">{errors.price_range}</p>
          )}
        </div>

        {!loading && (
          <div className="space-y-3">
            <Label>Niveau budgétaire</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {budgetLevels.map((level) => (
                <div
                  key={level.id}
                  onClick={() => updateField('budget_level_id', level.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.budget_level_id === level.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm font-medium flex items-center gap-2">
                    {level.icon_emoji} {level.label_fr}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {level.default_daily_amount}€/jour
                    {level.min_daily_amount && level.max_daily_amount && (
                      <span> ({level.min_daily_amount}€ - {level.max_daily_amount}€)</span>
                    )}
                  </div>
                  {level.description_fr && (
                    <div className="text-xs text-muted-foreground mt-1">{level.description_fr}</div>
                  )}
                </div>
              ))}
            </div>
            {errors.budget_level_id && (
              <p className="text-sm text-destructive">{errors.budget_level_id}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};