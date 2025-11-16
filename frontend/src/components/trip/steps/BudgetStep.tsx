import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, DollarSign } from "lucide-react";
import { TripFormData, Budget } from "@/types/trip";
import { useBudgetSettings } from "@/hooks/useBudgetSettings";

interface BudgetStepProps {
  data: Partial<TripFormData>;
  onUpdate: (data: Partial<TripFormData>) => void;
  onValidate: (isValid: boolean) => void;
}

export const BudgetStep = ({ data, onUpdate, onValidate }: BudgetStepProps) => {
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
    return level?.description_fr || '';
  };

  const getBudgetRange = (levelCode: string) => {
    const level = budgetLevels.find(l => l.code === levelCode);
    if (!level) return '';
    
    if (level.min_daily_amount && level.max_daily_amount) {
      return `${level.min_daily_amount}€ - ${level.max_daily_amount}€/jour`;
    } else if (level.min_daily_amount) {
      return `> ${level.min_daily_amount}€/jour`;
    } else if (level.max_daily_amount) {
      return `< ${level.max_daily_amount}€/jour`;
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
        <p>Erreur: {error}</p>
      </div>
    );
  }

  const selectedCurrency = currencies.find(c => c.code === budget.currency) || currencies[0];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Budget de voyage</h3>
        <p className="text-muted-foreground">
          Définissez votre budget pour personnaliser votre voyage
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-primary" />
            Niveau de budget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {budgetLevels.map((level) => (
              <Button
                key={level.code}
                variant={budget.level === level.code ? "default" : "outline"}
                className="h-auto flex-col gap-2 p-4"
                onClick={() => updateBudget({ 
                  level: level.code,
                  dailyBudget: level.default_daily_amount
                })}
              >
                <span className="text-2xl">{level.icon_emoji}</span>
                <div className="text-center">
                  <div className="font-medium">{level.label_fr}</div>
                  <div className="text-xs text-muted-foreground">{getBudgetRange(level.code)}</div>
                </div>
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily-budget">Budget quotidien</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="daily-budget"
                  type="number"
                  min="10"
                  value={budget.dailyBudget}
                  onChange={(e) => updateBudget({ dailyBudget: parseInt(e.target.value) || 10 })}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">{selectedCurrency?.symbol}/jour</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={budget.currency} onValueChange={(value) => updateBudget({ currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.name_fr} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Flexibilité</Label>
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
                      {option.label_fr} - {option.description_fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-secondary/50 p-3 rounded-md text-sm">
            <p className="font-medium mb-1">
              Niveau sélectionné : {budgetLevels.find(l => l.code === budget.level)?.label_fr}
            </p>
            <p className="text-muted-foreground">{getBudgetDescription(budget.level)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-secondary/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium">Résumé de votre budget</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Budget {budgetLevels.find(l => l.code === budget.level)?.label_fr} : {budget.dailyBudget}{selectedCurrency?.symbol}/jour
              </Badge>
              <Badge variant="outline">
                Devise : {selectedCurrency?.name_fr}
              </Badge>
              <Badge variant="outline">
                Flexibilité : {flexibilityOptions.find(o => o.code === budget.flexibility)?.label_fr}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};