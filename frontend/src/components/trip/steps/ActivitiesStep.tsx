import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Zap, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { TaxonomyIcon } from "@/lib/taxonomyIcon";
import { TripFormData, ActivityPreferences } from "@/types/trip";
import { useActivitySettings } from "@/hooks/useActivitySettings";
import { getLocalizedDescription, getLocalizedLabel } from "@/utils/multilingualHelpers";

interface ActivitiesStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

const LABEL_FIELDS = ['label_fr', 'label_en', 'label_es', 'label_de', 'label_it', 'label_pt', 'label_ru', 'label_ja', 'label_zh', 'label_hi', 'label_ar'] as const;

type MultilingualEntry = Record<(typeof LABEL_FIELDS)[number], string | undefined> & { code: string };

const matchEntryByValue = <T extends MultilingualEntry>(value: string, entries: T[]) => {
  if (!Array.isArray(entries)) return undefined;
  return entries.find((entry) => {
    if (entry.code === value) return true;
    return LABEL_FIELDS.some((field) => entry[field] && entry[field]?.toLowerCase() === value.toLowerCase());
  });
};

const normalizeArrayValues = <T extends MultilingualEntry>(values: string[], entries: T[]) => {
  if (!Array.isArray(values) || values.length === 0) return [];
  if (!Array.isArray(entries)) return [];
  const normalized: string[] = [];
  values.forEach((value) => {
    const match = matchEntryByValue(value, entries);
    const next = match ? match.code : value;
    if (next && !normalized.includes(next)) {
      normalized.push(next);
    }
  });
  return normalized;
};

const normalizeSingleValue = <T extends MultilingualEntry>(value: string, entries: T[]) => {
  if (!value) return value;
  const match = matchEntryByValue(value, entries);
  return match ? match.code : value;
};

const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
};

const getLabelFromCode = <T extends MultilingualEntry>(code: string, entries: T[], language: string) => {
  const entry = entries.find((item) => item.code === code);
  return getLocalizedLabel(entry, language) || code;
};

export const ActivitiesStep = ({ data, onUpdate, onValidate }: ActivitiesStepProps) => {
  const { t, i18n } = useTranslation();
  const { categories, intensityLevels, interests, avoidances, loading } = useActivitySettings();
  const [preferences, setPreferences] = useState<ActivityPreferences>(() => {
    const defaultPreferences = {
      categories: [],
      intensity: 'moderate',
      interests: [],
      avoidances: []
    };

    if (!data.activityPreferences) {
      return defaultPreferences;
    }

    // Ensure all array fields are actually arrays to prevent "x.map is not a function" errors
    return {
      categories: Array.isArray(data.activityPreferences.categories)
        ? data.activityPreferences.categories
        : [],
      intensity: data.activityPreferences.intensity || 'moderate',
      interests: Array.isArray(data.activityPreferences.interests)
        ? data.activityPreferences.interests
        : [],
      avoidances: Array.isArray(data.activityPreferences.avoidances)
        ? data.activityPreferences.avoidances
        : []
    };
  });
  const [specialRequests, setSpecialRequests] = useState(data.specialRequests || "");
  // Sections facultatives (centres d'intérêt + demandes spéciales) masquées par
  // défaut ; ouvertes si l'utilisateur les avait déjà renseignées.
  const [showOptional, setShowOptional] = useState<boolean>(
    Boolean((data.activityPreferences?.interests?.length) || (data.specialRequests && data.specialRequests.trim().length))
  );

  useEffect(() => {
    if (loading) return;

    setPreferences((prev) => {
      const normalizedCategories = normalizeArrayValues(prev.categories, categories);
      const normalizedInterests = normalizeArrayValues(prev.interests, interests);
      const normalizedAvoidances = normalizeArrayValues(prev.avoidances, avoidances);
      const normalizedIntensity = normalizeSingleValue(prev.intensity, intensityLevels);

      const unchanged =
        arraysEqual(prev.categories, normalizedCategories) &&
        arraysEqual(prev.interests, normalizedInterests) &&
        arraysEqual(prev.avoidances, normalizedAvoidances) &&
        prev.intensity === normalizedIntensity;

      if (unchanged) return prev;

      return {
        ...prev,
        categories: normalizedCategories,
        interests: normalizedInterests,
        avoidances: normalizedAvoidances,
        intensity: normalizedIntensity || prev.intensity,
      };
    });
  }, [loading, categories, intensityLevels, interests, avoidances]);

  useEffect(() => {
    const isValid = preferences.categories.length > 0;
    onValidate(isValid);
    
    if (isValid) {
      onUpdate({ activityPreferences: preferences, specialRequests });
    }
  }, [preferences, specialRequests, onUpdate, onValidate]);

  const updatePreferences = (updates: Partial<ActivityPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const toggleArrayItem = <T extends keyof ActivityPreferences>(
    field: T,
    item: string
  ) => {
    const current = preferences[field];
    // Ensure current is an array before operating on it
    const currentArray = Array.isArray(current) ? current : [];
    const updated = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updatePreferences({ [field]: updated } as Partial<ActivityPreferences>);
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t('planTrip.activitiesStep.loading')}</div>;
  }

  return (
    <div className="space-y-6">

      {/* Activity Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            {t('planTrip.activitiesStep.categories')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.isArray(categories) && categories.map((category) => (
              <Button
                key={category.code}
                variant={preferences.categories.includes(category.code) ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-4 whitespace-normal text-center"
                onClick={() => toggleArrayItem('categories', category.code)}
              >
                <TaxonomyIcon iconName={category.icon_name} code={category.code} className="h-5 w-5" fallback="Activity" />
                <span className="text-xs text-center">
                  {getLabelFromCode(category.code, categories, i18n.language)}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Intensity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            {t('planTrip.activitiesStep.intensity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.isArray(intensityLevels) && intensityLevels.map((level) => (
              <Button
                key={level.code}
                variant={preferences.intensity === level.code ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-4 whitespace-normal text-center"
                onClick={() => updatePreferences({ intensity: level.code })}
              >
                <TaxonomyIcon iconName={level.icon_name} code={level.code} className={`h-6 w-6 ${preferences.intensity === level.code ? 'text-primary-foreground' : 'text-primary'}`} fallback="Activity" />
                <div className="text-center">
                  <div className="font-medium text-sm">
                    {getLabelFromCode(level.code, intensityLevels, i18n.language)}
                  </div>
                  <div className={`text-xs ${preferences.intensity === level.code ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {getLocalizedDescription(level, i18n.language)}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nombre d'activités par jour (optionnel, prioritaire sur l'intensité côté IA) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            {t('planTrip.activitiesStep.perDay', "Activités par jour")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            {t('planTrip.activitiesStep.perDayHint', "Laissez sur « Auto » pour suivre l'intensité choisie, ou fixez un nombre précis.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!preferences.activitiesPerDay ? "default" : "outline"}
              size="sm"
              onClick={() => updatePreferences({ activitiesPerDay: undefined })}
            >
              {t('planTrip.activitiesStep.perDayAuto', "Auto")}
            </Button>
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <Button
                key={n}
                variant={preferences.activitiesPerDay === n ? "default" : "outline"}
                size="sm"
                onClick={() => updatePreferences({ activitiesPerDay: n })}
              >
                {n}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Avoidances (À éviter) — déplacé en 3e position */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('planTrip.activitiesStep.avoidances')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('planTrip.activitiesStep.avoidancesDescription')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Array.isArray(avoidances) && avoidances.map((avoidance) => (
              <div key={avoidance.code} className="flex items-center space-x-2">
                <Checkbox
                  id={`avoidance-${avoidance.code}`}
                  checked={preferences.avoidances.includes(avoidance.code)}
                  onCheckedChange={() => toggleArrayItem('avoidances', avoidance.code)}
                />
                <Label htmlFor={`avoidance-${avoidance.code}`} className="text-sm">
                  {getLabelFromCode(avoidance.code, avoidances, i18n.language)}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sections facultatives (centres d'intérêt + demandes spéciales) — repliées */}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-2 hover:border-primary"
        onClick={() => setShowOptional(v => !v)}
      >
        <Sparkles className="h-4 w-4 mr-2 text-primary" />
        {showOptional
          ? t('planTrip.activitiesStep.refineLess', 'Masquer les options supplémentaires')
          : t('planTrip.activitiesStep.refineMore', "Ajouter des centres d'intérêt et demandes spéciales")}
        {showOptional ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
      </Button>

      {showOptional && (
        <>
          {/* Specific Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('planTrip.activitiesStep.specificInterests')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Array.isArray(interests) && interests.map((interest) => (
                  <div key={interest.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={`interest-${interest.code}`}
                      checked={preferences.interests.includes(interest.code)}
                      onCheckedChange={() => toggleArrayItem('interests', interest.code)}
                    />
                    <Label htmlFor={`interest-${interest.code}`} className="text-sm">
                      {getLabelFromCode(interest.code, interests, i18n.language)}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Special Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('planTrip.activitiesStep.specialRequests')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('planTrip.activitiesStep.specialRequestsDescription')}
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={t('planTrip.activitiesStep.specialRequestsPlaceholder')}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium">{t('planTrip.activitiesStep.summary')}</h4>
            <div className="space-y-2">
              {Array.isArray(preferences.categories) && preferences.categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">{t('planTrip.activitiesStep.summaryCategories')}</span>
                  {preferences.categories.map(categoryCode => {
                    const category = categories.find(c => c.code === categoryCode);
                    return category ? (
                      <Badge key={categoryCode} variant="outline" className="text-xs">
                        {getLabelFromCode(category.code, categories, i18n.language)}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('planTrip.activitiesStep.summaryIntensity')}</span>
                <Badge variant="outline" className="text-xs">
                  {getLabelFromCode(preferences.intensity, intensityLevels, i18n.language) || t('planTrip.activitiesStep.moderate')}
                </Badge>
              </div>

              {Array.isArray(preferences.interests) && preferences.interests.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm font-medium">{t('planTrip.activitiesStep.summaryInterests')}</span>
                  {preferences.interests.slice(0, 5).map(interestCode => {
                    const interest = interests.find(i => i.code === interestCode);
                    return interest ? (
                      <Badge key={interestCode} variant="outline" className="text-xs">
                        {getLabelFromCode(interest.code, interests, i18n.language)}
                      </Badge>
                    ) : null;
                  })}
                  {preferences.interests.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{preferences.interests.length - 5} {t('planTrip.activitiesStep.others')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
