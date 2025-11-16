import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { useActivitySettings } from '@/hooks/useActivitySettings';

interface ActivitySectionProps {
  formData: UnifiedPOIFormData;
  updateField: <K extends keyof UnifiedPOIFormData>(field: K, value: UnifiedPOIFormData[K]) => void;
  errors: Record<string, string>;
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({
  formData,
  updateField,
  errors
}) => {
  const {
    categories,
    intensityLevels,
    interests,
    avoidances,
    loading
  } = useActivitySettings();

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
          <CardTitle>Activités</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Chargement des options d'activités...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activités</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_activity}
            onCheckedChange={(checked) => updateField('is_activity', checked)}
          />
          <Label>Proposez-vous des activités ?</Label>
        </div>

        {formData.is_activity && (
          <>
            <div className="space-y-3">
              <Label>Catégories d'activités</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => handleArrayFieldToggle('activity_categories', category.code)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.activity_categories.includes(category.code)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-medium flex items-center gap-2">
                      {category.icon_emoji} {category.label_fr}
                    </div>
                    {category.description_fr && (
                      <div className="text-xs text-muted-foreground mt-1">{category.description_fr}</div>
                    )}
                  </div>
                ))}
              </div>
              {errors.activity_categories && (
                <p className="text-sm text-destructive">{errors.activity_categories}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Niveau d'intensité</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {intensityLevels.map((level) => (
                  <div
                    key={level.id}
                    onClick={() => updateField('activity_intensity_level', level.code)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.activity_intensity_level === level.code
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-medium flex items-center gap-2">
                      {level.icon_emoji} {level.label_fr}
                    </div>
                    <div className="text-xs text-muted-foreground">{level.description_fr}</div>
                  </div>
                ))}
              </div>
              {errors.activity_intensity_level && (
                <p className="text-sm text-destructive">{errors.activity_intensity_level}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Centres d'intérêt</Label>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest.id}
                    variant={formData.activity_interests.includes(interest.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleArrayFieldToggle('activity_interests', interest.code)}
                  >
                    {interest.label_fr}
                    {formData.activity_interests.includes(interest.code) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>À éviter</Label>
              <div className="flex flex-wrap gap-2">
                {avoidances.map((avoidance) => (
                  <Badge
                    key={avoidance.id}
                    variant={formData.activity_avoidances.includes(avoidance.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleArrayFieldToggle('activity_avoidances', avoidance.code)}
                  >
                    {avoidance.label_fr}
                    {formData.activity_avoidances.includes(avoidance.code) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_age">Âge minimum</Label>
                <Input
                  id="min_age"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.min_age || ''}
                  onChange={(e) => updateField('min_age', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 6"
                />
                {errors.min_age && (
                  <p className="text-sm text-destructive">{errors.min_age}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_age">Âge maximum</Label>
                <Input
                  id="max_age"
                  type="number"
                  min="0"
                  max="120"
                  value={formData.max_age || ''}
                  onChange={(e) => updateField('max_age', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 99"
                />
                {errors.max_age && (
                  <p className="text-sm text-destructive">{errors.max_age}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_hours">Durée (heures)</Label>
                <Input
                  id="duration_hours"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={formData.duration_hours || ''}
                  onChange={(e) => updateField('duration_hours', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Ex: 2.5"
                />
                {errors.duration_hours && (
                  <p className="text-sm text-destructive">{errors.duration_hours}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_participants">Max participants</Label>
                <Input
                  id="max_participants"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.max_participants || ''}
                  onChange={(e) => updateField('max_participants', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 15"
                />
                {errors.max_participants && (
                  <p className="text-sm text-destructive">{errors.max_participants}</p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};