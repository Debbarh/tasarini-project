import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Building2, Mail, Phone, Clock, CheckCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { partnerOnboardingStorage } from '@/services/partnerOnboardingStorage';

const PartnerRegistrationStepOne: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  // Données minimales pour l'inscription
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    companyName: '',
    contactPhone: '',
    businessType: '',
    acceptTerms: false
  });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const businessTypes = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'hotel', label: 'Hôtel' },
    { value: 'cafe', label: 'Café' },
    { value: 'bar', label: 'Bar / Pub' },
    { value: 'museum', label: 'Musée / Galerie' },
    { value: 'activity', label: 'Activité / Loisir' },
    { value: 'shop', label: 'Boutique / Commerce' },
    { value: 'transport', label: 'Transport / Logistique' },
    { value: 'service', label: 'Service touristique' },
    { value: 'autre', label: 'Autre' }
  ];

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.firstName.trim()) errors.push('Le prénom est requis.');
    if (!formData.lastName.trim()) errors.push('Le nom est requis.');
    if (!formData.companyName.trim()) errors.push('Le nom de l’entreprise est requis.');
    if (!formData.contactPhone.trim()) errors.push('Le téléphone est requis.');
    if (!formData.businessType.trim()) errors.push('Le type d’activité est requis.');
    if (!formData.email.trim()) errors.push('L’email est requis.');
    if (!formData.dateOfBirth) errors.push('La date de naissance est requise.');
    if (!formData.acceptTerms) errors.push('Vous devez accepter les conditions.');

    if (formData.password !== formData.confirmPassword) {
      errors.push('Les mots de passe ne correspondent pas.');
    }

    if (formData.password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères.');
    }
    if (!/[A-Z]/.test(formData.password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule.');
    }
    if (!/[a-z]/.test(formData.password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule.');
    }
    if (!/\d/.test(formData.password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre.');
    }
    if (!/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/]/.test(formData.password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial.');
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
      // Inscription avec profil incomplet
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        'partner',
        formData.dateOfBirth,
        formData.acceptTerms, // termsAccepted
        formData.acceptTerms, // privacyAccepted
        '1.0', // privacyPolicyVersion
        false // marketingConsent
      );

      if (error) {
        const emailError = error?.payload?.email?.[0];
        const detailError = error?.payload?.detail;
        toast.error(emailError || detailError || 'Erreur lors de l’inscription partenaire');
        return;
      }

      // Stocker les données temporaires pour l'étape 2
      partnerOnboardingStorage.save({
        companyName: formData.companyName,
        contactPhone: formData.contactPhone,
        businessType: formData.businessType,
        email: formData.email,
      });

      setSignupSuccess(true);
      setSentEmail(formData.email);

    } catch (error: any) {
      console.error('Erreur inscription partenaire étape 1:', error);
      toast.error(`Erreur: ${error.message}`);
      setSignupSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return formData.email && 
           formData.password && 
           formData.confirmPassword &&
           formData.firstName &&
           formData.lastName &&
           formData.dateOfBirth &&
           formData.companyName &&
           formData.contactPhone &&
           formData.businessType &&
           formData.acceptTerms;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Building2 className="w-6 h-6 text-primary" />
          Rejoignez Tasarini en tant que Partenaire
        </CardTitle>
        <p className="text-muted-foreground">
          Inscription rapide en 2 minutes - Complétez votre profil après vérification
        </p>
      </CardHeader>
      <CardContent>
        {signupSuccess && (
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20">
            <AlertDescription className="space-y-2">
              <p>
                Un email de vérification a été envoyé à <strong>{sentEmail}</strong>.
                Cliquez sur le lien reçu pour activer votre compte partenaire.
              </p>
              <p className="text-xs text-muted-foreground">
                Une fois vérifié, revenez sur cette page pour compléter votre profil étape par étape.
              </p>
            </AlertDescription>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/verify-email-required')}
              >
                Besoin d’un nouveau lien ?
              </Button>
            </div>
          </Alert>
        )}
        {formErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {formErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Étapes du processus */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-primary">Inscription</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  ✉️
                </div>
                <span className="ml-2 text-sm text-gray-500">Email</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  📋
                </div>
                <span className="ml-2 text-sm text-gray-500">Profil</span>
              </div>
            </div>
          </div>

          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Informations de base
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  required
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  required
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date de naissance *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  required
                  placeholder="contact@monentreprise.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Informations entreprise de base */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Votre établissement
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de votre établissement *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => updateFormData('companyName', e.target.value)}
                required
                placeholder="Restaurant Le Gourmand, Hôtel des Roses..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Téléphone de contact *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => updateFormData('contactPhone', e.target.value)}
                  required
                  placeholder="+33 1 23 45 67 89"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Type d'établissement *</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => updateFormData('businessType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le type de votre établissement" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptTerms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => updateFormData('acceptTerms', checked)}
              />
              <Label htmlFor="acceptTerms" className="text-sm leading-tight cursor-pointer flex-1">
                J'accepte les{' '}
                <a href="/legal/terms" target="_blank" className="text-primary underline">
                  conditions d'utilisation
                </a>
                {' '}et la{' '}
                <a href="/legal/privacy" target="_blank" className="text-primary underline">
                  politique de confidentialité
                </a>
                {' '}partenaire *
              </Label>
            </div>
          </div>

          {/* Information sur le processus */}
          <Alert className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Prochaines étapes :</strong><br />
              1️⃣ Vérifiez votre email (2 min)<br />
              2️⃣ Complétez votre profil (optionnel)<br />
              3️⃣ Validation par notre équipe (24-48h)<br />
              4️⃣ Accès à votre dashboard partenaire
            </AlertDescription>
          </Alert>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !isFormValid()}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Création du compte...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Créer mon compte partenaire
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              <Info className="inline w-4 h-4 mr-1" />
              Vous pourrez compléter votre profil détaillé après vérification de votre email
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PartnerRegistrationStepOne;
