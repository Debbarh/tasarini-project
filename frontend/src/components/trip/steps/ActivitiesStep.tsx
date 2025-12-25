import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Zap } from "lucide-react";
import * as LucideIcons from "lucide-react";
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
  return entries.find((entry) => {
    if (entry.code === value) return true;
    return LABEL_FIELDS.some((field) => entry[field] && entry[field]?.toLowerCase() === value.toLowerCase());
  });
};

const normalizeArrayValues = <T extends MultilingualEntry>(values: string[], entries: T[]) => {
  if (!values || values.length === 0) return [];
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
  const [preferences, setPreferences] = useState<ActivityPreferences>(
    data.activityPreferences || {
      categories: [],
      intensity: 'moderate',
      interests: [],
      avoidances: []
    }
  );
  const [specialRequests, setSpecialRequests] = useState(data.specialRequests || "");

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
    const current = preferences[field] as string[];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updatePreferences({ [field]: updated } as Partial<ActivityPreferences>);
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t('planTrip.activitiesStep.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{t('planTrip.activitiesStep.title')}</h3>
        <p className="text-muted-foreground">
          {t('planTrip.activitiesStep.description')}
        </p>
      </div>

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
            {categories.map((category) => {
              const IconComponent = category.icon_name ? (LucideIcons as any)[category.icon_name] : null;
              return (
                <Button
                  key={category.code}
                  variant={preferences.categories.includes(category.code) ? "default" : "outline"}
                  className="h-auto flex-col gap-2 p-4"
                  onClick={() => toggleArrayItem('categories', category.code)}
                >
                  {category.icon_emoji ? (
                    <span className="text-xl">{category.icon_emoji}</span>
                  ) : IconComponent ? (
                    <IconComponent className="h-5 w-5" />
                  ) : (
                    <Activity className="h-5 w-5" />
                  )}
                  <span className="text-xs text-center">
                    {getLabelFromCode(category.code, categories, i18n.language)}
                  </span>
                </Button>
              );
            })}
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
            {intensityLevels.map((level) => (
              <Button
                key={level.code}
                variant={preferences.intensity === level.code ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-4"
                onClick={() => updatePreferences({ intensity: level.code })}
              >
                <span className="text-2xl">{level.icon_emoji}</span>
                <div className="text-center">
                  <div className="font-medium text-sm">
                    {getLabelFromCode(level.code, intensityLevels, i18n.language)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getLocalizedDescription(level, i18n.language)}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Specific Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('planTrip.activitiesStep.specificInterests')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {interests.map((interest) => (
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

      {/* Avoidances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('planTrip.activitiesStep.avoidances')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('planTrip.activitiesStep.avoidancesDescription')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {avoidances.map((avoidance) => (
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

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium">{t('planTrip.activitiesStep.summary')}</h4>
            <div className="space-y-2">
              {preferences.categories.length > 0 && (
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

              {preferences.interests.length > 0 && (
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
