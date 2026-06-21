import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, DollarSign } from "lucide-react";
import { TaxonomyIcon } from "@/lib/taxonomyIcon";
import { TripFormData, Budget } from "@/types/trip";
import { useBudgetSettings } from "@/hooks/useBudgetSettings";
import { getLocalizedLabel, getLocalizedName, getLocalizedDescription } from "@/utils/multilingualHelpers";

interface BudgetStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

export const BudgetStep = ({ data, onUpdate, onValidate }: BudgetStepProps) => {
  const { t, i18n } = useTranslation();
  const {
    budgetLevels, 
    currencies, 
    flexibilityOptions, 
    loading, 
    error,
    getDefaultCurrency,
    getDefaultFlexibility 
  } = useBudgetSettings();

  const [budget, setBudget] = useState<Budget>(
    data.budget || { 
      level: 'standard', 
      dailyBudget: 100, 
      currency: 'EUR', 
      flexibility: 'flexible' 
    }
  );

  // Valeur texte du champ « Budget quotidien » : permet d'effacer librement et de saisir
  // (le champ contrôlé par un nombre empêchait de vider tous les chiffres).
  const [dailyBudgetInput, setDailyBudgetInput] = useState<string>(String(budget.dailyBudget ?? ''));

  // Resynchronise le texte quand le montant change ailleurs (ex. choix d'un niveau de budget).
  useEffect(() => {
    setDailyBudgetInput(String(budget.dailyBudget ?? ''));
  }, [budget.dailyBudget]);

  // Mettre à jour le budget avec les valeurs par défaut une fois les données chargées
  useEffect(() => {
    if (!loading && !data.budget) {
      const defaultCurrency = getDefaultCurrency();
      const defaultFlexibility = getDefaultFlexibility();
      const defaultLevel = budgetLevels.find(level => level.code === 'standard') || budgetLevels[0];

      if (defaultCurrency && defaultFlexibility && defaultLevel) {
        setBudget({
          level: defaultLevel.code,
          dailyBudget: defaultLevel.default_daily_amount,
          currency: defaultCurrency.code,
          flexibility: defaultFlexibility.code
        });
      }
    }
  }, [loading, data.budget, budgetLevels, getDefaultCurrency, getDefaultFlexibility]);

  useEffect(() => {
    const isValid = budget.dailyBudget > 0;
    onValidate(isValid);
    
    if (isValid) {
      onUpdate({ budget });
    }
  }, [budget, onUpdate, onValidate]);

  const updateBudget = (updates: Partial<Budget>) => {
    setBudget(prev => ({ ...prev, ...updates }));
  };

  const getBudgetDescription = (levelCode: string) => {
    const level = budgetLevels.find(l => l.code === levelCode);
    return getLocalizedDescription(level, i18n.language);
  };

  const getBudgetRange = (levelCode: string) => {
    const level = budgetLevels.find(l => l.code === levelCode);
    if (!level) return '';
    const sym = selectedCurrency?.symbol || '€';
    const per = t('planTrip.budgetStep.perDay');
    if (level.min_daily_amount && level.max_daily_amount) {
      return `${level.min_daily_amount}${sym} - ${level.max_daily_amount}${sym}/${per}`;
    } else if (level.min_daily_amount) {
      return `> ${level.min_daily_amount}${sym}/${per}`;
    } else if (level.max_daily_amount) {
      return `< ${level.max_daily_amount}${sym}/${per}`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>{t('planTrip.budgetStep.error')}: {error}</p>
      </div>
    );
  }

  const selectedCurrency = currencies.find(c => c.code === budget.currency) || currencies[0];

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-primary" />
            {t('planTrip.budgetStep.budgetLevel')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {budgetLevels.map((level) => (
              <Button
                key={level.code}
                variant={budget.level === level.code ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-4 whitespace-normal text-center"
                onClick={() => updateBudget({ 
                  level: level.code,
                  dailyBudget: level.default_daily_amount
                })}
              >
                <TaxonomyIcon iconName={level.icon_name} code={level.code} className={`h-6 w-6 ${budget.level === level.code ? 'text-primary-foreground' : 'text-primary'}`} fallback="Wallet" />
                <div className="text-center">
                  <div className="font-medium">{getLocalizedLabel(level, i18n.language)}</div>
                  <div className={`text-xs ${budget.level === level.code ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{getBudgetRange(level.code)}</div>
                </div>
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily-budget">{t('planTrip.budgetStep.dailyBudget')}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-5 text-center">{selectedCurrency?.symbol || '€'}</span>
                <Input
                  id="daily-budget"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={dailyBudgetInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setDailyBudgetInput(raw); // autorise le champ vide / la saisie en cours
                    const n = parseInt(raw, 10);
                    if (raw !== '' && !Number.isNaN(n) && n > 0) {
                      updateBudget({ dailyBudget: n });
                    }
                  }}
                  onBlur={() => {
                    // À la sortie du champ : si vide/invalide, on revient au défaut du niveau (ou 10).
                    const n = parseInt(dailyBudgetInput, 10);
                    if (dailyBudgetInput === '' || Number.isNaN(n) || n <= 0) {
                      const fallback = budgetLevels.find(l => l.code === budget.level)?.default_daily_amount || 10;
                      setDailyBudgetInput(String(fallback));
                      updateBudget({ dailyBudget: fallback });
                    }
                  }}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">{selectedCurrency?.symbol}/{t('planTrip.budgetStep.perDay')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('planTrip.budgetStep.currency')}</Label>
              <Select value={budget.currency} onValueChange={(value) => updateBudget({ currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {getLocalizedName(currency, i18n.language)} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('planTrip.budgetStep.flexibility')}</Label>
              <Select 
                value={budget.flexibility} 
                onValueChange={(value) => updateBudget({ flexibility: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {flexibilityOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {getLocalizedLabel(option, i18n.language)} - {getLocalizedDescription(option, i18n.language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-secondary/50 p-3 rounded-md text-sm">
            <p className="font-medium mb-1">
              {t('planTrip.budgetStep.selectedLevel')} : {getLocalizedLabel(budgetLevels.find(l => l.code === budget.level), i18n.language)}
            </p>
            <p className="text-muted-foreground">{getBudgetDescription(budget.level)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium">{t('planTrip.budgetStep.summary')}</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {t('planTrip.budgetStep.budget')} {getLocalizedLabel(budgetLevels.find(l => l.code === budget.level), i18n.language)} : {budget.dailyBudget}{selectedCurrency?.symbol}/{t('planTrip.budgetStep.perDay')}
              </Badge>
              <Badge variant="outline">
                {t('planTrip.budgetStep.currency')} : {getLocalizedName(selectedCurrency, i18n.language)}
              </Badge>
              <Badge variant="outline">
                {t('planTrip.budgetStep.flexibility')} : {getLocalizedLabel(flexibilityOptions.find(o => o.code === budget.flexibility), i18n.language)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};