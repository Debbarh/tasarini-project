import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, XCircle, Building2, User, Mail } from 'lucide-react';
import { authTokenStorage, API_ROOT_URL } from '@/integrations/api/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const BRAND_LOGO = '/brand/070b3052-89a5-4274-add2-2a60a3411cf2.png';

const getPartnerTarget = (partnerFlag: boolean) => (partnerFlag ? '/complete-partner-profile' : '/profile');

export default function VerifyEmail() {
  const { t } = useTranslation();
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
  const [resendEmail, setResendEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
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
      setMessage(t('verifyEmail.messages.tokenMissing'));
      return;
    }

    const locationState = location.state as any;
    if (locationState?.isPartner) {
      setIsPartner(true);
    }

    verifyEmail(token);
  }, [searchParams, location.state]);

  const redirectToAuth = (partnerFlag = isPartner) => {
    const target = getPartnerTarget(partnerFlag);
    window.location.href = `/auth?redirectTo=${encodeURIComponent(target)}`;
  };

  const navigateToTarget = (partnerFlag = isPartner) => {
    window.location.href = getPartnerTarget(partnerFlag);
  };

  const verifyEmail = async (token: string) => {
    try {
      // Endpoint hors /v1 : /api/auth/verify-email/ (API_ROOT_URL = base /api/).
      const response = await fetch(new URL('auth/verify-email/', API_ROOT_URL).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('verifyEmail.messages.verificationError'));
      }

      setStatus('success');
      setVerifyData(data);
      const partnerRole = data?.user?.role === 'partner';
      setIsPartner(partnerRole);
      setMessage(t('verifyEmail.messages.success'));
      toast.success(t('verifyEmail.toast.success'));
      if (data?.auto_login_available) {
        attemptAutoLogin(token, partnerRole);
      } else {
        toast.info(t('verifyEmail.messages.manualLoginInfo'));
        redirectToAuth(partnerRole);
      }
    } catch (error: any) {
      console.error('Erreur lors de la vérification:', error);
      setStatus('error');
      const errorMessage = error?.message || t('verifyEmail.messages.verificationError');
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const attemptAutoLogin = async (token?: string | null, partnerFlag = isPartner) => {
    const tokenValue = token ?? currentToken;
    if (!tokenValue || autoLoginState === 'running') {
      return;
    }
    setAutoLoginState('running');
    toast.info(t('verifyEmail.toast.verifying'));
    try {
      const response = await fetch(new URL('auth/verify-email/complete/', API_ROOT_URL).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || t('verifyEmail.toast.completeError'));
      }
      authTokenStorage.setTokens(data.tokens);
      toast.success(t('verifyEmail.toast.loginSuccess'));
      navigateToTarget(partnerFlag);
    } catch (error: any) {
      console.error('Auto-login error:', error);
      setAutoLoginState('failed');
      toast.error(error?.message || t('verifyEmail.toast.loginError'));
      redirectToAuth(partnerFlag);
    }
  };

  const handleContinue = () => {
    if (verifyData?.auto_login_available) {
      attemptAutoLogin(undefined, isPartner);
      return;
    }
    if (user) {
      navigate(isPartner ? '/complete-partner-profile' : '/profile');
    } else {
      redirectToAuth();
    }
  };

  // Renvoi du lien de vérification — fonctionne SANS être connecté, via l'email saisi.
  const handleResend = async () => {
    const email = resendEmail.trim();
    if (!email) {
      toast.error(t('verifyEmail.resend.emailRequired', 'Veuillez saisir votre adresse email.'));
      return;
    }
    setResendState('sending');
    try {
      const response = await fetch(new URL('auth/resend-verification/', API_ROOT_URL).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || t('verifyEmail.toast.resendError'));
      }
      setResendState('sent');
      toast.success(
        t('verifyEmail.resend.sent', 'Si un compte non vérifié existe pour cet email, un nouveau lien vient d’être envoyé.'),
      );
    } catch (error: any) {
      setResendState('idle');
      toast.error(error?.message || t('verifyEmail.toast.resendError'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white dark:from-gray-900 dark:to-gray-950 p-4">
      <Card className="w-full max-w-md border-sky-100 dark:border-gray-800 shadow-xl">
        <CardHeader className="text-center">
          <img src={BRAND_LOGO} alt="Tasarini" className="h-9 w-auto mx-auto mb-6" />

          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
            {status === 'loading' && <Loader2 className="w-8 h-8 text-white animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-8 h-8 text-white" />}
            {status === 'error' && <XCircle className="w-8 h-8 text-white" />}
          </div>

          <CardTitle className="text-2xl">
            {status === 'loading' && t('verifyEmail.title.loading')}
            {status === 'success' && t('verifyEmail.title.success')}
            {status === 'error' && t('verifyEmail.title.error')}
          </CardTitle>

          <CardDescription className="text-base mt-2">
            {status === 'loading' && t('verifyEmail.description.loading')}
            {status === 'success' && isPartner && t('verifyEmail.description.successPartner')}
            {status === 'success' && !isPartner && t('verifyEmail.description.successUser')}
            {status === 'error' && t('verifyEmail.description.error')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div
            className={`p-4 rounded-lg ${
              status === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
                : status === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
                : 'bg-sky-50 dark:bg-sky-900/20 text-sky-900 dark:text-sky-100'
            }`}
          >
            <p className="text-sm text-center">{message}</p>
          </div>

          {status === 'success' && (
            <div className="space-y-3">
              {isPartner && (
                <div className="flex items-center justify-center gap-2 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-sky-600" />
                  <p className="text-sm text-sky-800 dark:text-sky-200 font-medium">
                    {t('verifyEmail.partner.nextStep')}
                  </p>
                </div>
              )}
              <p className="text-sm text-center text-muted-foreground">
                {verifyData?.auto_login_available
                  ? t('verifyEmail.messages.autoLoginInfo')
                  : t('verifyEmail.messages.manualLoginInfo')}
              </p>
              <Button onClick={handleContinue} className="w-full" disabled={autoLoginState === 'running'}>
                {isPartner ? (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    {autoLoginState === 'running' ? t('verifyEmail.partner.continueButtonLoading') : t('verifyEmail.partner.continueButton')}
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    {autoLoginState === 'running' ? t('verifyEmail.user.continueButtonLoading') : t('verifyEmail.user.continueButton')}
                  </>
                )}
              </Button>
              {autoLoginState === 'failed' && (
                <p className="text-xs text-center text-red-500">{t('verifyEmail.messages.autoLoginFailed')}</p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-semibold">{t('verifyEmail.error.title')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('verifyEmail.error.checkLink')}</li>
                  <li>{t('verifyEmail.error.expired')}</li>
                  <li>{t('verifyEmail.error.requestNew')}</li>
                </ul>
              </div>

              {/* Renvoi d'un nouveau lien — sans connexion, via l'email */}
              <div className="rounded-lg border border-sky-100 dark:border-gray-800 bg-sky-50/60 dark:bg-sky-900/10 p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {t('verifyEmail.resend.title', 'Recevoir un nouveau lien de vérification')}
                </p>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={t('verifyEmail.resend.placeholder', 'Votre adresse email')}
                  value={resendEmail}
                  onChange={(event) => setResendEmail(event.target.value)}
                  disabled={resendState === 'sending'}
                />
                <Button
                  onClick={handleResend}
                  className="w-full"
                  disabled={resendState === 'sending' || resendState === 'sent'}
                >
                  {resendState === 'sending' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {resendState === 'sent' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {resendState === 'idle' && <Mail className="w-4 h-4 mr-2" />}
                  {resendState === 'sent'
                    ? t('verifyEmail.resend.done', 'Lien envoyé')
                    : resendState === 'sending'
                    ? t('verifyEmail.resend.sending', 'Envoi…')
                    : t('verifyEmail.resend.button', 'Renvoyer le lien')}
                </Button>
              </div>

              <Button onClick={() => navigate('/auth')} variant="outline" className="w-full">
                {t('verifyEmail.buttons.backToLogin')}
              </Button>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('verifyEmail.messages.waiting')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
