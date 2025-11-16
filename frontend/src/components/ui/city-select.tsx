import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { locationService, CityDTO } from '@/services/locationService';

interface CitySelectProps {
  value?: string;
  onValueChange: (value: string, cityId?: string) => void;
  countryId?: string;
  countryName?: string;
  placeholder?: string;
  className?: string;
  coordinates?: { lat: number; lng: number };
}

export const CitySelect: React.FC<CitySelectProps> = ({
  value,
  onValueChange,
  countryId,
  countryName,
  placeholder = "Sélectionnez une ville...",
  className,
  coordinates
}) => {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<CityDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (countryId) {
      fetchCities();
    } else {
      setCities([]);
    }
  }, [countryId]);

  const fetchCities = async () => {
    if (!countryId) return;
    
    setLoading(true);
    try {
      const data = await locationService.listCities({ country: countryId });
      setCities((data || []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching cities:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des villes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewCity = async (cityName: string) => {
    if (!countryId) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord sélectionner un pays",
        variant: "destructive",
      });
      return null;
    }

    try {
      const data = await locationService.createCity({
        name: cityName,
        country: countryId,
        latitude: coordinates?.lat ?? null,
        longitude: coordinates?.lng ?? null,
      });

      const newCity = {
        id: data.id,
        name: data.name,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        is_active: data.is_active,
      };
      setCities(prev => [...prev, newCity].sort((a, b) => a.name.localeCompare(b.name)));
      
      onValueChange(cityName, data.id);
      setOpen(false);

      toast({
        title: "Succès",
        description: `La ville "${cityName}" a été créée avec succès`,
      });

      return data;
    } catch (error) {
      console.error('Error creating city:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la nouvelle ville",
        variant: "destructive",
      });
      return null;
    }
  };

  const selectedCity = cities.find(city => city.name === value);

  if (!countryId) {
    return (
      <Button
        variant="outline"
        className={cn("justify-start text-muted-foreground", className)}
        disabled
      >
        Sélectionnez d'abord un pays
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={loading}
        >
          {selectedCity ? selectedCity.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <Command>
          <CommandInput placeholder="Rechercher une ville..." />
          <CommandEmpty className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Aucune ville trouvée dans {countryName}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.querySelector('[placeholder="Rechercher une ville..."]') as HTMLInputElement;
                  if (input?.value) {
                    createNewCity(input.value);
                  }
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Créer cette ville
              </Button>
            </div>
          </CommandEmpty>
          <CommandGroup>
            {cities.map((city) => (
              <CommandItem
                key={city.id}
                value={city.name}
                onSelect={(currentValue) => {
                  onValueChange(currentValue === value ? "" : currentValue, city.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === city.name ? "opacity-100" : "opacity-0"
                  )}
                />
                {city.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
