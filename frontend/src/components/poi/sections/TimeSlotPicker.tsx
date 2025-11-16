import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Clock } from 'lucide-react';
import { TimeSlot } from '@/types/opening-hours';
import { validateTimeSlot } from '@/utils/openingHoursUtils';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
  error?: string;
  disabled?: boolean;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  onChange,
  error,
  disabled = false
}) => {
  const addSlot = () => {
    const newSlot: TimeSlot = { start: '09:00', end: '18:00' };
    onChange([...slots, newSlot]);
  };

  const removeSlot = (index: number) => {
    const newSlots = slots.filter((_, i) => i !== index);
    onChange(newSlots);
  };

  const updateSlot = (index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    onChange(newSlots);
  };

  const getSlotError = (slot: TimeSlot): string | undefined => {
    const validation = validateTimeSlot(slot);
    return validation.isValid ? undefined : validation.error;
  };

  return (
    <div className="space-y-3">
      {slots.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun créneau défini</p>
        </div>
      )}

      {slots.map((slot, index) => {
        const slotError = getSlotError(slot);
        
        return (
          <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`start-${index}`} className="text-xs text-muted-foreground">
                  Ouverture
                </Label>
                <Input
                  id={`start-${index}`}
                  type="time"
                  value={slot.start}
                  onChange={(e) => updateSlot(index, 'start', e.target.value)}
                  disabled={disabled}
                  className={slotError ? 'border-destructive' : ''}
                />
              </div>
              <div>
                <Label htmlFor={`end-${index}`} className="text-xs text-muted-foreground">
                  Fermeture
                </Label>
                <Input
                  id={`end-${index}`}
                  type="time"
                  value={slot.end}
                  onChange={(e) => updateSlot(index, 'end', e.target.value)}
                  disabled={disabled}
                  className={slotError ? 'border-destructive' : ''}
                />
              </div>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeSlot(index)}
              disabled={disabled}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            {slotError && (
              <div className="col-span-3 text-xs text-destructive">
                {slotError}
              </div>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSlot}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un créneau
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};