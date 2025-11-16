import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Target } from 'lucide-react';
import { usePOIFormProgress } from '@/hooks/usePOIFormProgress';
import { UnifiedPOIFormData, POIFormContext } from '@/types/poi-form';

interface ProgressIndicatorProps {
  formData: UnifiedPOIFormData;
  context: POIFormContext;
  className?: string;
  showDetails?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  formData,
  context,
  className = '',
  showDetails = true
}) => {
  const {
    overallProgress,
    sectionsProgress,
    completedSections,
    totalSections,
    getNextIncompleteSection,
    isFormComplete
  } = usePOIFormProgress(formData, context);

  const nextIncompleteSection = getNextIncompleteSection();

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Progression du formulaire
          <Badge variant={isFormComplete() ? "default" : "secondary"} className="ml-2">
            {completedSections}/{totalSections}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre de progression globale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progression globale</span>
            <span className="text-muted-foreground">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          
          {isFormComplete() ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Formulaire complet !
            </div>
          ) : nextIncompleteSection && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Clock className="h-4 w-4" />
              Prochaine section : {sectionsProgress.find(s => s.id === nextIncompleteSection)?.title}
            </div>
          )}
        </div>

        {/* Détails des sections */}
        {showDetails && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Détail par section</h4>
            <div className="space-y-2">
              {sectionsProgress.map((section) => (
                <div key={section.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {section.completed ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : section.progress > 0 ? (
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className={section.completed ? 'text-green-700' : 'text-foreground'}>
                        {section.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {section.completedFields.length}/{section.requiredFields.length + section.completedFields.length}
                      </span>
                      <Badge 
                        variant={section.completed ? "default" : section.progress > 0 ? "secondary" : "outline"}
                        className="text-xs px-2 py-0"
                      >
                        {section.progress}%
                      </Badge>
                    </div>
                  </div>
                  
                  {section.progress > 0 && section.progress < 100 && (
                    <Progress value={section.progress} className="h-1" />
                  )}
                  
                  {/* Champs manquants pour les sections incomplètes */}
                  {!section.completed && section.missingFields.length > 0 && (
                    <div className="ml-5 text-xs text-muted-foreground">
                      Manquant : {section.missingFields.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages contextuels selon le niveau */}
        <div className="pt-3 border-t">
          {context.validationLevel === 'basic' && (
            <div className="text-xs text-muted-foreground p-2 bg-blue-50 rounded">
              💡 <strong>Mode simplifié :</strong> Seules les informations essentielles sont requises.
            </div>
          )}
          
          {context.validationLevel === 'standard' && (
            <div className="text-xs text-muted-foreground p-2 bg-amber-50 rounded">
              📋 <strong>Mode standard :</strong> Ajoutez des catégories pour une meilleure visibilité.
            </div>
          )}
          
          {context.validationLevel === 'advanced' && (
            <div className="text-xs text-muted-foreground p-2 bg-purple-50 rounded">
              🚀 <strong>Mode avancé :</strong> Plus de détails = meilleure expérience utilisateur.
            </div>
          )}
          
          {context.validationLevel === 'strict' && (
            <div className="text-xs text-muted-foreground p-2 bg-red-50 rounded">
              🔍 <strong>Validation stricte :</strong> Tous les champs requis doivent être complétés.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};