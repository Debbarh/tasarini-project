import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plane } from 'lucide-react';
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

// Liste des aéroports majeurs avec codes IATA
const MAJOR_AIRPORTS = [
  // France
  { code: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'France' },
  { code: 'ORY', name: 'Paris Orly', city: 'Paris', country: 'France' },
  { code: 'NCE', name: 'Nice Côte d\'Azur', city: 'Nice', country: 'France' },
  { code: 'LYS', name: 'Lyon Saint-Exupéry', city: 'Lyon', country: 'France' },
  { code: 'MRS', name: 'Marseille Provence', city: 'Marseille', country: 'France' },
  { code: 'TLS', name: 'Toulouse-Blagnac', city: 'Toulouse', country: 'France' },
  { code: 'BOD', name: 'Bordeaux-Mérignac', city: 'Bordeaux', country: 'France' },
  { code: 'NTE', name: 'Nantes Atlantique', city: 'Nantes', country: 'France' },

  // Espagne
  { code: 'MAD', name: 'Madrid-Barajas', city: 'Madrid', country: 'Espagne' },
  { code: 'BCN', name: 'Barcelona-El Prat', city: 'Barcelone', country: 'Espagne' },
  { code: 'AGP', name: 'Málaga-Costa del Sol', city: 'Málaga', country: 'Espagne' },
  { code: 'PMI', name: 'Palma de Majorque', city: 'Palma', country: 'Espagne' },
  { code: 'SVQ', name: 'Séville', city: 'Séville', country: 'Espagne' },
  { code: 'VLC', name: 'Valence', city: 'Valence', country: 'Espagne' },

  // Italie
  { code: 'FCO', name: 'Roma Fiumicino', city: 'Rome', country: 'Italie' },
  { code: 'CIA', name: 'Roma Ciampino', city: 'Rome', country: 'Italie' },
  { code: 'MXP', name: 'Milano Malpensa', city: 'Milan', country: 'Italie' },
  { code: 'LIN', name: 'Milano Linate', city: 'Milan', country: 'Italie' },
  { code: 'VCE', name: 'Venezia Marco Polo', city: 'Venise', country: 'Italie' },
  { code: 'NAP', name: 'Napoli Capodichino', city: 'Naples', country: 'Italie' },
  { code: 'BLQ', name: 'Bologna Marconi', city: 'Bologne', country: 'Italie' },

  // Royaume-Uni
  { code: 'LHR', name: 'London Heathrow', city: 'Londres', country: 'Royaume-Uni' },
  { code: 'LGW', name: 'London Gatwick', city: 'Londres', country: 'Royaume-Uni' },
  { code: 'LTN', name: 'London Luton', city: 'Londres', country: 'Royaume-Uni' },
  { code: 'STN', name: 'London Stansted', city: 'Londres', country: 'Royaume-Uni' },
  { code: 'MAN', name: 'Manchester', city: 'Manchester', country: 'Royaume-Uni' },
  { code: 'EDI', name: 'Edinburgh', city: 'Édimbourg', country: 'Royaume-Uni' },

  // Allemagne
  { code: 'FRA', name: 'Frankfurt am Main', city: 'Francfort', country: 'Allemagne' },
  { code: 'MUC', name: 'München', city: 'Munich', country: 'Allemagne' },
  { code: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country: 'Allemagne' },
  { code: 'HAM', name: 'Hamburg', city: 'Hambourg', country: 'Allemagne' },
  { code: 'DUS', name: 'Düsseldorf', city: 'Düsseldorf', country: 'Allemagne' },

  // Grèce
  { code: 'ATH', name: 'Athens International', city: 'Athènes', country: 'Grèce' },
  { code: 'HER', name: 'Heraklion', city: 'Héraklion', country: 'Grèce' },
  { code: 'RHO', name: 'Rhodes', city: 'Rhodes', country: 'Grèce' },
  { code: 'CFU', name: 'Corfu', city: 'Corfou', country: 'Grèce' },

  // Portugal
  { code: 'LIS', name: 'Lisboa', city: 'Lisbonne', country: 'Portugal' },
  { code: 'OPO', name: 'Porto', city: 'Porto', country: 'Portugal' },
  { code: 'FAO', name: 'Faro', city: 'Faro', country: 'Portugal' },

  // Autres Europe
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Pays-Bas' },
  { code: 'BRU', name: 'Brussels', city: 'Bruxelles', country: 'Belgique' },
  { code: 'ZRH', name: 'Zürich', city: 'Zurich', country: 'Suisse' },
  { code: 'GVA', name: 'Genève', city: 'Genève', country: 'Suisse' },
  { code: 'VIE', name: 'Wien', city: 'Vienne', country: 'Autriche' },
  { code: 'PRG', name: 'Prague', city: 'Prague', country: 'République tchèque' },
  { code: 'CPH', name: 'Copenhagen', city: 'Copenhague', country: 'Danemark' },
  { code: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Suède' },
  { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'Norvège' },
  { code: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Irlande' },
  { code: 'WAW', name: 'Warsaw Chopin', city: 'Varsovie', country: 'Pologne' },
  { code: 'BUD', name: 'Budapest', city: 'Budapest', country: 'Hongrie' },

  // International
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turquie' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubaï', country: 'Émirats Arabes Unis' },
  { code: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'États-Unis' },
  { code: 'LAX', name: 'Los Angeles', city: 'Los Angeles', country: 'États-Unis' },
  { code: 'NRT', name: 'Tokyo Narita', city: 'Tokyo', country: 'Japon' },
  { code: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', country: 'Japon' },
  { code: 'BKK', name: 'Bangkok Suvarnabhumi', city: 'Bangkok', country: 'Thaïlande' },
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapour', country: 'Singapour' },
  { code: 'HKG', name: 'Hong Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { code: 'YUL', name: 'Montréal-Trudeau', city: 'Montréal', country: 'Canada' },
  { code: 'YYZ', name: 'Toronto Pearson', city: 'Toronto', country: 'Canada' },
].sort((a, b) => a.city.localeCompare(b.city));

interface AirportCodeAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const AirportCodeAutocomplete: React.FC<AirportCodeAutocompleteProps> = ({
  value,
  onValueChange,
  placeholder = "Rechercher un aéroport...",
  className
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedAirport = MAJOR_AIRPORTS.find(a => a.code === value);

  const filteredAirports = MAJOR_AIRPORTS.filter(airport =>
    airport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.country.toLowerCase().includes(searchTerm.toLowerCase())
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
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            {selectedAirport
              ? `${selectedAirport.city} (${selectedAirport.code})`
              : placeholder
            }
          </div>
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
          <CommandEmpty>Aucun aéroport trouvé.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredAirports.map((airport) => (
              <CommandItem
                key={airport.code}
                value={airport.code}
                onSelect={() => {
                  onValueChange(airport.code);
                  setOpen(false);
                  setSearchTerm('');
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === airport.code ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{airport.city} ({airport.code})</span>
                  <span className="text-xs text-muted-foreground">
                    {airport.name} • {airport.country}
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
