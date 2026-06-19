import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, MapPin, Users, Wallet, Utensils, Home, Activity, Sparkles, Check, Clock } from "lucide-react";

const DRAFT_KEY = "tasarini_trip_draft";

// Réhydrate les champs Date d'un brouillon restauré depuis le localStorage
const rehydrateDraft = (fd: any): Partial<TripFormData> => {
  if (!fd || typeof fd !== "object") return {};
  const out = { ...fd };
  if (out.startDate) out.startDate = new Date(out.startDate);
  if (out.endDate) out.endDate = new Date(out.endDate);
  if (Array.isArray(out.destinations)) {
    out.destinations = out.destinations.map((d: any) => ({
      ...d,
      startDate: d?.startDate ? new Date(d.startDate) : d?.startDate,
      endDate: d?.endDate ? new Date(d.endDate) : d?.endDate,
    }));
  }
  return out;
};
import ErrorBoundary from "@/components/ErrorBoundary";
import DestinationStep from "./steps/DestinationStep";
import { TravelDetailsStep } from "./steps/TravelDetailsStep";
import { BudgetStep } from "./steps/BudgetStep";
import { CulinaryStep } from "./steps/CulinaryStep";
import { AccommodationStep } from "./steps/AccommodationStep";
import { ActivitiesStep } from "./steps/ActivitiesStep";
import { TripFormData } from "@/types/trip";
import { useAnalytics } from "@/hooks/useAnalytics";

interface TripWizardProps {
  onComplete: (data: TripFormData) => void;
  isLoading?: boolean;
}

export const TripWizard = ({ onComplete, isLoading }: TripWizardProps) => {
  const { t } = useTranslation();
  // Restauration du brouillon (sauvegarde auto) depuis le localStorage
  const [draft] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [currentStep, setCurrentStep] = useState<number>(draft?.currentStep ?? 0);
  const [formData, setFormData] = useState<Partial<TripFormData>>(() => rehydrateDraft(draft?.formData));
  const [savedTick, setSavedTick] = useState(false);
  const { trackStep } = useAnalytics();

  // Create steps array with translations
  const STEPS = [
    { id: 'destinations', title: t('planTrip.wizard.steps.destinations.title'), icon: MapPin, description: t('planTrip.wizard.steps.destinations.description') },
    { id: 'details', title: t('planTrip.wizard.steps.details.title'), icon: Users, description: t('planTrip.wizard.steps.details.description') },
    { id: 'budget', title: t('planTrip.wizard.steps.budget.title'), icon: Wallet, description: t('planTrip.wizard.steps.budget.description') },
    { id: 'culinary', title: t('planTrip.wizard.steps.culinary.title'), icon: Utensils, description: t('planTrip.wizard.steps.culinary.description'), optional: true },
    { id: 'accommodation', title: t('planTrip.wizard.steps.accommodation.title'), icon: Home, description: t('planTrip.wizard.steps.accommodation.description'), optional: true },
    { id: 'activities', title: t('planTrip.wizard.steps.activities.title'), icon: Activity, description: t('planTrip.wizard.steps.activities.description'), optional: true },
  ];

  const [stepValidation, setStepValidation] = useState<boolean[]>(new Array(STEPS.length).fill(false));

  const currentStepData = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Sauvegarde automatique du brouillon (formulaire + étape) dans le localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, currentStep }));
      setSavedTick(true);
    } catch {
      /* quota/private mode: on ignore */
    }
  }, [formData, currentStep]);

  // Remonter en haut de la page à chaque changement d'étape (sinon on reste
  // au milieu en cliquant sur Suivant/Précédent).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Une étape est accessible au clic si déjà atteinte ou validée
  const goToStep = (index: number) => {
    if (index === currentStep) return;
    if (index < currentStep || stepValidation[index]) {
      setCurrentStep(index);
    }
  };

  const updateFormData = useCallback((stepData: Partial<TripFormData>) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
    // Tracking reporté à la fin
  }, []);

  const validateCurrentStep = useCallback((isValid: boolean) => {
    setStepValidation((prev) => {
      if (prev[currentStep] === isValid) {
        return prev;
      }
      const next = [...prev];
      next[currentStep] = isValid;
      return next;
    });
  }, [currentStep]);

  const canProceed = stepValidation[currentStep];
  const canGoBack = currentStep > 0;

  // Construit le payload final et lance la génération (utilisé par "Suivant"
  // sur la dernière étape ET par "Générer maintenant").
  const generateNow = () => {
    const finalDestinations = formData.destinations ?? [];
    const fallbackStart = finalDestinations[0]?.startDate ?? new Date();
    const finalStart = formData.startDate ?? fallbackStart;
    const fallbackEnd = finalDestinations[finalDestinations.length - 1]?.endDate ?? finalStart;
    const finalEnd = formData.endDate ?? fallbackEnd;

    const finalData: TripFormData = {
      ...formData,
      destinations: finalDestinations,
      startDate: finalStart,
      endDate: finalEnd,
    } as TripFormData;

    trackStep('completed', finalData, 'completed');
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    onComplete(finalData);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      generateNow();
    }
  };

  // Passer une étape optionnelle (avance sans exiger la validation)
  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      generateNow();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'destinations':
        return (
          <DestinationStep
            data={formData}
            onUpdate={updateFormData}
            onValidate={validateCurrentStep}
          />
        );
      case 'details':
        return (
          <TravelDetailsStep
            data={formData}
            onUpdate={updateFormData}
            onValidate={validateCurrentStep}
          />
        );
      case 'budget':
        return (
          <BudgetStep
            data={formData}
            onUpdate={updateFormData}
            onValidate={validateCurrentStep}
          />
        );
      case 'culinary':
        return (
          <CulinaryStep
            data={formData}
            onUpdate={updateFormData}
            onValidate={validateCurrentStep}
          />
        );
      case 'accommodation':
        return (
          <AccommodationStep
            data={formData}
            onUpdate={updateFormData}
            onValidate={validateCurrentStep}
          />
        );
      case 'activities':
        return (
          <ActivitiesStep
            data={formData}
            onUpdate={updateFormData}
            onValidate={validateCurrentStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        {/* Barre latérale verticale (desktop) */}
        <aside className="hidden lg:block lg:sticky lg:top-6 h-fit">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h2 className="text-base font-semibold">{t('planTrip.wizard.title')}</h2>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {t('planTrip.wizard.estimatedTime', '~3 min')} · {t('planTrip.wizard.stepOf', { current: currentStep + 1, total: STEPS.length })}
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />

              {/* Liste verticale des étapes */}
              <nav className="space-y-1">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = stepValidation[index];
                  const isPassed = index < currentStep;
                  const clickable = !isActive && (isPassed || isCompleted);

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => goToStep(index)}
                      disabled={!clickable}
                      aria-label={step.title}
                      title={clickable ? step.title : undefined}
                      className={`w-full flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                        isActive ? 'bg-primary/10' : clickable ? 'hover:bg-accent cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div
                        className={`relative w-8 h-8 shrink-0 rounded-full flex items-center justify-center border-2 ${
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground'
                            : isPassed || isCompleted
                            ? 'border-green-600 bg-green-600 text-white'
                            : 'border-muted-foreground text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {(isPassed || isCompleted) && !isActive && (
                          <span className="absolute -top-1 -right-1 bg-white rounded-full p-px shadow-sm">
                            <Check className="h-3 w-3 text-green-600" />
                          </span>
                        )}
                      </div>
                      <span className={`text-sm truncate ${
                        isActive ? 'font-medium text-primary' : isPassed || isCompleted ? 'text-green-700' : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {savedTick && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3.5 w-3.5" />
                  {t('planTrip.wizard.autosaved', 'Progression sauvegardée')}
                </span>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Colonne contenu */}
        <div className="space-y-6 min-w-0">
          {/* En-tête compacte mobile (la barre latérale est masquée sous lg) */}
          <div className="lg:hidden space-y-2">
            <Progress value={progress} className="h-1.5" />
            <p className="text-sm font-medium">
              {t('planTrip.wizard.stepOf', { current: currentStep + 1, total: STEPS.length })} — {currentStepData.title}
            </p>
          </div>

          {/* Current Step Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = currentStepData.icon;
                  return <Icon className="h-5 w-5 text-primary" />;
                })()}
                {currentStepData.title}
              </CardTitle>
              <p className="text-muted-foreground">{currentStepData.description}</p>
            </CardHeader>
            <CardContent>
              <ErrorBoundary key={currentStep}>
                {renderStepContent()}
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="space-y-3">
            <div className="flex justify-between items-center gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={!canGoBack || isLoading}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('planTrip.wizard.previous')}
              </Button>

              {currentStepData.optional && currentStep < STEPS.length - 1 && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-muted-foreground"
                >
                  {t('planTrip.wizard.skipStep', 'Passer cette étape')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={!canProceed || isLoading}
                className="flex items-center gap-2"
              >
                {currentStep === STEPS.length - 1 ? (
                  isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      {t('planTrip.wizard.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t('planTrip.wizard.createItinerary')}
                    </>
                  )
                ) : (
                  <>
                    {t('planTrip.wizard.next')}
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Générer maintenant : raccourci dès l'étape 2 */}
            {currentStep >= 1 && currentStep < STEPS.length - 1 && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generateNow}
                  disabled={isLoading}
                  className="gap-1"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('planTrip.wizard.generateNow', 'Générer maintenant')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
