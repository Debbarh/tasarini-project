import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, Edit, Sparkles, AlertTriangle } from 'lucide-react';
import { 
  OpeningHoursData, 
  DayOfWeek, 
  DaySchedule,
  DAYS_OF_WEEK 
} from '@/types/opening-hours';
import { DayScheduleEditor } from './DayScheduleEditor';
import { HoursTemplateSelector } from './HoursTemplateSelector';
import { 
  createEmptyOpeningHours, 
  formatOpeningHours,
  hasOpeningHours,
  validateDaySchedule 
} from '@/utils/openingHoursUtils';

interface OpeningHoursSectionProps {
  value: string | null; // Legacy opening_hours field
  structuredValue: OpeningHoursData | null; // New structured field
  onChange: (legacyValue: string, structuredValue: OpeningHoursData) => void;
  poiType?: string;
  errors?: Record<string, string>;
  warnings?: Record<string, string>;
}

export const OpeningHoursSection: React.FC<OpeningHoursSectionProps> = ({
  value,
  structuredValue,
  onChange,
  poiType,
  errors,
  warnings
}) => {
  const [viewMode, setViewMode] = useState<'compact' | 'edit'>('compact');
  const [activeTab, setActiveTab] = useState<'regular' | 'templates'>('regular');
  const [openingHours, setOpeningHours] = useState<OpeningHoursData>(() => 
    structuredValue || createEmptyOpeningHours()
  );

  // Update internal state when props change
  useEffect(() => {
    if (structuredValue) {
      setOpeningHours(structuredValue);
    } else if (value && value.trim()) {
      // Create a legacy structure for existing text data
      const legacyStructure = createEmptyOpeningHours();
      legacyStructure.legacy_text = value;
      legacyStructure.migrated = true;
      setOpeningHours(legacyStructure);
    }
  }, [structuredValue, value]);

  const handleScheduleChange = (day: DayOfWeek, schedule: DaySchedule) => {
    const newHours = {
      ...openingHours,
      regular_hours: {
        ...openingHours.regular_hours,
        [day]: schedule
      },
      last_updated: new Date().toISOString()
    };
    
    setOpeningHours(newHours);
    
    // Generate legacy text for backward compatibility
    const legacyText = formatOpeningHours(newHours, 'compact');
    onChange(legacyText, newHours);
  };

  const handleCopyToOtherDays = (sourceDay: DayOfWeek, schedule: DaySchedule) => {
    const updatedHours = { ...openingHours.regular_hours };
    
    // Ask which days to copy to (for now, copy to all other days except Sunday)
    DAYS_OF_WEEK.forEach(day => {
      if (day !== sourceDay && day !== 'sunday') {
        updatedHours[day] = schedule;
      }
    });
    
    const newHours = {
      ...openingHours,
      regular_hours: updatedHours,
      last_updated: new Date().toISOString()
    };
    
    setOpeningHours(newHours);
    
    const legacyText = formatOpeningHours(newHours, 'compact');
    onChange(legacyText, newHours);
  };

  const handleApplyTemplate = (templateData: OpeningHoursData) => {
    const newHours = {
      ...templateData,
      last_updated: new Date().toISOString()
    };
    
    setOpeningHours(newHours);
    
    const legacyText = formatOpeningHours(newHours, 'compact');
    onChange(legacyText, newHours);
    
    setViewMode('edit');
    setActiveTab('regular');
  };

  // Calculate validation status
  const validationResults = DAYS_OF_WEEK.map(day => ({
    day,
    result: validateDaySchedule(openingHours.regular_hours[day])
  }));

  const hasErrors = validationResults.some(v => !v.result.isValid);
  const hasWarnings = validationResults.some(v => v.result.warnings.length > 0);
  const isComplete = hasOpeningHours(openingHours);

  const displayText = openingHours.migrated && openingHours.legacy_text 
    ? openingHours.legacy_text 
    : formatOpeningHours(openingHours, 'compact');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horaires d'ouverture
            {hasErrors && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Erreurs
              </Badge>
            )}
            {hasWarnings && !hasErrors && (
              <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Attention
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant={viewMode === 'compact' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('compact')}
            >
              <Eye className="h-4 w-4 mr-1" />
              Aperçu
            </Button>
            <Button
              type="button"
              variant={viewMode === 'edit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('edit')}
            >
              <Edit className="h-4 w-4 mr-1" />
              Éditer
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {viewMode === 'compact' ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              {isComplete ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Horaires actuels :</div>
                  <div className="text-sm font-mono whitespace-pre-line">
                    {displayText || "Aucun horaire défini"}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun horaire défini</p>
                  <p className="text-xs">Cliquez sur "Éditer" pour configurer les horaires</p>
                </div>
              )}
            </div>
            
            {openingHours.migrated && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Ces horaires proviennent d'une ancienne version. 
                  Passez en mode édition pour bénéficier de la nouvelle interface avancée.
                </p>
              </div>
            )}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="regular">Horaires réguliers</TabsTrigger>
              <TabsTrigger value="templates">
                <Sparkles className="h-4 w-4 mr-1" />
                Templates
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="regular" className="space-y-4 mt-4">
              {DAYS_OF_WEEK.map(day => (
                <DayScheduleEditor
                  key={day}
                  day={day}
                  schedule={openingHours.regular_hours[day]}
                  onChange={(schedule) => handleScheduleChange(day, schedule)}
                  onCopyToOtherDays={handleCopyToOtherDays}
                  poiType={poiType}
                />
              ))}
            </TabsContent>
            
            <TabsContent value="templates" className="mt-4">
              <HoursTemplateSelector
                onApplyTemplate={handleApplyTemplate}
                poiType={poiType}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Display global errors and warnings */}
        {errors?.opening_hours && (
          <p className="text-sm text-destructive mt-2">{errors.opening_hours}</p>
        )}
        
        {warnings?.opening_hours && (
          <p className="text-sm text-orange-600 mt-2">{warnings.opening_hours}</p>
        )}
      </CardContent>
    </Card>
  );
};