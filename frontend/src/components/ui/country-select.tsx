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
import { locationService, CountryDTO } from '@/services/locationService';

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string, countryId?: string) => void;
  placeholder?: string;
  className?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onValueChange,
  placeholder = "Sélectionnez un pays...",
  className
}) => {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const data = await locationService.listCountries();
      setCountries((data || []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des pays",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewCountry = async (countryName: string) => {
    try {
      const countryCode = countryName.slice(0, 3).toUpperCase();
      
      const data = await locationService.createCountry({
        name: countryName,
        code: countryCode,
      });

      const newCountry = { id: data.id, name: data.name, code: data.code, is_active: data.is_active };
      setCountries(prev => [...prev, newCountry].sort((a, b) => a.name.localeCompare(b.name)));
      
      onValueChange(countryName, data.id);
      setOpen(false);

      toast({
        title: "Succès",
        description: `Le pays "${countryName}" a été créé avec succès`,
      });

      return data;
    } catch (error) {
      console.error('Error creating country:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le nouveau pays",
        variant: "destructive",
      });
      return null;
    }
  };

  const selectedCountry = countries.find(country => country.name === value);

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
          {selectedCountry ? selectedCountry.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <Command>
          <CommandInput placeholder="Rechercher un pays..." />
          <CommandEmpty className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Aucun pays trouvé
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.querySelector('[placeholder="Rechercher un pays..."]') as HTMLInputElement;
                  if (input?.value) {
                    createNewCountry(input.value);
                  }
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Créer ce pays
              </Button>
            </div>
          </CommandEmpty>
          <CommandGroup>
            {countries.map((country) => (
              <CommandItem
                key={country.id}
                value={country.name}
                onSelect={(currentValue) => {
                  onValueChange(currentValue === value ? "" : currentValue, country.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === country.name ? "opacity-100" : "opacity-0"
                  )}
                />
                {country.name}
                <span className="ml-auto text-xs text-muted-foreground">
                  {country.code}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
