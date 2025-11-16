import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle } from 'lucide-react';
import { OpeningHoursTemplate, OpeningHoursData } from '@/types/opening-hours';
import { formatOpeningHours } from '@/utils/openingHoursUtils';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';

interface HoursTemplateSelectorProps {
  onApplyTemplate: (templateData: OpeningHoursData) => void;
  poiType?: string;
  disabled?: boolean;
}

export const HoursTemplateSelector: React.FC<HoursTemplateSelectorProps> = ({
  onApplyTemplate,
  poiType,
  disabled = false
}) => {
  const [templates, setTemplates] = useState<OpeningHoursTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      // TODO: Django API doesn't have opening_hours_templates endpoint yet
      // Temporarily return empty array
      console.warn('Opening hours templates not yet implemented in Django API');
      setTemplates([]);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les templates d'horaires",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsApplying(true);
    try {
      onApplyTemplate(template.hours_data);
      
      toast({
        title: "Template appliqué",
        description: `Les horaires "${template.name}" ont été appliqués avec succès.`
      });
      
      setSelectedTemplate('');
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'appliquer le template",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Filter templates by POI type if specified
  const relevantTemplates = templates.filter(template => 
    !poiType || template.poi_type === poiType || template.poi_type === 'generic'
  );

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-muted animate-pulse rounded"></div>
        <div className="h-8 bg-muted animate-pulse rounded w-24"></div>
      </div>
    );
  }

  if (relevantTemplates.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Aucun template disponible
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium">Templates rapides</h4>
      </div>

      <div className="space-y-3">
        <Select
          value={selectedTemplate}
          onValueChange={setSelectedTemplate}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choisir un template d'horaires..." />
          </SelectTrigger>
          <SelectContent>
            {relevantTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <span>{template.name}</span>
                  {template.is_system && (
                    <Badge variant="secondary" className="text-xs">
                      Système
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTemplateData && (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium">{selectedTemplateData.name}</h5>
                <Badge 
                  variant={selectedTemplateData.is_system ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {selectedTemplateData.poi_type}
                </Badge>
              </div>
              
              {selectedTemplateData.description && (
                <p className="text-xs text-muted-foreground">
                  {selectedTemplateData.description}
                </p>
              )}
              
              <div className="text-xs font-mono bg-background p-2 rounded border">
                {formatOpeningHours(selectedTemplateData.hours_data, 'detailed')}
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleApplyTemplate}
          disabled={!selectedTemplate || disabled || isApplying}
          className="w-full"
          size="sm"
        >
          {isApplying ? "Application en cours..." : "Appliquer ce template"}
        </Button>
      </div>
    </div>
  );
};