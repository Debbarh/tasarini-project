import { useState } from 'react';
import { Trash2, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const DeleteAccount = () => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleDelete = async () => {
    if (!password.trim()) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    if (confirmText.toUpperCase() !== 'SUPPRIMER') {
      toast.error('Veuillez taper "SUPPRIMER" pour confirmer');
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch('http://localhost:8000/api/v1/accounts/delete-account/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tasarini_access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          confirm_text: confirmText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      toast.success('Votre compte a été supprimé avec succès');

      // Déconnexion et redirection
      signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Erreur lors de la suppression du compte');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Zone dangereuse
        </CardTitle>
        <CardDescription>
          Conformément au RGPD Article 17 - Droit à l'effacement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention :</strong> La suppression de votre compte est <strong>irréversible</strong>.
            Toutes vos données seront définitivement supprimées de nos serveurs.
          </AlertDescription>
        </Alert>

        {!showConfirmation ? (
          <>
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Données qui seront supprimées :</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Votre profil et informations personnelles</li>
                <li>• Toutes vos stories publiées</li>
                <li>• Vos réservations et historique</li>
                <li>• Vos favoris et bookmarks</li>
                <li>• Toutes vos sessions actives</li>
              </ul>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowConfirmation(true)}
              className="w-full"
              size="lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer mon compte
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Pour des raisons de sécurité, veuillez confirmer votre identité.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="delete-password">Mot de passe actuel</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                disabled={isDeleting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Tapez <strong>SUPPRIMER</strong> pour confirmer
              </Label>
              <Input
                id="delete-confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                disabled={isDeleting}
              />
              <p className="text-xs text-muted-foreground">
                Cette action est irréversible. Tous vos contenus seront perdus.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmation(false);
                  setPassword('');
                  setConfirmText('');
                }}
                disabled={isDeleting}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || !password || confirmText.toUpperCase() !== 'SUPPRIMER'}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
