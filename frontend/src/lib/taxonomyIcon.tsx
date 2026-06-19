import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";

/**
 * Rendu d'icônes SVG (lucide) pour les taxonomies du module Plan Your Trip.
 * Remplace les emojis stockés en base : on résout dans l'ordre
 *   1) icon_name (nom lucide explicite, éditable par l'admin)
 *   2) mapping par `code` de taxonomie (défauts pertinents)
 *   3) icône de repli (fallback) — JAMAIS d'emoji.
 */

// Mapping code de taxonomie -> nom d'icône lucide (PascalCase).
// Couvre toutes les taxonomies actuelles (budget, activités, hébergement, culinaire).
export const CODE_ICONS: Record<string, string> = {
  // Accessibilité (hébergement)
  accessible_parking: "Accessibility",
  adapted_bathroom: "Bath",
  elevator: "MoveVertical",
  hearing_loop: "Ear",
  visual_signage: "Signpost",
  wheelchair_access: "Accessibility",
  // Ambiance (hébergement)
  business: "Briefcase",
  eco_friendly: "Leaf",
  family_friendly: "Users",
  luxury: "Gem",
  party: "PartyPopper",
  pet_friendly: "PawPrint",
  quiet_relaxing: "Smile",
  romantic: "Heart",
  // Équipements (hébergement)
  ac: "Snowflake",
  breakfast: "Croissant",
  family_rooms: "Users",
  gym: "Dumbbell",
  kitchen: "CookingPot",
  laundry: "WashingMachine",
  non_smoking: "CigaretteOff",
  parking: "SquareParking",
  pets_allowed: "PawPrint",
  pool: "Waves",
  spa: "Flower2",
  wifi: "Wifi",
  // Emplacement (hébergement)
  beach_front: "Umbrella",
  city_center: "Building2",
  countryside: "Trees",
  historic_center: "Landmark",
  near_airport: "Plane",
  near_poi: "MapPin",
  near_public_transport: "TrainFront",
  quiet_neighbourhood: "VolumeX",
  // Sécurité (hébergement)
  "24_7_reception": "Clock",
  neighborhood_safety: "ShieldCheck",
  safe_deposit: "Lock",
  secure_luggage_storage: "Luggage",
  security_cameras: "Cctv",
  smoke_detectors: "Siren",
  // Types d'hébergement
  apartment: "Building",
  bnb: "ConciergeBell",
  camping: "Tent",
  guesthouse: "Home",
  hostel: "BedDouble",
  hotel: "Hotel",
  resort: "Palmtree",
  serviced_apartment: "BriefcaseBusiness",
  // Catégories d'activités
  adventure: "Mountain",
  beach: "Waves",
  culture: "Drama",
  family: "Users",
  gastronomy: "UtensilsCrossed",
  nature: "TreePine",
  nightlife: "Martini",
  photography: "Camera",
  shopping: "ShoppingBag",
  sports: "Trophy",
  wellness: "Flower",
  // Intensité d'activité
  active: "Activity",
  intense: "Zap",
  moderate: "Footprints",
  relaxed: "Coffee",
  // Restrictions alimentaires
  egg_free: "EggOff",
  gluten_free: "WheatOff",
  halal: "Moon",
  kosher: "Star",
  lactose_free: "MilkOff",
  nut_free: "NutOff",
  pescatarian: "Fish",
  shellfish_free: "FishOff",
  vegan: "Sprout",
  vegetarian: "Salad",
  // Catégories de restaurants
  bakery: "Croissant",
  bistro: "Beer",
  cafe: "Coffee",
  fine_dining: "ChefHat",
  food_truck: "Truck",
  market_stall: "Store",
  restaurant: "Utensils",
  vegan_friendly: "Leaf",
  wine_bar: "Wine",
  // Niveaux de budget (codes usuels)
  budget: "PiggyBank",
  economy: "PiggyBank",
  low: "PiggyBank",
  standard: "Wallet",
  mid: "Wallet",
  comfort: "Wallet",
  premium: "Gem",
  luxe: "Gem",
  high: "Gem",
};

/** Retourne le composant lucide pour un nom donné, ou null si introuvable. */
export const getLucideIcon = (name?: string | null) => {
  if (!name) return null;
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  return Icon || null;
};

/** Résout le NOM lucide à utiliser (icon_name prioritaire, puis code). */
export const resolveTaxonomyIconName = (
  iconName?: string | null,
  code?: string | null
): string | null => {
  if (iconName && getLucideIcon(iconName)) return iconName;
  if (code && CODE_ICONS[code]) return CODE_ICONS[code];
  return null;
};

interface TaxonomyIconProps extends LucideProps {
  /** Nom d'icône lucide explicite (champ icon_name en base). */
  iconName?: string | null;
  /** Code de taxonomie (utilisé pour le mapping par défaut). */
  code?: string | null;
  /** Icône de repli (nom lucide) si rien ne correspond. */
  fallback?: string;
}

/**
 * Icône SVG d'une entrée de taxonomie. Ne rend JAMAIS d'emoji.
 */
export const TaxonomyIcon = ({ iconName, code, fallback = "Tag", ...props }: TaxonomyIconProps) => {
  const resolved = resolveTaxonomyIconName(iconName, code);
  const Icon = getLucideIcon(resolved) || getLucideIcon(fallback) || LucideIcons.Tag;
  return <Icon {...props} />;
};

export default TaxonomyIcon;
