import { useState } from 'react';
import { Download, FileJson, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';

export const DownloadUserData = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // Appel à l'API pour télécharger les données
      const response = await fetch('http://localhost:8000/api/v1/accounts/download-data/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tasarini_access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      // Récupérer le JSON
      const data = await response.json();

      // Créer un Blob et télécharger
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tasarini_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Vos données ont été téléchargées avec succès !');
    } catch (error) {
      console.error('Error downloading data:', error);
      toast.error('Erreur lors du téléchargement de vos données');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Télécharger mes données
        </CardTitle>
        <CardDescription>
          Conformément au RGPD Article 20 - Droit à la portabilité des données
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Vous pouvez télécharger une copie de toutes vos données personnelles au format JSON.
            Ce fichier inclut votre profil, vos stories, vos réservations, vos favoris et vos sessions.
          </AlertDescription>
        </Alert>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Données incluses :</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Informations de profil (email, nom, préférences)</li>
            <li>• Stories publiées</li>
            <li>• Réservations effectuées</li>
            <li>• Favoris et bookmarks</li>
            <li>• Sessions actives</li>
            <li>• Préférences RGPD</li>
          </ul>
        </div>

        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full"
          size="lg"
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Téléchargement en cours...' : 'Télécharger mes données (JSON)'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Le téléchargement démarrera automatiquement. Le fichier est au format JSON lisible.
        </p>
      </CardContent>
    </Card>
  );
};
