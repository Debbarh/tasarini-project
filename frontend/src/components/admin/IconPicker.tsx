import { useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getLucideIcon } from "@/lib/taxonomyIcon";

interface IconPickerProps {
  /** Nom d'icône lucide sélectionné (champ icon_name). */
  value?: string | null;
  onChange: (iconName: string) => void;
  placeholder?: string;
}

// Noms exportés par lucide-react, filtrés sur les vrais composants d'icônes.
const ALL_ICON_NAMES: string[] = Object.keys(LucideIcons).filter((name) => {
  if (!/^[A-Z]/.test(name)) return false;
  // Exclure les exports utilitaires (Icon, createLucideIcon, *Icon alias…)
  if (name === "Icon" || name === "LucideIcon" || name.endsWith("Icon")) return false;
  const C = (LucideIcons as unknown as Record<string, unknown>)[name];
  return typeof C === "object" || typeof C === "function";
});

/**
 * Sélecteur d'icône SVG (lucide) pour l'administration. Remplace la saisie
 * d'emoji : l'admin recherche et choisit une icône, stockée dans icon_name.
 */
export default function IconPicker({ value, onChange, placeholder = "Choisir une icône" }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const Selected = getLucideIcon(value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? ALL_ICON_NAMES.filter((n) => n.toLowerCase().includes(q))
      : ALL_ICON_NAMES;
    return base.slice(0, 90);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal">
          {Selected ? <Selected className="h-4 w-4" /> : null}
          <span className="truncate">{value || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <Input
          autoFocus
          placeholder="Rechercher (ex: wifi, hotel, coffee)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3"
        />
        <div className="grid grid-cols-6 gap-1 max-h-64 overflow-auto">
          {results.map((name) => {
            const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
            const active = name === value;
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={`flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors ${active ? "bg-primary/15 ring-1 ring-primary" : ""}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
          {results.length === 0 && (
            <p className="col-span-6 text-sm text-muted-foreground py-4 text-center">Aucune icône</p>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="mt-2 text-xs text-muted-foreground hover:text-destructive"
          >
            Effacer l'icône
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
