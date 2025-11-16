import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UnifiedPOIFormData } from '@/types/poi-form';

interface BasicInfoSectionProps {
  formData: UnifiedPOIFormData;
  updateField: <K extends keyof UnifiedPOIFormData>(field: K, value: UnifiedPOIFormData[K]) => void;
  errors: Record<string, string>;
  required?: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  updateField,
  errors,
  required = true
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📍</span>
          Informations de base
          {required && <span className="text-destructive">*</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">
            Nom du point d'intérêt <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Ex: Restaurant Le Gourmet, Château de Versailles..."
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Décrivez ce lieu, ses particularités, son histoire..."
            rows={4}
            className={errors.description ? 'border-destructive' : ''}
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">{errors.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {formData.description.length} caractères (minimum 20 recommandé)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};