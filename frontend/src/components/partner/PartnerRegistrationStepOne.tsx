import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Building2, Mail, Clock, CheckCircle, Info, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

const PartnerRegistrationStepOne: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Étape 1 = compte essentiel uniquement. Tout le reste (établissement, localisation,
  // KYC) est collecté après vérification de l'email, et persisté côté serveur.
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    acceptTerms: false,
  });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.firstName.trim()) errors.push(t('partnerOnboarding.errors.firstNameRequired', 'Le prénom est requis.'));
    if (!formData.lastName.trim()) errors.push(t('partnerOnboarding.errors.lastNameRequired', 'Le nom est requis.'));
    if (!formData.email.trim()) errors.push(t('partnerOnboarding.errors.emailRequired', 'L’email est requis.'));
    if (!formData.acceptTerms) errors.push(t('partnerOnboarding.errors.termsRequired', 'Vous devez accepter les conditions.'));
    if (formData.password !== formData.confirmPassword) {
      errors.push(t('partnerOnboarding.errors.passwordMismatch', 'Les mots de passe ne correspondent pas.'));
    }
    if (formData.password.length < 8) errors.push(t('partnerOnboarding.errors.passwordLength', 'Le mot de passe doit contenir au moins 8 caractères.'));
    if (!/[A-Z]/.test(formData.password)) errors.push(t('partnerOnboarding.errors.passwordUpper', 'Le mot de passe doit contenir au moins une majuscule.'));
    if (!/[a-z]/.test(formData.password)) errors.push(t('partnerOnboarding.errors.passwordLower', 'Le mot de passe doit contenir au moins une minuscule.'));
    if (!/\d/.test(formData.password)) errors.push(t('partnerOnboarding.errors.passwordDigit', 'Le mot de passe doit contenir au moins un chiffre.'));
    if (!/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/]/.test(formData.password)) {
      errors.push(t('partnerOnboarding.errors.passwordSpecial', 'Le mot de passe doit contenir au moins un caractère spécial.'));
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupSuccess(false);
    setSentEmail('');
    const errors = validateForm();
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setLoading(true);
    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        'partner',
        undefined,
        formData.acceptTerms, // termsAccepted
        formData.acceptTerms, // privacyAccepted
        '1.0',
        false,
      );
      if (error) {
        const emailError = error?.payload?.email?.[0];
        const detailError = error?.payload?.detail;
        toast.error(emailError || detailError || t('partnerOnboarding.errors.signupError', 'Erreur lors de l’inscription partenaire'));
        return;
      }
      setSignupSuccess(true);
      setSentEmail(formData.email);
    } catch (error: any) {
      console.error('Erreur inscription partenaire étape 1:', error);
      toast.error(`${t('partnerOnboarding.errors.generic', 'Erreur')}: ${error.message}`);
      setSignupSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () =>
    formData.email && formData.password && formData.confirmPassword &&
    formData.firstName && formData.lastName && formData.acceptTerms;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Building2 className="w-6 h-6 text-primary" />
          {t('partnerOnboarding.signup.title', 'Rejoignez Tasarini en tant que Partenaire')}
        </CardTitle>
        <p className="text-muted-foreground">
          {t('partnerOnboarding.signup.subtitle', 'Inscription en 1 minute — vous complétez votre profil après vérification de l’email')}
        </p>
      </CardHeader>
      <CardContent>
        {signupSuccess && (
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20">
            <AlertDescription className="space-y-2">
              <p dangerouslySetInnerHTML={{
                __html: t('partnerOnboarding.signup.successHtml', 'Un email de vérification a été envoyé à <strong>{{email}}</strong>. Cliquez sur le lien reçu pour activer votre compte partenaire.', { email: sentEmail }),
              }} />
              <p className="text-xs text-muted-foreground">
                {t('partnerOnboarding.signup.successHint', 'Une fois vérifié, vous serez guidé pour compléter votre profil étape par étape.')}
              </p>
            </AlertDescription>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/verify-email-required')}>
                {t('partnerOnboarding.signup.needNewLink', 'Besoin d’un nouveau lien ?')}
              </Button>
            </div>
          </Alert>
        )}
        {formErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {formErrors.map((err) => <li key={err}>{err}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Étapes du processus */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <span className="ml-2 text-sm font-medium text-primary">{t('partnerOnboarding.steps.signup', 'Inscription')}</span>
              </div>
              <div className="w-8 h-px bg-gray-300" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium"><Mail className="w-4 h-4" /></div>
                <span className="ml-2 text-sm text-gray-500">{t('partnerOnboarding.steps.email', 'Email')}</span>
              </div>
              <div className="w-8 h-px bg-gray-300" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium"><ClipboardList className="w-4 h-4" /></div>
                <span className="ml-2 text-sm text-gray-500">{t('partnerOnboarding.steps.profile', 'Profil')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              {t('partnerOnboarding.signup.basicInfo', 'Informations de base')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('partnerOnboarding.fields.firstName', 'Prénom')} *</Label>
                <Input id="firstName" value={formData.firstName} onChange={(e) => updateFormData('firstName', e.target.value)} required placeholder="Jean" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('partnerOnboarding.fields.lastName', 'Nom')} *</Label>
                <Input id="lastName" value={formData.lastName} onChange={(e) => updateFormData('lastName', e.target.value)} required placeholder="Dupont" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('partnerOnboarding.fields.email', 'Email professionnel')} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={formData.email} onChange={(e) => updateFormData('email', e.target.value)} required placeholder="contact@monentreprise.com" className="pl-10" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('partnerOnboarding.fields.password', 'Mot de passe')} *</Label>
                <Input id="password" type="password" value={formData.password} onChange={(e) => updateFormData('password', e.target.value)} required placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('partnerOnboarding.fields.confirmPassword', 'Confirmer le mot de passe')} *</Label>
                <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => updateFormData('confirmPassword', e.target.value)} required placeholder="••••••••" />
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox id="acceptTerms" checked={formData.acceptTerms} onCheckedChange={(checked) => updateFormData('acceptTerms', checked)} />
            <Label htmlFor="acceptTerms" className="text-sm leading-tight cursor-pointer flex-1">
              {t('partnerOnboarding.signup.acceptPrefix', 'J’accepte les')}{' '}
              <a href="/legal/terms" target="_blank" className="text-primary underline">{t('partnerOnboarding.signup.terms', 'conditions d’utilisation')}</a>
              {' '}{t('partnerOnboarding.signup.and', 'et la')}{' '}
              <a href="/legal/privacy" target="_blank" className="text-primary underline">{t('partnerOnboarding.signup.privacy', 'politique de confidentialité')}</a>
              {' '}*
            </Label>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>{t('partnerOnboarding.signup.nextSteps', 'Prochaines étapes :')}</strong>
              <ol className="mt-1 ml-5 list-decimal space-y-0.5">
                <li>{t('partnerOnboarding.signup.next1', 'Vérifiez votre email (2 min)')}</li>
                <li>{t('partnerOnboarding.signup.next2', 'Complétez votre profil et votre dossier KYC')}</li>
                <li>{t('partnerOnboarding.signup.next3', 'Validation par notre équipe (24–48h)')}</li>
                <li>{t('partnerOnboarding.signup.next4', 'Accès à votre espace partenaire')}</li>
              </ol>
            </AlertDescription>
          </Alert>

          <Button type="submit" className="w-full" disabled={loading || !isFormValid()}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {t('partnerOnboarding.signup.creating', 'Création du compte...')}
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                {t('partnerOnboarding.signup.submit', 'Créer mon compte partenaire')}
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              <Info className="inline w-4 h-4 mr-1" />
              {t('partnerOnboarding.signup.footer', 'Vous compléterez votre profil détaillé après vérification de votre email')}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PartnerRegistrationStepOne;
