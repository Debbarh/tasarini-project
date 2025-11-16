import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, AlertTriangle } from 'lucide-react';
import { DaySchedule, TimeSlot, DayOfWeek, DAY_LABELS_FR } from '@/types/opening-hours';
import { TimeSlotPicker } from './TimeSlotPicker';
import { validateDaySchedule, getSuggestedHours } from '@/utils/openingHoursUtils';

interface DayScheduleEditorProps {
  day: DayOfWeek;
  schedule: DaySchedule;
  onChange: (schedule: DaySchedule) => void;
  onCopyToOtherDays?: (day: DayOfWeek, schedule: DaySchedule) => void;
  disabled?: boolean;
  poiType?: string;
}

export const DayScheduleEditor: React.FC<DayScheduleEditorProps> = ({
  day,
  schedule,
  onChange,
  onCopyToOtherDays,
  disabled = false,
  poiType
}) => {
  const isOpen = schedule !== "closed" && schedule !== "legacy";
  const isLegacy = schedule === "legacy";
  
  const validation = validateDaySchedule(schedule);
  const hasErrors = !validation.isValid;
  const hasWarnings = validation.warnings.length > 0;

  const handleToggleOpen = (open: boolean) => {
    if (open) {
      // Use suggested hours based on POI type
      const suggestedHours = getSuggestedHours(poiType);
      onChange(suggestedHours);
    } else {
      onChange("closed");
    }
  };

  const handleSlotsChange = (slots: TimeSlot[]) => {
    onChange(slots.length > 0 ? slots : "closed");
  };

  const handleCopyToOthers = () => {
    if (onCopyToOtherDays && schedule !== "legacy") {
      onCopyToOtherDays(day, schedule);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label htmlFor={`${day}-toggle`} className="text-base font-medium">
            {DAY_LABELS_FR[day]}
          </Label>
          
          {isLegacy && (
            <Badge variant="secondary" className="text-xs">
              Données migrées
            </Badge>
          )}
          
          {hasErrors && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Erreur
            </Badge>
          )}
          
          {hasWarnings && !hasErrors && (
            <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Attention
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCopyToOtherDays && !isLegacy && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyToOthers}
              disabled={disabled || schedule === "closed"}
              title="Copier vers d'autres jours"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <Label htmlFor={`${day}-toggle`} className="text-sm">
              {isOpen ? 'Ouvert' : 'Fermé'}
            </Label>
            <Switch
              id={`${day}-toggle`}
              checked={isOpen}
              onCheckedChange={handleToggleOpen}
              disabled={disabled || isLegacy}
            />
          </div>
        </div>
      </div>

      {isLegacy && (
        <div className="p-3 bg-muted/50 rounded-md border border-dashed">
          <p className="text-sm text-muted-foreground">
            Les horaires de ce jour proviennent d'une ancienne version.
            Activez le commutateur pour les modifier avec la nouvelle interface.
          </p>
        </div>
      )}

      {isOpen && !isLegacy && Array.isArray(schedule) && (
        <TimeSlotPicker
          slots={schedule}
          onChange={handleSlotsChange}
          disabled={disabled}
        />
      )}

      {/* Display validation errors and warnings */}
      {hasErrors && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <p key={index} className="text-sm text-destructive">
              • {error}
            </p>
          ))}
        </div>
      )}

      {hasWarnings && !hasErrors && (
        <div className="space-y-1">
          {validation.warnings.map((warning, index) => (
            <p key={index} className="text-sm text-orange-600">
              • {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};