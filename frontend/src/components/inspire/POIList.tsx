import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, ImageOff } from "lucide-react";
import { POI, categorizePOI, getPOIColor } from "@/services/poiService";

const poiImageUrl = (p: POI): string =>
  p.media_images?.[0] || (p.metadata as any)?.images?.[0] || "";

interface POIListProps {
  pois: POI[];
  selectedId?: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  loading?: boolean;
}

/**
 * Vue liste synchronisée avec la carte (style Booking/Airbnb) :
 * - n'affiche que les POI visibles dans le cadre actuel,
 * - survol d'une carte → highlight du marqueur (via onHover),
 * - clic → ouvre la fiche + recentre la carte (via onSelect),
 * - défile automatiquement jusqu'au POI sélectionné depuis la carte.
 */
export const POIList = ({ pois, selectedId, hoveredId, onHover, onSelect, loading }: POIListProps) => {
  const { t, i18n } = useTranslation();
  const itemsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  // Défile jusqu'à la carte sélectionnée depuis la carte.
  useEffect(() => {
    if (selectedId && itemsRef.current[selectedId]) {
      itemsRef.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  const fmtDistance = (km?: number) => {
    if (km == null) return null;
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace(".", i18n.language === "fr" ? "," : ".")} km`;
  };

  if (loading && pois.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-2 rounded-lg border animate-pulse">
            <div className="w-20 h-20 rounded-md bg-muted shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (pois.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10 px-4">
        <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
        {t("beInspired.list.empty", "Aucun lieu dans cette zone. Déplacez la carte ou élargissez le rayon.")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground px-1 pb-1">
        {t("beInspired.list.countInView", { count: pois.length, defaultValue: "{{count}} lieux dans la vue" })}
      </div>
      {pois.map((poi) => {
        const img = poiImageUrl(poi);
        const category = categorizePOI(poi);
        const active = poi.id === selectedId || poi.id === hoveredId;
        const distance = fmtDistance(poi.distance);
        return (
          <button
            key={poi.id}
            ref={(el) => (itemsRef.current[poi.id] = el)}
            onMouseEnter={() => onHover?.(poi.id)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onSelect?.(poi.id)}
            className={`w-full text-left flex gap-3 p-2 rounded-lg border transition-colors ${
              active ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
              {img ? (
                <img
                  src={img}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <ImageOff className="w-5 h-5 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex items-start gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: getPOIColor(category) }} />
                <h3 className="font-medium text-sm leading-tight line-clamp-2">{(poi.metadata as any)?.translations?.[i18n.language.split('-')[0]]?.name || poi.name}</h3>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{t(`beInspired.map.category.${category}`, category)}</span>
                {poi.rating != null && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    {Number(poi.rating).toFixed(1)}
                  </span>
                )}
                {distance && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {distance}
                  </span>
                )}
                {poi.price_range && <span>{poi.price_range}</span>}
              </div>
              {poi.address && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{poi.address}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default POIList;
