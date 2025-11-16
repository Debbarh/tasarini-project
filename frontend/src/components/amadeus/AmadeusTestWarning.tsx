import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, TestTube } from 'lucide-react';

interface AmadeusTestWarningProps {
  onDismiss?: () => void;
  showProductionInfo?: boolean;
}

export const AmadeusTestWarning: React.FC<AmadeusTestWarningProps> = ({
  onDismiss,
  showProductionInfo = true
}) => {
  return (
    <Alert className="border-orange-200 bg-orange-50/50">
      <TestTube className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-700">
        Mode Test Amadeus Actif
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm text-orange-700">
          L'application utilise actuellement les APIs de test d'Amadeus. Les données affichées sont limitées et peuvent différer de l'environnement de production.
        </p>
        
        <div className="space-y-2 text-xs">
          <p><strong>Limitations actuelles :</strong></p>
          <ul className="list-disc list-inside space-y-1 text-orange-600">
            <li>Images d'hôtels parfois manquantes (complétées par Unsplash)</li>
            <li>Descriptions générées automatiquement</li>
            <li>Liens de réservation redirigent vers l'environnement de test</li>
            <li>Données limitées comparé à la production</li>
          </ul>
        </div>

        {showProductionInfo && (
          <div className="space-y-2 text-xs">
            <p><strong>En production :</strong></p>
            <ul className="list-disc list-inside space-y-1 text-green-700">
              <li>Images haute qualité pour tous les hôtels</li>
              <li>Descriptions détaillées et authentiques</li>
              <li>Réservations réelles avec confirmation instantanée</li>
              <li>Plus de 2 millions d'hôtels disponibles</li>
            </ul>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {onDismiss && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDismiss}
              className="text-orange-700 border-orange-300"
            >
              Compris
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://developers.amadeus.com/self-service/category/hotels', '_blank')}
            className="text-orange-700 border-orange-300"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            En savoir plus
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};