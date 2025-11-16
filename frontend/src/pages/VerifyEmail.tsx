import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Building2, User } from 'lucide-react';
import { authTokenStorage } from '@/integrations/api/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const getPartnerTarget = (isPartner: boolean) => (isPartner ? '/complete-partner-profile' : '/profile');

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isPartner, setIsPartner] = useState(false);
  const [autoLoginState, setAutoLoginState] = useState<'idle' | 'running' | 'failed'>('idle');
  const [verifyData, setVerifyData] = useState<{ auto_login_available?: boolean; partner_profile_status?: string } | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const SESSION_TOKEN_KEY = 'partner_verify_token';
  useEffect(() => {
    const tokenFromParams = searchParams.get('token');
    const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const token = tokenFromParams || storedToken;
    setCurrentToken(token);

    if (tokenFromParams) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, tokenFromParams);
    }

    if (!token) {
      setStatus('error');
      setMessage('Token de vérification manquant.');
      return;
    }

    // Vérifier si c'est un partenaire depuis l'état de navigation
    const locationState = location.state as any;
    if (locationState?.isPartner) {
      setIsPartner(true);
    }

    // Vérifier l'email avec le token
    verifyEmail(token);
  }, [searchParams, location.state]);

  const redirectToAuth = () => {
    const target = getPartnerTarget(isPartner);
    window.location.href = `/auth?redirectTo=${encodeURIComponent(target)}`;
  };

  const navigateToTarget = () => {
    window.location.href = getPartnerTarget(isPartner);
  };

  const verifyEmail = async (token: string) => {
    try {
      // Note: L'endpoint est /api/auth/verify-email/ (pas /api/v1/auth/...)
      // On utilise fetch directement car apiClient ajoute /v1/ automatiquement
      const response = await fetch('http://localhost:8000/api/auth/verify-email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erreur de vérification');
      }

      setStatus('success');
      setVerifyData(data);
      if (data?.user?.role === 'partner') {
        setIsPartner(true);
      }
      setMessage('Votre email a été vérifié avec succès!');
      toast.success('Email vérifié avec succès!');
      if (data?.auto_login_available) {
        attemptAutoLogin(token);
      } else {
        toast.info('Veuillez vous connecter pour finaliser votre inscription.');
        redirectToAuth();
      }

    } catch (error: any) {
      console.error('Erreur lors de la vérification:', error);
      setStatus('error');

      const errorMessage = error?.message || 'Token invalide ou expiré.';
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const attemptAutoLogin = async (token?: string | null) => {
    const tokenValue = token ?? currentToken;
    if (!tokenValue || autoLoginState === 'running') {
      return;
    }
    setAutoLoginState('running');
    toast.info('Email vérifié, connexion en cours...');
    try {
      const response = await fetch('http://localhost:8000/api/auth/verify-email/complete/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenValue }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Impossible de terminer la vérification.');
      }
      authTokenStorage.setTokens(data.tokens);
      toast.success('Connexion réussie, redirection...');
      navigateToTarget();
    } catch (error: any) {
      console.error('Auto-login error:', error);
      setAutoLoginState('failed');
      toast.error(error?.message || 'Impossible de vous connecter automatiquement. Connectez-vous pour continuer.');
      redirectToAuth();
    }
  };

  const handleContinue = () => {
    if (verifyData?.auto_login_available) {
      attemptAutoLogin();
      return;
    }
    if (verifyData?.auto_login_available) {
      attemptAutoLogin();
      return;
    }
    if (user) {
      navigate(isPartner ? '/complete-partner-profile' : '/profile');
    } else {
      redirectToAuth();
    }
  };

  const handleResendEmail = async () => {
    try {
      const accessToken = authTokenStorage.getAccessToken();
      if (!accessToken) {
        toast.error('Veuillez vous connecter pour renvoyer le lien de vérification.');
        navigate(`/auth?redirectTo=${encodeURIComponent('/verify-email-required')}`);
        return;
      }
      const response = await fetch('http://localhost:8000/api/auth/resend-verification/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error('Impossible de renvoyer le lien. Veuillez réessayer.');
      }
      toast.success('Un nouvel email de vérification a été envoyé.');
    } catch (error: any) {
      toast.error(error?.message || 'Impossible de renvoyer le lien. Connectez-vous pour réessayer.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            {status === 'loading' && (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="w-8 h-8 text-white" />
            )}
            {status === 'error' && (
              <XCircle className="w-8 h-8 text-white" />
            )}
          </div>

          <CardTitle className="text-2xl">
            {status === 'loading' && 'Vérification en cours...'}
            {status === 'success' && 'Email vérifié!'}
            {status === 'error' && 'Erreur de vérification'}
          </CardTitle>

          <CardDescription className="text-base mt-2">
            {status === 'loading' && 'Veuillez patienter pendant que nous vérifions votre email.'}
            {status === 'success' && isPartner && 'Votre compte partenaire a été activé avec succès.'}
            {status === 'success' && !isPartner && 'Votre compte a été activé avec succès.'}
            {status === 'error' && 'Nous n\'avons pas pu vérifier votre email.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Message détaillé */}
          <div className={`p-4 rounded-lg ${
            status === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
              : status === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
          }`}>
            <p className="text-sm text-center">{message}</p>
          </div>

          {/* Actions selon le statut */}
          {status === 'success' && (
            <div className="space-y-3">
              {isPartner && (
                <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    Prochaine étape : Complétez votre profil partenaire
                  </p>
                </div>
              )}
              <p className="text-sm text-center text-muted-foreground">
                {verifyData?.auto_login_available
                  ? "Nous tentons de vous connecter automatiquement. Si cela échoue, utilisez le bouton ci-dessous."
                  : "Activez votre session en vous connectant pour poursuivre vers la prochaine étape."}
              </p>
              <Button onClick={handleContinue} className="w-full" disabled={autoLoginState === 'running'}>
                {isPartner ? (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    {autoLoginState === 'running' ? 'Connexion...' : 'Continuer vers mon profil partenaire'}
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    {autoLoginState === 'running' ? 'Connexion...' : 'Accéder à mon profil'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={autoLoginState === 'running'}
              >
                Renvoyer le lien de vérification
              </Button>
              {autoLoginState === 'failed' && (
                <p className="text-xs text-center text-red-500">
                  La connexion automatique a échoué. Merci d’utiliser le bouton ci-dessus pour continuer.
                </p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-semibold">Que faire ?</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Vérifiez que le lien est complet</li>
                  <li>Le lien expire après 24 heures</li>
                  <li>Demandez un nouveau lien de vérification</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full"
                >
                  Retour à la connexion
                </Button>
                <Button
                  onClick={() => navigate('/verify-email-required')}
                  variant="outline"
                  className="w-full"
                >
                  Renvoyer un email de vérification
                </Button>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Cela ne devrait prendre que quelques secondes...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
