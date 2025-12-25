import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sun, Plane, Shield, Heart, Utensils, Gift, MapPin, Bus, Info, Leaf, Calendar, Landmark } from "lucide-react";
import { TransportationAdvice, LocalEvent } from "@/types/trip";

// Section: Pourquoi visiter cette destination
interface WhyVisitSectionProps {
  whyVisit?: string;
  title?: string;
}

export const WhyVisitSection = ({ whyVisit, title }: WhyVisitSectionProps) => {
  if (!whyVisit) return null;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Heart className="h-5 w-5" />
          Pourquoi {title || 'cette destination'} ?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {whyVisit}
        </p>
      </CardContent>
    </Card>
  );
};

// Section: Meilleure période pour visiter
interface BestTimeToVisitSectionProps {
  bestTimeToVisit?: {
    overall?: string;
    byDestination?: Record<string, string>;
    seasons?: {
      spring?: string;
      summer?: string;
      autumn?: string;
      winter?: string;
    };
    avoidPeriods?: string[];
  };
}

export const BestTimeToVisitSection = ({ bestTimeToVisit }: BestTimeToVisitSectionProps) => {
  if (!bestTimeToVisit) return null;

  // Allow a simple string response from the provider
  if (typeof bestTimeToVisit === 'string') {
    bestTimeToVisit = { overall: bestTimeToVisit };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-orange-500" />
          Meilleure période pour visiter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bestTimeToVisit.overall && (
          <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200">
            <p className="font-semibold mb-2 text-orange-900 dark:text-orange-100">Recommandation générale</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{bestTimeToVisit.overall}</p>
          </div>
        )}

        {bestTimeToVisit.byDestination && Object.keys(bestTimeToVisit.byDestination).length > 0 && (
          <div className="space-y-3">
            <p className="font-semibold text-sm">Par destination :</p>
            {Object.entries(bestTimeToVisit.byDestination).map(([destination, period]) => (
              <div key={destination} className="pl-4 border-l-2 border-orange-200">
                <p className="font-medium text-sm">{destination}</p>
                <p className="text-sm text-muted-foreground">{period}</p>
              </div>
            ))}
          </div>
        )}

        {bestTimeToVisit.seasons && (
          <div>
            <p className="font-semibold text-sm mb-3">Par saison :</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {bestTimeToVisit.seasons.spring && (
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                  <p className="font-medium text-sm text-green-900 dark:text-green-100">🌸 Printemps</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{bestTimeToVisit.seasons.spring}</p>
                </div>
              )}
              {bestTimeToVisit.seasons.summer && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                  <p className="font-medium text-sm text-yellow-900 dark:text-yellow-100">☀️ Été</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{bestTimeToVisit.seasons.summer}</p>
                </div>
              )}
              {bestTimeToVisit.seasons.autumn && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                  <p className="font-medium text-sm text-amber-900 dark:text-amber-100">🍂 Automne</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{bestTimeToVisit.seasons.autumn}</p>
                </div>
              )}
              {bestTimeToVisit.seasons.winter && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                  <p className="font-medium text-sm text-blue-900 dark:text-blue-100">❄️ Hiver</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{bestTimeToVisit.seasons.winter}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {bestTimeToVisit.avoidPeriods && bestTimeToVisit.avoidPeriods.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200">
            <p className="font-semibold text-sm text-red-900 dark:text-red-100 mb-2">⚠️ Périodes à éviter :</p>
            <ul className="space-y-1">
              {bestTimeToVisit.avoidPeriods.map((period, idx) => (
                <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{period}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Section: Visa et exigences d'entrée
interface VisaAndEntrySectionProps {
  visaAndEntry?: {
    generalInfo?: string;
    requirements?: string[];
    processingTime?: string;
    cost?: string;
    exemptions?: string[];
    entryRequirements?: string[];
  };
}

export const VisaAndEntrySection = ({ visaAndEntry }: VisaAndEntrySectionProps) => {
  if (!visaAndEntry) return null;

  // Allow a flat string response
  if (typeof visaAndEntry === 'string') {
    visaAndEntry = { generalInfo: visaAndEntry };
  }

  // Normalize lists to arrays
  const toArray = (val?: string | string[]) =>
    val ? (Array.isArray(val) ? val : [val]) : [];
  const requirements = toArray(visaAndEntry.requirements);
  const exemptions = toArray(visaAndEntry.exemptions);
  const entryRequirements = toArray(visaAndEntry.entryRequirements);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-blue-500" />
          Visa & Formalités d'entrée
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visaAndEntry.generalInfo && (
          <p className="text-sm text-muted-foreground">{visaAndEntry.generalInfo}</p>
        )}

        {requirements.length > 0 && (
          <div>
            <p className="font-semibold text-sm mb-2">Exigences :</p>
            <ul className="space-y-1.5">
              {requirements.map((req, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">✓</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {visaAndEntry.processingTime && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Délai de traitement</p>
              <p className="font-medium text-sm mt-1">{visaAndEntry.processingTime}</p>
            </div>
          )}
          {visaAndEntry.cost && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Coût approximatif</p>
              <p className="font-medium text-sm mt-1">{visaAndEntry.cost}</p>
            </div>
          )}
        </div>

        {exemptions.length > 0 && (
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200">
            <p className="font-semibold text-sm text-green-900 dark:text-green-100 mb-2">Pays exemptés de visa :</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{exemptions.join(", ")}</p>
          </div>
        )}

        {entryRequirements.length > 0 && (
          <div>
            <p className="font-semibold text-sm mb-2">Conditions d'entrée :</p>
            <ul className="space-y-1.5">
              {entryRequirements.map((req, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Section: Santé et Sécurité
interface HealthAndSafetySectionProps {
  healthAndSafety?: {
    vaccinations?: string[];
    healthTips?: string[];
    insurance?: string;
    emergencyNumbers?: Record<string, string>;
    safetyTips?: string[];
    waterQuality?: string;
    foodSafety?: string;
  };
}

export const HealthAndSafetySection = ({ healthAndSafety }: HealthAndSafetySectionProps) => {
  if (!healthAndSafety) return null;

  // Allow a flat string response
  if (typeof healthAndSafety === 'string') {
    healthAndSafety = { healthTips: [healthAndSafety] };
  }

  const toArray = (val: any): any[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return [val];
  };

  const vaccinations = toArray(healthAndSafety.vaccinations);
  const healthTips = toArray(healthAndSafety.healthTips);
  const safetyTips = toArray(healthAndSafety.safetyTips);
  const hasContent = [
    vaccinations.length,
    healthTips.length,
    safetyTips.length,
    healthAndSafety.insurance,
    healthAndSafety.emergencyNumbers && Object.keys(healthAndSafety.emergencyNumbers).length,
    healthAndSafety.waterQuality,
    healthAndSafety.foodSafety,
  ].some(Boolean);

  if (!hasContent) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          Santé & Sécurité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {vaccinations.length > 0 && (
          <div>
            <p className="font-semibold text-sm mb-2">💉 Vaccinations :</p>
            <ul className="space-y-1.5">
              {vaccinations.map((vac, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{vac}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {healthTips.length > 0 && (
          <div>
            <p className="font-semibold text-sm mb-2">Conseils santé :</p>
            <ul className="space-y-1.5">
              {healthTips.map((tip, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {healthAndSafety.insurance && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200">
            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">Assurance voyage</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{healthAndSafety.insurance}</p>
          </div>
        )}

        {healthAndSafety.emergencyNumbers && Object.keys(healthAndSafety.emergencyNumbers).length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200">
            <p className="font-semibold text-sm text-red-900 dark:text-red-100 mb-3">🚨 Numéros d'urgence :</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(healthAndSafety.emergencyNumbers).map(([type, number]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{type} :</span>
                  <span className="font-mono font-semibold text-sm">{number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {safetyTips.length > 0 && (
          <div>
            <p className="font-semibold text-sm mb-2">🔒 Conseils sécurité :</p>
            <ul className="space-y-1.5">
              {safetyTips.map((tip, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {healthAndSafety.waterQuality && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">💧 Eau potable</p>
              <p className="text-sm">{healthAndSafety.waterQuality}</p>
            </div>
          )}
          {healthAndSafety.foodSafety && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">🍽️ Alimentation</p>
              <p className="text-sm">{healthAndSafety.foodSafety}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Section: Plats à essayer
interface MustTryDish {
  name: string;
  description?: string;
  whereToFind?: string;
  priceRange?: string;
  dietaryInfo?: string;
}

interface MustTryDishesSectionProps {
  mustTryDishes?: MustTryDish[];
}

export const MustTryDishesSection = ({ mustTryDishes }: MustTryDishesSectionProps) => {
  if (!mustTryDishes || mustTryDishes.length === 0) return null;

  const dishes: MustTryDish[] = mustTryDishes.map((dish) => {
    if (typeof dish === 'string') {
      return { name: dish, description: dish };
    }
    // Normalize whereToFind if object
    if (dish.whereToFind && typeof dish.whereToFind === 'object') {
      const place: any = dish.whereToFind;
      const placeStr = [place.name, place.city, place.country].filter(Boolean).join(', ');
      dish = { ...dish, whereToFind: placeStr || String(place) };
    }
    return dish;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-orange-500" />
          Plats incontournables
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {dishes.map((dish, idx) => (
            <div key={idx} className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4 rounded-lg border border-orange-200">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100">{dish.name}</h4>
                {dish.priceRange && (
                  <Badge variant="secondary" className="text-xs">{dish.priceRange}</Badge>
                )}
              </div>
              {dish.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{dish.description}</p>
              )}
              {dish.whereToFind && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{dish.whereToFind}</span>
                </div>
              )}
              {dish.dietaryInfo && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">{dish.dietaryInfo}</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Section: Idées cadeaux
interface GiftIdea {
  item: string;
  description?: string;
  whereToBuy?: string;
  priceRange?: string;
  tips?: string;
}

interface GiftIdeasSectionProps {
  giftIdeas?: GiftIdea[];
}

export const GiftIdeasSection = ({ giftIdeas }: GiftIdeasSectionProps) => {
  if (!giftIdeas || giftIdeas.length === 0) return null;

  const ideas: GiftIdea[] = giftIdeas.map((gift) => {
    if (typeof gift === 'string') {
      return { item: gift, description: gift };
    }
    if (gift.whereToBuy && typeof gift.whereToBuy === 'object') {
      const place: any = gift.whereToBuy;
      const placeStr = [place.name, place.city, place.country].filter(Boolean).join(', ');
      gift = { ...gift, whereToBuy: placeStr || String(place) };
    }
    return gift;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-pink-500" />
          Idées cadeaux & Souvenirs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {ideas.map((gift, idx) => (
            <div key={idx} className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-pink-200">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-pink-900 dark:text-pink-100">{gift.item}</h4>
                {gift.priceRange && (
                  <Badge variant="secondary" className="text-xs">{gift.priceRange}</Badge>
                )}
              </div>
              {gift.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{gift.description}</p>
              )}
              {gift.whereToBuy && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{gift.whereToBuy}</span>
                </div>
              )}
              {gift.tips && (
                <div className="mt-2 bg-white/50 dark:bg-black/20 p-2 rounded text-xs text-gray-600 dark:text-gray-400">
                  💡 {gift.tips}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Section: Destinations similaires
interface SimilarDestination {
  name: string;
  country?: string;
  why?: string;
  distance?: string;
  bestFor?: string;
}

interface SimilarDestinationsSectionProps {
  similarDestinations?: SimilarDestination[];
}

export const SimilarDestinationsSection = ({ similarDestinations }: SimilarDestinationsSectionProps) => {
  if (!similarDestinations || similarDestinations.length === 0) return null;

  const items: SimilarDestination[] = similarDestinations.map((dest) => {
    if (typeof dest === 'string') {
      return { name: dest };
    }
    if (dest.country && typeof dest.country === 'object') {
      const place: any = dest.country;
      dest = { ...dest, country: [place.name, place.city, place.country].filter(Boolean).join(', ') || String(place) };
    }
    return dest;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-purple-500" />
          Destinations similaires à explorer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((dest, idx) => (
            <div key={idx} className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-purple-200">
              <div className="mb-2">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">{dest.name}</h4>
                {dest.country && (
                  <p className="text-xs text-muted-foreground">{dest.country}</p>
                )}
              </div>
              {dest.why && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{dest.why}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {dest.distance && (
                  <Badge variant="outline" className="text-xs">📍 {dest.distance}</Badge>
                )}
                {dest.bestFor && (
                  <Badge variant="secondary" className="text-xs">✨ {dest.bestFor}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Section: Conseils transport
interface TransportationAdviceSectionProps {
  transportationAdvice?: TransportationAdvice;
}

export const TransportationAdviceSection = ({ transportationAdvice }: TransportationAdviceSectionProps) => {
  if (!transportationAdvice) return null;

  // Normalize string payload
  if (typeof transportationAdvice === 'string') {
    transportationAdvice = { gettingThere: transportationAdvice } as TransportationAdvice;
  }

  const toText = (val: any) => {
    if (!val) return '';
    if (typeof val === 'object') {
      const o: any = val;
      return [o.name, o.city, o.country].filter(Boolean).join(', ') || JSON.stringify(o);
    }
    return String(val);
  };

  const tipsArray = Array.isArray(transportationAdvice.tips)
    ? transportationAdvice.tips
    : transportationAdvice.tips
      ? [transportationAdvice.tips]
      : [];

  const lt = transportationAdvice.localTransport || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bus className="h-5 w-5 text-blue-500" />
          Transports & Déplacements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {transportationAdvice.gettingThere && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200">
            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">✈️ Comment s'y rendre :</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{toText(transportationAdvice.gettingThere)}</p>
          </div>
        )}

        {transportationAdvice.localTransport && (
          <div>
            <p className="font-semibold text-sm mb-3">🚇 Transports locaux :</p>
            <div className="grid gap-3">
              {lt.metro && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">🚇</span>
                  <div>
                    <p className="font-medium text-sm">Métro</p>
                    <p className="text-sm text-muted-foreground">{toText(lt.metro)}</p>
                  </div>
                </div>
              )}
              {lt.bus && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">🚌</span>
                  <div>
                    <p className="font-medium text-sm">Bus</p>
                    <p className="text-sm text-muted-foreground">{toText(lt.bus)}</p>
                  </div>
                </div>
              )}
              {lt.taxi && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">🚕</span>
                  <div>
                    <p className="font-medium text-sm">Taxi & VTC</p>
                    <p className="text-sm text-muted-foreground">{toText(lt.taxi)}</p>
                  </div>
                </div>
              )}
              {lt.bike && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">🚲</span>
                  <div>
                    <p className="font-medium text-sm">Vélos</p>
                    <p className="text-sm text-muted-foreground">{toText(lt.bike)}</p>
                  </div>
                </div>
              )}
              {lt.walking && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xl">🚶</span>
                  <div>
                    <p className="font-medium text-sm">À pied</p>
                    <p className="text-sm text-muted-foreground">{toText(lt.walking)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {transportationAdvice.transportCards && (
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200">
            <p className="font-semibold text-sm text-green-900 dark:text-green-100 mb-1">🎫 Cartes de transport</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{toText(transportationAdvice.transportCards)}</p>
          </div>
        )}

        {tipsArray.length > 0 && (
          <div>
            <p className="font-semibold text-sm mb-2">💡 Conseils pratiques :</p>
            <ul className="space-y-1.5">
              {tipsArray.map((tip, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{toText(tip)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Section: Incontournables à voir
interface MustSeeSectionProps {
  mustSee?: string[];
  title?: string;
}

export const MustSeeSection = ({ mustSee, title }: MustSeeSectionProps) => {
  if (!mustSee || mustSee.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          Incontournables {title ? `à ${title}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {mustSee.map((item, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

// Section: Conseils culturels
interface CulturalTipsSectionProps {
  culturalTips?: string[];
}

export const CulturalTipsSection = ({ culturalTips }: CulturalTipsSectionProps) => {
  if (!culturalTips || culturalTips.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-indigo-500" />
          Conseils culturels & Coutumes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {culturalTips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200">
              <span className="text-indigo-500 mt-0.5">✓</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">{tip}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Section: Événements locaux
interface LocalEventsSectionProps {
  localEvents?: LocalEvent[];
}

export const LocalEventsSection = ({ localEvents }: LocalEventsSectionProps) => {
  if (!localEvents || localEvents.length === 0) return null;

  const events = localEvents.map((event) => {
    if (typeof event === 'string') {
      return { name: event, description: event };
    }
    if (event.location && typeof event.location === 'object') {
      const place: any = event.location;
      event = {
        ...event,
        location: [place.name, place.city, place.country].filter(Boolean).join(', ') || String(place),
      };
    }
    return event;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-500" />
          Événements & Festivals locaux
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event, idx) => (
            <div key={idx} className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <h4 className="font-semibold text-sm">{event.name}</h4>
                </div>
                {event.date && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {event.date}
                  </Badge>
                )}
              </div>
              {event.description && (
                <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
              )}
              {event.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Section: Conseils durabilité
interface SustainabilityTipsSectionProps {
  sustainabilityTips?: string[];
}

export const SustainabilityTipsSection = ({ sustainabilityTips }: SustainabilityTipsSectionProps) => {
  if (!sustainabilityTips || sustainabilityTips.length === 0) return null;

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
          <Leaf className="h-5 w-5 text-green-500" />
          Voyage éco-responsable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {sustainabilityTips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-green-500 mt-0.5">🌱</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
