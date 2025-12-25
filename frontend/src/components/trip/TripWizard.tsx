import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, MapPin, Users, Wallet, Utensils, Home, Activity, Sparkles } from "lucide-react";
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
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<TripFormData>>({});
  const { trackStep } = useAnalytics();

  // Create steps array with translations
  const STEPS = [
    { id: 'destinations', title: t('planTrip.wizard.steps.destinations.title'), icon: MapPin, description: t('planTrip.wizard.steps.destinations.description') },
    { id: 'details', title: t('planTrip.wizard.steps.details.title'), icon: Users, description: t('planTrip.wizard.steps.details.description') },
    { id: 'budget', title: t('planTrip.wizard.steps.budget.title'), icon: Wallet, description: t('planTrip.wizard.steps.budget.description') },
    { id: 'culinary', title: t('planTrip.wizard.steps.culinary.title'), icon: Utensils, description: t('planTrip.wizard.steps.culinary.description') },
    { id: 'accommodation', title: t('planTrip.wizard.steps.accommodation.title'), icon: Home, description: t('planTrip.wizard.steps.accommodation.description') },
    { id: 'activities', title: t('planTrip.wizard.steps.activities.title'), icon: Activity, description: t('planTrip.wizard.steps.activities.description') },
  ];

  const [stepValidation, setStepValidation] = useState<boolean[]>(new Array(STEPS.length).fill(false));

  const currentStepData = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

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

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
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

      // Collecter les analytics uniquement à la fin avec toutes les données
      trackStep('completed', finalData, 'completed');
      onComplete(finalData);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('planTrip.wizard.title')}</h2>
              <span className="text-sm text-muted-foreground">
                {t('planTrip.wizard.stepOf', { current: currentStep + 1, total: STEPS.length })}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Steps indicator */}
            <div className="flex justify-between items-center">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = stepValidation[index];
                const isPassed = index < currentStep;
                
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center space-y-1 ${
                      isActive ? 'text-primary' : isPassed || isCompleted ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : isPassed || isCompleted
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-muted-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs text-center hidden sm:block max-w-20">
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

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
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={!canGoBack || isLoading}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('planTrip.wizard.previous')}
        </Button>

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
    </div>
  );
};
