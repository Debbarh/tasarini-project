import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';
import { ApiError } from '@/integrations/api/client';

/**
 * Finalisation du mot de passe oublié : /reset-password?token=…
 * (la cible des liens email envoyés par le backend). Manquait côté web — ajoutée pour parité.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tokenFromUrl = params.get('token') ?? '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t('auth.gdpr.passwordsDontMatch', 'Les mots de passe ne correspondent pas.'));
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token.trim(), password);
      setDone(true);
      toast.success(t('auth.resetDone', 'Mot de passe modifié. Vous pouvez vous connecter.'));
      setTimeout(() => navigate('/auth'), 1500);
    } catch (error) {
      const msg = error instanceof ApiError
        ? ((error.payload as any)?.detail || (error.payload as any)?.new_password?.[0] || 'Lien invalide ou expiré.')
        : 'Une erreur est survenue.';
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary-glow/5 px-4">
      <Helmet><title>{t('auth.resetTitle', 'Réinitialiser le mot de passe')} - TASARINI</title></Helmet>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {t('auth.resetTitle', 'Réinitialiser le mot de passe')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('auth.resetDone', 'Mot de passe modifié. Vous pouvez vous connecter.')}
              </p>
              <Button asChild className="w-full"><Link to="/auth">{t('auth.signIn', 'Se connecter')}</Link></Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!tokenFromUrl && (
                <div className="space-y-2">
                  <Label htmlFor="rp-token">{t('auth.resetCode', 'Code de réinitialisation')}</Label>
                  <Input id="rp-token" value={token} onChange={(e) => setToken(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="rp-pwd">{t('auth.newPassword', 'Nouveau mot de passe')}</Label>
                <Input id="rp-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rp-confirm">{t('auth.gdpr.confirmPassword', 'Confirmer le mot de passe')}</Label>
                <Input id="rp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !token}>
                {loading ? '…' : t('auth.resetCta', 'Réinitialiser le mot de passe')}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth"><ArrowLeft className="h-4 w-4 mr-2" />{t('common.back', 'Retour')}</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
