import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Lightbulb } from 'lucide-react';
import { UnifiedPOIFormData } from '@/types/poi-form';
import { ACCESSIBILITY_FEATURES } from '@/utils/accessibilityUtils';
import { TaxonomyIcon } from '@/lib/taxonomyIcon';

interface AccessibilitySectionProps {
  formData: UnifiedPOIFormData;
  updateField: <K extends keyof UnifiedPOIFormData>(field: K, value: UnifiedPOIFormData[K]) => void;
  errors: Record<string, string>;
}

export const AccessibilitySection: React.FC<AccessibilitySectionProps> = ({
  formData,
  updateField,
  errors
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accessibilité</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {ACCESSIBILITY_FEATURES.map((feature) => (
            <div key={feature.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TaxonomyIcon iconName={feature.icon} className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">{feature.label}</Label>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Switch
                  checked={formData[feature.key as keyof UnifiedPOIFormData] as boolean}
                  onCheckedChange={(checked) => 
                    updateField(feature.key as keyof UnifiedPOIFormData, checked)
                  }
                />
              </div>
              {errors[feature.key] && (
                <p className="text-sm text-destructive">{errors[feature.key]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <Lightbulb className="w-4 h-4 inline mr-1" /><strong>Conseil :</strong> Plus votre lieu est accessible, plus il sera visible
            dans les recherches d'utilisateurs ayant des besoins spécifiques. L'accessibilité 
            améliore l'expérience de tous vos visiteurs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};