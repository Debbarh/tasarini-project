import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Phone, Globe, Navigation, Plus, Route, MessageCircle, Lightbulb, Loader2, Compass, Banknote, Clock, Share2, PencilLine, BadgeCheck, Flag } from "lucide-react";
import { getOpenState, formatMinutes } from "@/utils/openingHours";
import { renderToStaticMarkup } from "react-dom/server";
import { getLucideIcon } from "@/lib/taxonomyIcon";
import { POI, getPOIsInRadius, getExternalPOIs, importExternalPOI, getPOIImage, getPOIEnrichment, translatePOI, categorizePOI, getPOIIcon, getPOIColor, getPoiType, POIFilters } from "@/services/poiService";
import { getLocalizedLabel } from "@/utils/multilingualHelpers";

// Génère le balisage SVG d'une icône lucide pour l'injecter dans un divIcon Leaflet
// (les marqueurs sont du HTML, pas du JSX → on rend l'icône en chaîne SVG).
const lucideMarkerSvg = (name: string, size = 16, color = "white") => {
  const Icon = getLucideIcon(name) || MapPin;
  return renderToStaticMarkup(<Icon width={size} height={size} color={color} strokeWidth={2.5} />);
};

// Échappe le texte injecté dans le HTML brut des popups Leaflet.
const escapeHtml = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Charge une feuille CSS une seule fois (CDN).
const loadCssOnce = (href: string) => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

// Charge un script une seule fois et résout quand il est prêt (CDN).
const loadScriptOnce = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any)._loaded) resolve();
      else existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => { (s as any)._loaded = true; resolve(); };
    s.onerror = () => reject(new Error(`script load failed: ${src}`));
    document.head.appendChild(s);
  });

// Plugin de clustering (markercluster) — chargé en CDN après Leaflet.
const MARKERCLUSTER_CSS = [
  "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
  "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css",
];
const MARKERCLUSTER_JS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";

// Première image disponible d'un POI (plateforme: media_images; externe: metadata.images).
const poiImageUrl = (p: POI): string =>
  p.media_images?.[0] || (p.metadata as any)?.images?.[0] || "";

// Palette moderne par catégorie : dégradé [clair → foncé].
const POI_GRADIENT: Record<string, [string, string]> = {
  restaurant: ["#fb7185", "#f43f5e"],
  accommodation: ["#34d399", "#10b981"],
  activity: ["#60a5fa", "#2563eb"],
  tourist: ["#a78bfa", "#7c3aed"],
  other: ["#94a3b8", "#64748b"],
};

// Construit l'icône d'un marqueur POI : pin moderne en dégradé avec pictogramme blanc,
// agrandi + halo quand survolé/sélectionné. className:'' évite le carré blanc bordé
// par défaut de Leaflet (.leaflet-div-icon) qui apparaissait derrière le marqueur.
const buildPoiDivIcon = (L: any, poi: POI, highlighted: boolean) => {
  const category = categorizePOI(poi);
  const [c1, c2] = POI_GRADIENT[category] || POI_GRADIENT.other;
  const head = highlighted ? 38 : 30;
  const h = Math.round(head * 1.32);
  const tail = Math.round(head * 0.42);
  const icon = lucideMarkerSvg(getPOIIcon(category), highlighted ? 18 : 15, "#ffffff");
  const glow = highlighted
    ? `0 0 0 4px ${c2}40, 0 6px 16px ${c2}80`
    : `0 4px 10px ${c2}55, 0 2px 4px rgba(0,0,0,.2)`;
  const z = highlighted ? "z-index:1000;" : "";
  const html = `
    <div style="position:relative; width:${head}px; height:${h}px; ${z}">
      <div style="position:absolute; left:50%; top:${Math.round(head * 0.6)}px; transform:translateX(-50%) rotate(45deg); width:${tail}px; height:${tail}px; background:${c2}; border-radius:0 0 3px 0;"></div>
      <div style="position:absolute; top:0; left:0; width:${head}px; height:${head}px; background:linear-gradient(135deg, ${c1}, ${c2}); border:2.5px solid #fff; border-radius:50%; box-shadow:${glow}; display:flex; align-items:center; justify-content:center; cursor:pointer;">${icon}</div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [head, h],
    iconAnchor: [Math.round(head / 2), h],
    popupAnchor: [0, -h + 4],
  });
};
import { POIFavoriteButton } from "./POIFavoriteButton";
import { CreateItineraryDialog } from "./CreateItineraryDialog";
import { POIReviews } from "./POIReviews";
import { POIClaimDialog } from "./POIClaimDialog";
import { POISuggestDialog } from "./POISuggestDialog";
import { POIReportDialog } from "./POIReportDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface InteractiveInspireMapProps {
  centerLat?: number;
  centerLon?: number;
  radiusKm?: number;
  filters?: POIFilters;
  onPOISelect?: (poi: POI) => void;
  onPOICountChange?: (count: number) => void;
  onLoadingChange?: (loading: boolean) => void;
  // Toggle "sources étendues" contrôlé par le parent (déplacé hors de la carte).
  includeExternal?: boolean;
  // Synchronisation carte <-> vue liste
  onVisiblePOIsChange?: (pois: POI[]) => void;  // POI dans le cadre actuel
  onPOIHover?: (id: string | null) => void;     // survol d'un marqueur -> parent
  hoveredPOIId?: string | null;                 // survol d'une carte liste -> highlight marqueur
  focusPOIId?: string | null;                   // clic sur une carte liste -> ouvre la fiche + recentre
  categoryFilter?: string | null;               // chip thématique (restaurant|activity|tourist|accommodation)
}

export const InteractiveInspireMap = ({
  centerLat = 48.8566,
  centerLon = 2.3522,
  radiusKm = 30,
  filters,
  onPOISelect,
  onPOICountChange,
  onLoadingChange,
  includeExternal = true,
  onVisiblePOIsChange,
  onPOIHover,
  hoveredPOIId = null,
  focusPOIId = null,
  categoryFilter = null,
}: InteractiveInspireMapProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  // Callbacks parent passés par ref : sinon (non mémorisés côté parent) ils changent
  // d'identité à chaque rendu et relancent en boucle l'effet de chargement des POI.
  const onPOISelectRef = useRef(onPOISelect);
  onPOISelectRef.current = onPOISelect;
  const onPOICountChangeRef = useRef(onPOICountChange);
  onPOICountChangeRef.current = onPOICountChange;
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;
  const onVisiblePOIsChangeRef = useRef(onVisiblePOIsChange);
  onVisiblePOIsChangeRef.current = onVisiblePOIsChange;
  const onPOIHoverRef = useRef(onPOIHover);
  onPOIHoverRef.current = onPOIHover;
  const markersById = useRef<Record<string, any>>({});
  const poisRef = useRef<POI[]>([]);
  const categoryFilterRef = useRef<string | null>(categoryFilter);
  categoryFilterRef.current = categoryFilter;
  const clusterGroupRef = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lon: number }>({
    lat: centerLat,
    lon: centerLon,
  });
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [selectedPOIs, setSelectedPOIs] = useState<POI[]>([]); // Pour l'itinéraire
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [detailImage, setDetailImage] = useState<string | null>(null);
  const [detailDescription, setDetailDescription] = useState<string>('');
  const [imgError, setImgError] = useState(false);        // image principale cassée → repli enrichissement
  const [fallbackFailed, setFallbackFailed] = useState(false); // l'image de repli a aussi échoué
  const [poiTrans, setPoiTrans] = useState<{ name?: string; description?: string; address?: string } | null>(null);
  // Dialogue de contribution contrôlé (rouvrable après connexion).
  const [contribDialog, setContribDialog] = useState<{ action: 'suggest' | 'claim' | 'report'; poi: POI } | null>(null);
  const restoredPendingRef = useRef(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const markers = useRef<any[]>([]);
  const circleRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const hasRequestedLocation = useRef(false);

  // Charger Leaflet dynamiquement
  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;

      try {
        // @ts-ignore
        const L = (await import('leaflet')).default;
        (window as any).L = L; // markercluster s'attache à window.L

        // Importer les styles CSS une seule fois
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        // Plugin clustering (CDN) — chargé après Leaflet.
        MARKERCLUSTER_CSS.forEach(loadCssOnce);
        try { await loadScriptOnce(MARKERCLUSTER_JS); } catch (e) { console.warn('markercluster KO', e); }

        if (!mapRef.current) return;

        // Vérifier si le conteneur est déjà initialisé
        const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
        if (container._leaflet_id) {
          return; // Carte déjà initialisée
        }

        // Initialiser la carte — zoom en bas à gauche (libère le coin sup. des marqueurs)
        const mapInstance = L.map(mapRef.current, { zoomControl: false }).setView([currentCenter.lat, currentCenter.lon], 12);
        L.control.zoom({ position: 'bottomleft' }).addTo(mapInstance);

        // Ajouter les tuiles
        // Fond de carte moderne et épuré (CartoDB Voyager).
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 20,
          attribution: '© OpenStreetMap © CARTO'
        }).addTo(mapInstance);

        // Ajouter un cercle pour visualiser le rayon
        circleRef.current = L.circle([currentCenter.lat, currentCenter.lon], {
          color: 'hsl(var(--primary))',
          fillColor: 'hsl(var(--primary))',
          fillOpacity: 0.1,
          radius: radiusKm * 1000
        }).addTo(mapInstance);

        // Marker du centre
        const centerIcon = L.divIcon({
          html: `<div style="background: hsl(var(--primary)); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${lucideMarkerSvg('MapPin', 18)}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          className: '',
        });

        centerMarkerRef.current = L.marker([currentCenter.lat, currentCenter.lon], { icon: centerIcon })
          .addTo(mapInstance)
          .bindPopup(t('beInspired.map.searchCenter', 'Centre de recherche'));

        // Groupe de clustering (si le plugin a chargé) — sinon fallback layerGroup simple.
        clusterGroupRef.current = (L as any).markerClusterGroup
          ? (L as any).markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 50, spiderfyOnMaxZoom: true, showCoverageOnHover: false })
          : L.layerGroup();
        mapInstance.addLayer(clusterGroupRef.current);

        setMap(mapInstance);

      } catch (error) {
        console.error('Erreur lors du chargement de Leaflet:', error);
        toast.error(t('beInspired.map.mapLoadError', 'Impossible de charger la carte'));
      }
    };

    loadLeaflet();

    // Cleanup function
    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
      circleRef.current = null;
      centerMarkerRef.current = null;
    };
  }, []);

  // Synchroniser le centre interne si les props changent
  useEffect(() => {
    setCurrentCenter({ lat: centerLat, lon: centerLon });
  }, [centerLat, centerLon]);

  // Mettre à jour la vue et le marqueur quand le centre change
  useEffect(() => {
    if (!map) return;
    // @ts-ignore
    const L = window.L;
    if (!L) return;

    map.setView([currentCenter.lat, currentCenter.lon], map.getZoom() || 12);

    if (circleRef.current) {
      map.removeLayer(circleRef.current);
    }
    circleRef.current = L.circle([currentCenter.lat, currentCenter.lon], {
      color: 'hsl(var(--primary))',
      fillColor: 'hsl(var(--primary))',
      fillOpacity: 0.1,
      radius: radiusKm * 1000,
    }).addTo(map);

    if (centerMarkerRef.current) {
      map.removeLayer(centerMarkerRef.current);
    }
    const centerIcon = L.divIcon({
      html: `<div style="background: hsl(var(--primary)); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${lucideMarkerSvg('MapPin', 18)}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      className: '',
    });
    centerMarkerRef.current = L.marker([currentCenter.lat, currentCenter.lon], { icon: centerIcon })
      .addTo(map)
      .bindPopup(userLocation ? t('beInspired.map.yourPosition', 'Votre position') : t('beInspired.map.searchCenter', 'Centre de recherche'));
  }, [currentCenter, radiusKm, map, userLocation, t]);

  // Charger les POI — résilient : plateforme et externes indépendants, l'un n'échoue
  // pas à cause de l'autre. On affiche la plateforme tout de suite, les externes
  // (plus lents) s'ajoutent ensuite ; état d'erreur explicite si TOUT échoue.
  useEffect(() => {
    let cancelled = false;
    const lat = currentCenter.lat, lon = currentCenter.lon;

    const dedupeMerge = (platform: POI[], external: POI[]) => {
      const ids = new Set(platform.map(p => p.metadata?.external_id).filter(Boolean) as string[]);
      return [...platform, ...external.filter(e => !ids.has(e.metadata?.external_id))];
    };

    const loadPOIs = async () => {
      setLoading(true);
      setLoadError(false);
      onLoadingChangeRef.current?.(true);

      // 1) Plateforme (rapide) — affichée immédiatement.
      let platform: POI[] = [];
      let platformOk = true;
      try {
        platform = await getPOIsInRadius(lat, lon, radiusKm, filters, { ignoreRadius: true });
      } catch (e) {
        platformOk = false;
        console.error('POI plateforme: échec', e);
      }
      if (cancelled) return;
      setPois(platform);
      onPOICountChangeRef.current?.(platform.length);

      // 2) Externes (plus lents) — avec 1 retry si vide (premier appel à froid).
      let external: POI[] = [];
      if (includeExternal) {
        external = await getExternalPOIs(lat, lon, radiusKm);
        if (!cancelled && external.length === 0) {
          external = await getExternalPOIs(lat, lon, radiusKm); // retry (cache chaud après le 1er)
        }
      }
      if (cancelled) return;

      const merged = dedupeMerge(platform, external);
      setPois(merged);
      onPOICountChangeRef.current?.(merged.length);

      // Erreur explicite uniquement si on n'a STRICTEMENT rien et que tout a échoué.
      if (merged.length === 0 && !platformOk && (!includeExternal || external.length === 0)) {
        setLoadError(true);
      } else if (merged.length > 0) {
        toast.success(t('beInspired.map.resultsFound', { count: merged.length, defaultValue: '{{count}} points d\'intérêt trouvés' }));
      }

      setLoading(false);
      onLoadingChangeRef.current?.(false);
    };

    loadPOIs();
    return () => { cancelled = true; };
    // On dépend des coordonnées PRIMITIVES (pas de l'objet currentCenter) : deux
    // recentrages sur les mêmes coordonnées ne déclenchent ainsi qu'UN seul fetch.
    // `reloadKey` permet un retry manuel depuis l'état d'erreur.
  }, [currentCenter.lat, currentCenter.lon, radiusKm, filters, includeExternal, reloadKey]);

  // True si le POI passe le filtre thématique (chip) courant.
  const passesTheme = (poi: POI, theme: string | null) =>
    !theme || categorizePOI(poi) === theme;

  // Émet vers le parent les POI présents dans le cadre actuel ET du thème courant.
  const emitVisiblePOIs = () => {
    if (!map || !onVisiblePOIsChangeRef.current) return;
    try {
      const bounds = map.getBounds();
      const theme = categoryFilterRef.current;
      const visible = poisRef.current.filter(
        p => p.latitude && p.longitude && passesTheme(p, theme) && bounds.contains([Number(p.latitude), Number(p.longitude)])
      );
      onVisiblePOIsChangeRef.current(visible);
    } catch { /* bounds indispo */ }
  };

  // Afficher les POI sur la carte
  useEffect(() => {
    poisRef.current = pois;
    if (!map) return;

    // @ts-ignore
    const L = window.L;
    if (!L) return;

    // Nettoyer les anciens markers (dans le groupe de clusters)
    const cluster = clusterGroupRef.current;
    if (cluster) cluster.clearLayers();
    else markers.current.forEach(marker => map.removeLayer(marker));
    markers.current = [];
    markersById.current = {};

    pois.filter(p => passesTheme(p, categoryFilter)).forEach(poi => {
      if (!poi.latitude || !poi.longitude) return;

      const marker = L.marker([Number(poi.latitude), Number(poi.longitude)], {
        icon: buildPoiDivIcon(L, poi, false),
      })
        .on('click', () => selectPoiTransparently(poi))
        .on('mouseover', () => onPOIHoverRef.current?.(poi.id))
        .on('mouseout', () => onPOIHoverRef.current?.(null));

      // Pas de popup Leaflet : le clic ouvre directement la fiche détaillée
      // (on évite d'afficher deux tuiles en même temps).
      if (cluster) cluster.addLayer(marker);
      else marker.addTo(map);
      markers.current.push(marker);
      markersById.current[poi.id] = marker;
    });

    emitVisiblePOIs();
    map.on('moveend', emitVisiblePOIs);
    return () => { map.off('moveend', emitVisiblePOIs); };
  }, [map, pois, categoryFilter]);

  // Highlight du marqueur survolé/sélectionné depuis la liste (sans tout reconstruire).
  useEffect(() => {
    // @ts-ignore
    const L = window.L;
    if (!L) return;
    const activeId = hoveredPOIId || selectedPOI?.id || null;
    Object.entries(markersById.current).forEach(([id, marker]) => {
      const poi = poisRef.current.find(p => p.id === id);
      if (poi) (marker as any).setIcon(buildPoiDivIcon(L, poi, id === activeId));
    });
  }, [hoveredPOIId, selectedPOI]);

  // Clic sur une carte de la liste : ouvre la fiche + recentre la carte sur le POI
  // (en dégroupant le cluster si le marqueur y est caché).
  useEffect(() => {
    if (!focusPOIId || !map) return;
    const poi = poisRef.current.find(p => p.id === focusPOIId);
    if (poi && poi.latitude && poi.longitude) {
      const marker = markersById.current[focusPOIId];
      const cluster = clusterGroupRef.current;
      if (marker && cluster?.zoomToShowLayer) {
        cluster.zoomToShowLayer(marker, () => {}); // dégroupe le cluster pour révéler le marqueur
      } else {
        map.panTo([Number(poi.latitude), Number(poi.longitude)]);
      }
      selectPoiTransparently(poi);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPOIId]);

  // Persiste un POI externe en base (import à la volée) et le remplace partout par
  // sa version persistée (vrai UUID). Renvoie le POI utilisable, ou null si échec.
  const persistIfExternal = async (poi: POI): Promise<POI | null> => {
    if (!poi.is_external) return poi;
    setImportingId(poi.id);
    try {
      const saved = await importExternalPOI(poi);
      setPois(prev => prev.map(p => (p.id === poi.id ? saved : p)));
      setSelectedPOI(prev => (prev && prev.id === poi.id ? saved : prev));
      return saved;
    } catch (error: any) {
      console.error('Import POI externe échoué:', error);
      toast.error(t('beInspired.map.loginToSave', 'Connectez-vous pour enregistrer ce lieu.'));
      return null;
    } finally {
      setImportingId(null);
    }
  };

  // Sélection : on ouvre simplement le détail. On NE persiste PLUS au clic (évite
  // de polluer la base au moindre survol/clic) : un POI externe n'est importé que
  // lors d'une action réelle (favori, avis, itinéraire, suggestion, revendication)
  // via persistIfExternal / ensureSelectedPersisted (import à la demande, idempotent).
  const selectPoiTransparently = async (poi: POI) => {
    setSelectedPOI(poi);
    onPOISelectRef.current?.(poi);
  };

  // Importe à la demande le POI sélectionné s'il est externe, et renvoie son UUID
  // réel (ou null si non connecté / échec). Utilisé par les boutons favori/avis.
  const ensureSelectedPersisted = async (): Promise<string | null> => {
    if (!selectedPOI) return null;
    const saved = await persistIfExternal(selectedPOI);
    if (saved) { onPOISelectRef.current?.(saved); return saved.id; }
    return null;
  };

  // Contribuer (suggérer/revendiquer). Visible même déconnecté : si non connecté,
  // on garde l'intention et on redirige vers /auth ; sinon on ouvre le dialogue.
  const requestContribution = async (action: 'suggest' | 'claim' | 'report', poi: POI) => {
    if (!userRef.current) {
      try { sessionStorage.setItem('tasarini_inspire_pending', JSON.stringify({ action, poi })); } catch { /* quota */ }
      window.location.href = `/auth?redirectTo=${encodeURIComponent('/inspire')}`;
      return;
    }
    const persisted = await persistIfExternal(poi); // import si POI externe (UUID requis)
    if (persisted) setContribDialog({ action, poi: persisted });
  };

  // Restauration de l'intention après connexion/inscription (retour sur /inspire).
  useEffect(() => {
    if (restoredPendingRef.current || !user) return;
    let raw: string | null = null;
    try { raw = sessionStorage.getItem('tasarini_inspire_pending'); } catch { /* */ }
    if (!raw) return;
    restoredPendingRef.current = true;
    try { sessionStorage.removeItem('tasarini_inspire_pending'); } catch { /* */ }
    let pending: any = null;
    try { pending = JSON.parse(raw); } catch { return; }
    if (!pending?.poi || !['suggest', 'claim', 'report'].includes(pending.action)) return;
    if (pending.poi.latitude && pending.poi.longitude) {
      setCurrentCenter({ lat: Number(pending.poi.latitude), lon: Number(pending.poi.longitude) });
    }
    (async () => {
      const persisted = await persistIfExternal(pending.poi);
      if (persisted) { setSelectedPOI(persisted); setContribDialog({ action: pending.action, poi: persisted }); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fonctions pour l'itinéraire
  const handleAddToItinerary = async (poi: POI) => {
    const persisted = await persistIfExternal(poi);
    if (!persisted) return;

    if (selectedPOIs.find(p => p.id === persisted.id)) {
      toast.info(t('beInspired.map.alreadyInItinerary', 'Ce point d\'intérêt est déjà dans votre itinéraire'));
      return;
    }

    setSelectedPOIs(prev => [...prev, persisted]);
    toast.success(t('beInspired.map.addedToItinerary', { name: persisted.name, defaultValue: '{{name}} ajouté à votre itinéraire !' }));
  };

  const handleRemoveFromItinerary = (poiId: string) => {
    setSelectedPOIs(prev => prev.filter(p => p.id !== poiId));
  };

  // Partage natif (Web Share API) avec repli copie du lien Google Maps.
  const handleShare = async (poi: POI) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}`;
    const shareData = { title: poi.name, text: poi.name, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch { /* annulé par l'utilisateur */ }
    try {
      await navigator.clipboard.writeText(`${poi.name} — ${url}`);
      toast.success(t('beInspired.map.linkCopied', 'Lien copié dans le presse-papiers'));
    } catch {
      toast.error(t('beInspired.map.shareError', 'Impossible de partager ce lieu'));
    }
  };

  const handleItineraryCreated = () => {
    setSelectedPOIs([]);
    toast.success(t('beInspired.map.itineraryCreated', 'Votre itinéraire a été créé !'));
  };

  // Obtenir la localisation de l'utilisateur
  const getUserLocation = () => {
    setGeoError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLocation({ lat, lon });
          setCurrentCenter({ lat, lon });
          toast.success(t('beInspired.map.positionUpdated', 'Position mise à jour'));
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          const message = error?.code === 1
            ? t('beInspired.map.geoDenied', 'Accès à la localisation refusé par le navigateur. Activez la géolocalisation pour centrer la carte.')
            : error?.code === 2
              ? t('beInspired.map.geoUnavailable', 'Service de localisation indisponible. Vérifiez vos paramètres réseau ou essayez plus tard.')
              : t('beInspired.map.geoError', 'Impossible d\'obtenir votre position. Vérifiez vos paramètres navigateur.');
          setGeoError(message);
          toast.error(message);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 600000,
        }
      );
    } else {
      toast.error(t('beInspired.map.geoNotSupported', 'Géolocalisation non supportée'));
    }
  };

  // Récupérer automatiquement la position utilisateur à l'ouverture de la carte
  useEffect(() => {
    if (map && !hasRequestedLocation.current) {
      hasRequestedLocation.current = true;
      getUserLocation();
    }
  }, [map]);

  // Enrichissement à la demande : description (OpenTripMap/Wikipédia) + image
  // (OpenTripMap puis repli Wikimedia Commons) pour un POI sans desc/photo.
  useEffect(() => {
    setDetailImage(null);
    setDetailDescription('');
    setImgError(false);
    setFallbackFailed(false);
    if (!selectedPOI) return;
    let cancelled = false;
    const needDesc = !selectedPOI.description;
    const needImg = !poiImageUrl(selectedPOI);
    if (!needDesc && !needImg) return;
    (async () => {
      let gotImage = false;
      const enr = await getPOIEnrichment(
        selectedPOI.name, Number(selectedPOI.latitude), Number(selectedPOI.longitude), i18n.language,
      );
      if (cancelled) return;
      if (needDesc && enr.description) setDetailDescription(enr.description);
      if (needImg && enr.image) { gotImage = true; setDetailImage(enr.image); }
      if (needImg && !gotImage) {
        const url = await getPOIImage([selectedPOI.name, selectedPOI.address].filter(Boolean).join(' '));
        if (!cancelled && url) setDetailImage(url);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPOI?.id]);

  // Repli : si l'image PRINCIPALE du POI est cassée (404/hotlink bloqué), on va
  // chercher une image d'enrichissement (OpenTripMap/Wikimedia) pour ne pas laisser
  // la fiche sans photo.
  useEffect(() => {
    if (!imgError || !selectedPOI || detailImage) return;
    let cancelled = false;
    (async () => {
      const enr = await getPOIEnrichment(
        selectedPOI.name, Number(selectedPOI.latitude), Number(selectedPOI.longitude), i18n.language,
      );
      if (cancelled) return;
      if (enr.image) { setDetailImage(enr.image); return; }
      const url = await getPOIImage([selectedPOI.name, selectedPOI.address].filter(Boolean).join(' '));
      if (!cancelled && url) setDetailImage(url);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgError, selectedPOI?.id]);

  // Traduction à la demande du POI sélectionné (nom/description/adresse) dans la langue UI.
  // Le backend met en cache → 1 seule traduction par POI/langue. On part d'une éventuelle
  // traduction déjà en cache dans metadata.translations.
  useEffect(() => {
    setPoiTrans(null);
    if (!selectedPOI) return;
    const lang = (i18n.language || 'fr').split('-')[0];
    const cached = (selectedPOI.metadata as any)?.translations?.[lang];
    if (cached) { setPoiTrans(cached); return; }
    let cancelled = false;
    (async () => {
      const tr = await translatePOI(selectedPOI.id, lang);
      if (!cancelled && tr && (tr.name || tr.description || tr.address)) setPoiTrans(tr);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPOI?.id, i18n.language]);

  return (
    <div className="relative w-full h-full">
      {/* Carte */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg border z-0" 
        style={{ minHeight: '500px' }}
      />

      {/* "Ma position" — en bas à gauche, au-dessus du zoom Leaflet (libère les marqueurs) */}
      <div className="absolute bottom-[5.5rem] left-2 z-[1000]">
        <Button
          onClick={getUserLocation}
          size="sm"
          className="bg-white/90 hover:bg-white text-gray-700 border border-gray-300 shadow-lg"
        >
          <Navigation className="w-4 h-4 mr-2" />
          {t('beInspired.map.myPosition', 'Ma position')}
        </Button>
      </div>

      {/* "Créer itinéraire" — contextuel, en haut à droite */}
      {selectedPOIs.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000]">
          <CreateItineraryDialog
            selectedPOIs={selectedPOIs}
            onPOIRemove={handleRemoveFromItinerary}
            onItineraryCreated={handleItineraryCreated}
          >
            <Button size="sm" className="bg-primary/90 hover:bg-primary text-white shadow-lg">
              <Route className="w-4 h-4 mr-2" />
              {t('beInspired.map.createItinerary', { count: selectedPOIs.length, defaultValue: 'Créer itinéraire ({{count}})' })}
            </Button>
          </CreateItineraryDialog>
        </div>
      )}

      {/* Alerte géolocalisation */}
      {geoError && (
        <div className="absolute top-16 left-4 z-20 max-w-sm bg-white text-gray-800 border border-gray-200 shadow-lg rounded-md p-3 space-y-2">
          <p className="text-sm font-semibold">{t('beInspired.map.geoPanel.title', 'Autoriser la géolocalisation')}</p>
          <p className="text-xs text-gray-600">{geoError}</p>
          <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
            <li>{t('beInspired.map.geoPanel.b1', 'Vérifiez que votre navigateur autorise la localisation sur ce site.')}</li>
            <li>{t('beInspired.map.geoPanel.b2', "Si bloqué, cliquez sur l'icône cadenas ou le picto de localisation pour l'activer.")}</li>
            <li>{t('beInspired.map.geoPanel.b3', 'Vous pouvez aussi saisir manuellement un lieu dans les filtres.')}</li>
          </ul>
          <Button size="xs" variant="outline" onClick={getUserLocation}>
            {t('beInspired.map.retry', 'Réessayer')}
          </Button>
        </div>
      )}

      {/* Indicateur de chargement */}
      {loading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm">{t('beInspired.map.loading', "Chargement des points d'intérêt...")}</p>
          </div>
        </div>
      )}

      {/* État d'erreur explicite (au lieu d'un faux "0 résultat") */}
      {!loading && loadError && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20 p-4">
          <div className="bg-white p-5 rounded-lg shadow-lg text-center max-w-xs">
            <p className="text-sm font-medium mb-1">{t('beInspired.map.loadFailedTitle', 'Chargement impossible')}</p>
            <p className="text-xs text-muted-foreground mb-3">{t('beInspired.map.loadFailedDesc', 'Le service met du temps à répondre. Réessayez dans un instant.')}</p>
            <Button size="sm" onClick={() => setReloadKey(k => k + 1)}>
              <Loader2 className="w-4 h-4 mr-2" /> {t('beInspired.map.retry', 'Réessayer')}
            </Button>
          </div>
        </div>
      )}

      {/* Compteur de POI */}
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="outline" className="bg-white/90 shadow-lg transition-all">
          {t('beInspired.map.resultsFound', { count: pois.filter(p => passesTheme(p, categoryFilter)).length, defaultValue: "{{count}} points d'intérêt trouvés" })}
        </Badge>
      </div>

      {/* Aide — clic simple ouvre la fiche (le double-clic reste un raccourci) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-xs text-gray-600 bg-white/90 px-2 py-1 rounded shadow-lg flex items-center gap-1 max-w-[90%]">
        <Lightbulb className="w-3 h-3 shrink-0" /> {t('beInspired.map.clickHint', 'Cliquez sur un lieu pour voir sa fiche')}
      </div>

      {/* Panel détails POI sélectionné — tuile enrichie */}
      {selectedPOI && (
        <Card className="absolute bottom-4 right-4 z-10 w-80 max-h-[78%] overflow-y-auto animate-fade-in shadow-lg bg-white">
          <CardContent className="p-0">
            {(() => {
              const primary = poiImageUrl(selectedPOI);
              const usePrimary = !imgError && !!primary;
              const src = usePrimary ? primary : (detailImage || '');
              if (!src || fallbackFailed) return null;
              return (
                <img
                  src={src}
                  alt={selectedPOI.name}
                  loading="lazy"
                  className="w-full h-32 object-cover"
                  onError={() => { if (usePrimary) setImgError(true); else setFallbackFailed(true); }}
                />
              );
            })()}
            <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg leading-tight">{poiTrans?.name || selectedPOI.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getPOIColor(categorizePOI(selectedPOI)) }} />
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const type = getPoiType(selectedPOI);
                        return type
                          ? t(`beInspired.map.type.${type}`, type)
                          : t(`beInspired.map.category.${categorizePOI(selectedPOI)}`, categorizePOI(selectedPOI));
                      })()}
                    </span>
                  </span>
                  {(() => {
                    const oh = (selectedPOI as any).opening_hours || selectedPOI.metadata?.opening_hours;
                    const st = getOpenState(oh);
                    if (st.state === 'open') {
                      return (
                        <Badge variant="outline" className="gap-1 border-green-500 text-green-700 dark:text-green-400 text-[10px]">
                          <Clock className="w-3 h-3" />
                          {st.untilMin != null
                            ? t('beInspired.map.openUntil', { time: formatMinutes(st.untilMin), defaultValue: "Ouvert · ferme à {{time}}" })
                            : t('beInspired.map.open', 'Ouvert')}
                        </Badge>
                      );
                    }
                    if (st.state === 'closed') {
                      return (
                        <Badge variant="outline" className="gap-1 border-red-500 text-red-700 dark:text-red-400 text-[10px]">
                          <Clock className="w-3 h-3" />
                          {st.openAtMin != null
                            ? t('beInspired.map.opensAt', { time: formatMinutes(st.openAtMin), defaultValue: "Fermé · ouvre à {{time}}" })
                            : t('beInspired.map.closed', 'Fermé')}
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {importingId === selectedPOI.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                <POIReviews touristPointId={selectedPOI.id} onActivate={ensureSelectedPersisted}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover-scale" aria-label={t('beInspired.map.reviews', 'Avis')} title={t('beInspired.map.reviews', 'Avis')}>
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </POIReviews>
                <POIFavoriteButton touristPointId={selectedPOI.id} onActivate={ensureSelectedPersisted} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover-scale"
                  onClick={() => handleShare(selectedPOI)}
                  aria-label={t('beInspired.map.share', 'Partager')}
                  title={t('beInspired.map.share', 'Partager')}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {(poiTrans?.description || selectedPOI.description || detailDescription) && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-4">
                {poiTrans?.description || selectedPOI.description || detailDescription}
              </p>
            )}
            
            {(() => {
              const tarif = getLocalizedLabel((selectedPOI as any).budget_level, i18n.language) || selectedPOI.price_range || '';
              return (selectedPOI.distance != null || tarif) ? (
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                    {selectedPOI.distance != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Compass className="w-4 h-4" />
                        {selectedPOI.distance < 1
                          ? `${Math.round(selectedPOI.distance * 1000)} m`
                          : `${selectedPOI.distance.toFixed(1)} km`}
                      </span>
                    )}
                    {tarif && (
                      <span className="inline-flex items-center gap-1.5">
                        <Banknote className="w-4 h-4" />
                        <span className="text-muted-foreground">{t('beInspired.map.priceLabel', 'Tarif')} :</span> {tarif}
                      </span>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
            <div className="space-y-2 text-sm">
              {selectedPOI.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPOI.latitude},${selectedPOI.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:text-primary transition-colors"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="break-words">{poiTrans?.address || selectedPOI.address}</span>
                </a>
              )}

              {selectedPOI.rating != null && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{Number(selectedPOI.rating).toFixed(1)}/5 ({t('beInspired.map.reviewsCount', { count: selectedPOI.review_count || 0, defaultValue: '{{count}} avis' })})</span>
                </div>
              )}

              {selectedPOI.contact_phone && (
                <a href={`tel:${selectedPOI.contact_phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedPOI.contact_phone}</span>
                </a>
              )}

              {selectedPOI.website_url && (
                <a
                  href={selectedPOI.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{t('beInspired.map.website', 'Site web')}</span>
                </a>
              )}

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPOI.latitude},${selectedPOI.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Navigation className="w-4 h-4" />
                <span>{t('beInspired.map.directions', 'Itinéraire')}</span>
              </a>
            </div>
            
            {selectedPOI.tags && selectedPOI.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {selectedPOI.tags.slice(0, 4).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {selectedPOI.tags.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedPOI.tags.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* CTA primaire explicite */}
            <Button
              className="w-full mt-4"
              onClick={() => handleAddToItinerary(selectedPOI)}
              disabled={importingId === selectedPOI.id}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('beInspired.map.addToItinerary', "Ajouter à mon itinéraire")}
            </Button>

            {/* Enrichir / Revendiquer — VISIBLE même déconnecté ; au clic, redirige vers
                /auth en gardant l'intention (restaurée après connexion). */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => requestContribution('suggest', selectedPOI)}>
                <PencilLine className="w-4 h-4 mr-1.5" />
                {t('beInspired.map.suggestImprovement', 'Suggérer')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => requestContribution('claim', selectedPOI)}>
                <BadgeCheck className="w-4 h-4 mr-1.5" />
                {t('beInspired.map.claimPlace', 'Revendiquer')}
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => requestContribution('report', selectedPOI)}>
                <Flag className="w-4 h-4 mr-1.5" />
                {t('beInspired.report.button', 'Signaler')}
              </Button>
            </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogues de contribution contrôlés (rouvrables après connexion) */}
      {contribDialog?.action === 'claim' && (
        <POIClaimDialog
          open
          onOpenChange={(o) => { if (!o) setContribDialog(null); }}
          poiId={contribDialog.poi.id}
          poiName={contribDialog.poi.name}
        />
      )}
      {contribDialog?.action === 'suggest' && (
        <POISuggestDialog
          open
          onOpenChange={(o) => { if (!o) setContribDialog(null); }}
          poi={contribDialog.poi}
        />
      )}
      {contribDialog?.action === 'report' && (
        <POIReportDialog
          open
          onOpenChange={(o) => { if (!o) setContribDialog(null); }}
          poi={contribDialog.poi}
          onReported={() => {
            // POI gelé → le retirer de la carte/liste et fermer la fiche.
            const rid = contribDialog.poi.id;
            setPois(prev => prev.filter(p => p.id !== rid));
            setSelectedPOI(prev => (prev && prev.id === rid ? null : prev));
            setContribDialog(null);
          }}
        />
      )}
    </div>
  );
};
