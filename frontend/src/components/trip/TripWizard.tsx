import { useState } from "react";
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

const STEPS = [
  { id: 'destinations', title: 'Destinations', icon: MapPin, description: 'Où souhaitez-vous aller ?' },
  { id: 'details', title: 'Compagnons', icon: Users, description: 'Avec qui voyagez-vous ?' },
  { id: 'budget', title: 'Budget', icon: Wallet, description: 'Définissez votre budget de voyage' },
  { id: 'culinary', title: 'Cuisine', icon: Utensils, description: 'Vos préférences culinaires' },
  { id: 'accommodation', title: 'Hébergement', icon: Home, description: 'Type et critères d\'hébergement' },
  { id: 'activities', title: 'Activités', icon: Activity, description: 'Expériences et centres d\'intérêt' },
];

export const TripWizard = ({ onComplete, isLoading }: TripWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<TripFormData>>({});
  const [stepValidation, setStepValidation] = useState<boolean[]>(new Array(STEPS.length).fill(false));
  const { trackStep } = useAnalytics();

  const currentStepData = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const updateFormData = (stepData: Partial<TripFormData>) => {
    const newFormData = { ...formData, ...stepData };
    setFormData(newFormData);
    
    // Ne plus faire de tracking à chaque modification
    // La collecte se fera uniquement à la fin
  };

  const validateCurrentStep = (isValid: boolean) => {
    const newValidation = [...stepValidation];
    newValidation[currentStep] = isValid;
    setStepValidation(newValidation);
  };

  const canProceed = stepValidation[currentStep];
  const canGoBack = currentStep > 0;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Collecter les analytics uniquement à la fin avec toutes les données
      trackStep('completed', formData, 'completed');
      onComplete(formData as TripFormData);
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
              <h2 className="text-xl font-semibold">Planifiez votre voyage</h2>
              <span className="text-sm text-muted-foreground">
                Étape {currentStep + 1} sur {STEPS.length}
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
          Précédent
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
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Créer mon itinéraire
              </>
            )
          ) : (
            <>
              Suivant
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};