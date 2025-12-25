import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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

// Liste des destinations HotelBeds populaires (codes réels)
const POPULAR_DESTINATIONS = [
  // France
  { code: 'PAR', name: 'Paris', country: 'France' },
  { code: 'NCE', name: 'Nice', country: 'France' },
  { code: 'LYO', name: 'Lyon', country: 'France' },
  { code: 'MRS', name: 'Marseille', country: 'France' },
  { code: 'BOR', name: 'Bordeaux', country: 'France' },

  // Espagne
  { code: 'BCN', name: 'Barcelone', country: 'Espagne' },
  { code: 'MAD', name: 'Madrid', country: 'Espagne' },
  { code: 'SVQ', name: 'Séville', country: 'Espagne' },
  { code: 'VLC', name: 'Valence', country: 'Espagne' },
  { code: 'PMI', name: 'Palma de Majorque', country: 'Espagne' },

  // Italie
  { code: 'ROM', name: 'Rome', country: 'Italie' },
  { code: 'MIL', name: 'Milan', country: 'Italie' },
  { code: 'VCE', name: 'Venise', country: 'Italie' },
  { code: 'FLR', name: 'Florence', country: 'Italie' },
  { code: 'NAP', name: 'Naples', country: 'Italie' },

  // Royaume-Uni
  { code: 'LON', name: 'Londres', country: 'Royaume-Uni' },
  { code: 'EDI', name: 'Édimbourg', country: 'Royaume-Uni' },
  { code: 'MAN', name: 'Manchester', country: 'Royaume-Uni' },

  // Allemagne
  { code: 'BER', name: 'Berlin', country: 'Allemagne' },
  { code: 'MUC', name: 'Munich', country: 'Allemagne' },
  { code: 'FRA', name: 'Francfort', country: 'Allemagne' },

  // Grèce
  { code: 'ATH', name: 'Athènes', country: 'Grèce' },
  { code: 'HER', name: 'Héraklion', country: 'Grèce' },
  { code: 'RHO', name: 'Rhodes', country: 'Grèce' },

  // Portugal
  { code: 'LIS', name: 'Lisbonne', country: 'Portugal' },
  { code: 'OPO', name: 'Porto', country: 'Portugal' },
  { code: 'FAO', name: 'Faro', country: 'Portugal' },

  // Autres
  { code: 'AMS', name: 'Amsterdam', country: 'Pays-Bas' },
  { code: 'BRU', name: 'Bruxelles', country: 'Belgique' },
  { code: 'PRG', name: 'Prague', country: 'République tchèque' },
  { code: 'VIE', name: 'Vienne', country: 'Autriche' },
  { code: 'DUB', name: 'Dublin', country: 'Irlande' },
  { code: 'COP', name: 'Copenhague', country: 'Danemark' },
  { code: 'STO', name: 'Stockholm', country: 'Suède' },
  { code: 'OSL', name: 'Oslo', country: 'Norvège' },
  { code: 'WAW', name: 'Varsovie', country: 'Pologne' },
  { code: 'BUD', name: 'Budapest', country: 'Hongrie' },
  { code: 'IST', name: 'Istanbul', country: 'Turquie' },
  { code: 'DXB', name: 'Dubaï', country: 'Émirats Arabes Unis' },
  { code: 'NYC', name: 'New York', country: 'États-Unis' },
  { code: 'TYO', name: 'Tokyo', country: 'Japon' },
  { code: 'BKK', name: 'Bangkok', country: 'Thaïlande' },
].sort((a, b) => a.name.localeCompare(b.name));

interface DestinationCodeAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const DestinationCodeAutocomplete: React.FC<DestinationCodeAutocompleteProps> = ({
  value,
  onValueChange,
  placeholder = "Rechercher une destination...",
  className
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedDestination = POPULAR_DESTINATIONS.find(d => d.code === value);

  const filteredDestinations = POPULAR_DESTINATIONS.filter(dest =>
    dest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dest.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dest.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedDestination
            ? `${selectedDestination.name} (${selectedDestination.code})`
            : placeholder
          }
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Rechercher..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>Aucune destination trouvée.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredDestinations.map((destination) => (
              <CommandItem
                key={destination.code}
                value={destination.code}
                onSelect={() => {
                  onValueChange(destination.code);
                  setOpen(false);
                  setSearchTerm('');
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === destination.code ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{destination.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {destination.country} • Code: {destination.code}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
