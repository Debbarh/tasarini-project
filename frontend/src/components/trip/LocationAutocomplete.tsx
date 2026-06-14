import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OsmPick {
  name: string;
  lat?: number;
  lon?: number;
  countryCode?: string; // ISO2 (pour biaiser la recherche de ville)
  countryName?: string; // renseigné pour les villes (via addressdetails)
  fromDb?: boolean;
}

interface DbOption {
  id: string;
  name: string;
}

interface Props {
  kind: "country" | "city";
  value: string;
  /** Appelé quand l'utilisateur choisit une suggestion (OSM ou base). */
  onSelect: (pick: OsmPick) => void;
  /** Appelé à chaque frappe (saisie libre conservée même sans sélection). */
  onTextChange: (text: string) => void;
  countryCode?: string; // biaise la recherche de ville sur ce pays
  dbOptions?: DbOption[]; // entrées déjà en base, proposées en premier
  language?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export default function LocationAutocomplete({
  kind,
  value,
  onSelect,
  onTextChange,
  countryCode,
  dbOptions = [],
  language = "fr",
  placeholder,
  disabled,
  id,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<OsmPick[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Refléter une valeur changée de l'extérieur (ex: sélection sur la carte)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Fermer au clic extérieur
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const fetchOsm = (q: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = new URLSearchParams({
      format: "jsonv2",
      "accept-language": language,
      addressdetails: "1",
      limit: kind === "country" ? "5" : "8",
      q,
    });
    // featureType restreint le type de résultat (pays vs localité)
    params.set("featureType", kind === "country" ? "country" : "city");
    if (kind === "city" && countryCode) params.set("countrycodes", countryCode);

    fetch(`${NOMINATIM}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const seen = new Set<string>();
        const out: OsmPick[] = [];
        for (const item of data || []) {
          const addr = item.address || {};
          const name =
            kind === "country"
              ? addr.country || item.name || item.display_name?.split(",")[0]
              : addr.city || addr.town || addr.village || addr.municipality || addr.state || item.name || item.display_name?.split(",")[0];
          if (!name) continue;
          const key = `${name}|${addr.country || ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            name,
            lat: item.lat ? parseFloat(item.lat) : undefined,
            lon: item.lon ? parseFloat(item.lon) : undefined,
            countryCode: addr.country_code ? addr.country_code.toUpperCase() : undefined,
            countryName: addr.country,
          });
        }
        setSuggestions(out);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setLoading(false);
      });
  };

  const handleChange = (text: string) => {
    setQuery(text);
    onTextChange(text);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => fetchOsm(text.trim()), 450);
  };

  const handlePick = (pick: OsmPick) => {
    setQuery(pick.name);
    setOpen(false);
    setSuggestions([]);
    onSelect(pick);
  };

  // Entrées de la base correspondant à la saisie (proposées en premier)
  const dbMatches: OsmPick[] = (dbOptions || [])
    .filter((o) => o.name && query.trim() && o.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 5)
    .map((o) => ({ name: o.name, fromDb: true }));

  const dbNames = new Set(dbMatches.map((d) => d.name.toLowerCase()));
  const osmOnly = suggestions.filter((s) => !dbNames.has(s.name.toLowerCase()));
  const allItems = [...dbMatches, ...osmOnly];

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && allItems.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-auto">
          {allItems.map((item, i) => (
            <button
              key={`${item.name}-${i}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(item)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                item.fromDb && "font-medium"
              )}
            >
              {item.fromDb ? (
                <Database className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="truncate">{item.name}</span>
              {!item.fromDb && item.countryName && kind === "city" && (
                <span className="ml-auto text-xs text-muted-foreground truncate">{item.countryName}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
