import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Camera, 
  FileText, 
  CreditCard,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { partnerService } from '@/services/partnerService';
import { partnerOnboardingStorage } from '@/services/partnerOnboardingStorage';

const BUSINESS_TYPES = [
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

interface Step {
  id: number;
  title: string;
  required: boolean;
  icon: React.ReactNode;
}

const CompletePartnerProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [skipMode, setSkipMode] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  
  // Données du profil partenaire
  const [profileData, setProfileData] = useState({
    // Données récupérées du localStorage
    companyName: '',
    contactPhone: '',
    businessType: '',
    
    // Étape 1 - Informations générales
    description: '',
    website: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    },
    
    // Étape 2 - Localisation  
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    
    // Étape 3 - Détails business
    businessHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '09:00', close: '18:00', closed: true }
    },
    specialties: [] as string[],
    priceRange: 'medium',
    
    // Étape 4 - Documents (optionnel)
    businessLicense: null as File | null,
    logo: null as File | null,
    photos: [] as File[],
    
    // Informations bancaires (optionnel)
    bankDetails: {
      iban: '',
      bic: '',
      accountHolder: ''
    }
  });

  const steps: Step[] = [
    { 
      id: 1, 
      title: "Informations générales", 
      required: true,
      icon: <Building2 className="w-5 h-5" />
    },
    { 
      id: 2, 
      title: "Localisation", 
      required: true,
      icon: <MapPin className="w-5 h-5" />
    },
    { 
      id: 3, 
      title: "Détails business", 
      required: false,
      icon: <FileText className="w-5 h-5" />
    },
    { 
      id: 4, 
      title: "Documents & Photos", 
      required: false,
      icon: <Camera className="w-5 h-5" />
    }
  ];

  useEffect(() => {
    const draft = partnerOnboardingStorage.load();
    if (Object.keys(draft).length) {
      setProfileData((prev) => ({
        ...prev,
        companyName: draft.companyName || prev.companyName,
        contactPhone: draft.contactPhone || prev.contactPhone,
        businessType: draft.businessType || prev.businessType,
        description: draft.description || prev.description,
        website: draft.website || prev.website,
        socialMedia: {
          facebook: draft.socialMedia?.facebook || prev.socialMedia.facebook,
          instagram: draft.socialMedia?.instagram || prev.socialMedia.instagram,
          twitter: draft.socialMedia?.twitter || prev.socialMedia.twitter,
        },
        address: draft.address || prev.address,
        city: draft.city || prev.city,
        postalCode: draft.postalCode || prev.postalCode,
        country: draft.country || prev.country,
      }));
    }
  }, []);

  const persistDraftField = (field: string, value: any) => {
    const patch: Record<string, any> = {};
    switch (field) {
      case 'companyName':
        patch.companyName = value;
        break;
      case 'contactPhone':
        patch.contactPhone = value;
        break;
      case 'businessType':
        patch.businessType = value;
        break;
      case 'description':
        patch.description = value;
        break;
      case 'website':
        patch.website = value;
        break;
      case 'address':
        patch.address = value;
        break;
      case 'city':
        patch.city = value;
        break;
      case 'postalCode':
        patch.postalCode = value;
        break;
      case 'country':
        patch.country = value;
        break;
      default:
        if (field.startsWith('socialMedia.')) {
          const [, key] = field.split('.');
          patch.socialMedia = { [key]: value };
        }
        break;
    }
    if (Object.keys(patch).length > 0) {
      partnerOnboardingStorage.save(patch);
    }
  };

  const updateProfileData = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setProfileData(prev => ({ ...prev, [field]: value }));
    }
    persistDraftField(field, value);
  };

  const validateBeforeSubmit = (allowPartial = false) => {
    const errors: string[] = [];
    if (!profileData.companyName.trim()) errors.push("Le nom de l'entreprise est requis.");
    if (!profileData.contactPhone.trim()) errors.push('Le numéro de téléphone est requis.');
    if (!profileData.businessType.trim()) errors.push("Le type d'activité est requis.");
    if (!allowPartial) {
      if (!profileData.description.trim()) errors.push('La description est obligatoire.');
      if (!profileData.address.trim()) errors.push("L'adresse est obligatoire.");
      if (!profileData.city.trim()) errors.push('La ville est obligatoire.');
      if (!profileData.postalCode.trim()) errors.push('Le code postal est obligatoire.');
    }
    return errors;
  };

  const getCompletionPercentage = () => {
    const requiredFields = [
      'companyName', 'businessType', 'contactPhone', // Déjà remplis
      'description', // Étape 1
      'address', 'city', 'postalCode' // Étape 2
    ];
    
    let completed = 3; // companyName, businessType, contactPhone déjà remplis
    
    if (profileData.description) completed++;
    if (profileData.address) completed++;
    if (profileData.city) completed++;
    if (profileData.postalCode) completed++;
    
    // Bonus pour les champs optionnels
    if (profileData.website) completed += 0.5;
    if (profileData.socialMedia.facebook || profileData.socialMedia.instagram) completed += 0.5;
    
    return Math.round((completed / requiredFields.length) * 100);
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return profileData.description.trim().length > 0;
      case 2:
        return profileData.address && profileData.city && profileData.postalCode;
      case 3:
        return true; // Optionnel
      case 4:
        return true; // Optionnel
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipForNow = async () => {
    setSkipMode(true);
    await handleFinalSubmit(true);
  };

  const handleFinalSubmit = async (isSkipping = false) => {
    setLoading(true);

    try {
      const errors = validateBeforeSubmit(isSkipping);
      if (errors.length > 0) {
        setFormErrors(errors);
        setLoading(false);
        return;
      }
      setFormErrors([]);
      setSubmissionMessage(null);

      const metadata = {
        description: profileData.description,
        contact_phone: profileData.contactPhone,
        website_url: profileData.website,
        business_type: profileData.businessType,
        address: profileData.address,
        city: profileData.city,
        postal_code: profileData.postalCode,
        country: profileData.country,
        social_media: profileData.socialMedia,
        business_hours: profileData.businessHours,
        specialties: profileData.specialties,
        price_range: profileData.priceRange,
        bank_details: profileData.bankDetails,
        profile_completed_at: isSkipping ? null : new Date().toISOString(),
        completion_percentage: getCompletionPercentage()
      };

      // Créer le profil partenaire
      await partnerService.createProfile({
        company_name: profileData.companyName,
        website: profileData.website || undefined,
        metadata
      });

      // Nettoyer le localStorage
      partnerOnboardingStorage.clear();

      if (isSkipping) {
        toast.success('Profil sauvegardé ! Vous pourrez le compléter depuis votre dashboard.');
        setSubmissionMessage(
          'Profil sauvegardé partiellement. Vous pourrez le compléter depuis votre dashboard.'
        );
      } else {
        toast.success('Profil partenaire complété avec succès !');
        setSubmissionMessage('Votre profil est soumis et en attente de validation par notre équipe.');
      }

      // Redirection vers le centre partenaire
      navigate('/partner-center');

    } catch (error: any) {
      console.error('Erreur lors de la finalisation du profil:', error);
      const errorDetail =
        error?.payload?.detail ||
        error?.payload?.company_name?.[0] ||
        error?.payload?.metadata?.[0] ||
        error?.message;
      toast.error(errorDetail || 'Erreur lors de la sauvegarde du profil');
      if (errorDetail) {
        setFormErrors([errorDetail]);
      }
    } finally {
      setLoading(false);
      setSkipMode(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Nom de l'entreprise *</Label>
          <Input
            id="companyName"
            value={profileData.companyName}
            onChange={(e) => updateProfileData('companyName', e.target.value)}
            placeholder="Restaurant Le Gourmet"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Téléphone *</Label>
          <Input
            id="contactPhone"
            value={profileData.contactPhone}
            onChange={(e) => updateProfileData('contactPhone', e.target.value)}
            placeholder="+33 1 23 45 67 89"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessType">Type d'activité *</Label>
        <Select 
          value={profileData.businessType}
          onValueChange={(value) => updateProfileData('businessType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez une activité" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description de votre établissement *</Label>
        <Textarea
          id="description"
          value={profileData.description}
          onChange={(e) => updateProfileData('description', e.target.value)}
          placeholder="Décrivez votre établissement, vos spécialités, ce qui vous rend unique..."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Cette description sera visible par les utilisateurs sur votre profil.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Site web</Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="website"
            type="url"
            value={profileData.website}
            onChange={(e) => updateProfileData('website', e.target.value)}
            placeholder="https://www.monsite.com"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Réseaux sociaux (optionnel)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Page Facebook"
            value={profileData.socialMedia.facebook}
            onChange={(e) => updateProfileData('socialMedia.facebook', e.target.value)}
          />
          <Input
            placeholder="Compte Instagram"
            value={profileData.socialMedia.instagram}
            onChange={(e) => updateProfileData('socialMedia.instagram', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Adresse complète *</Label>
        <Input
          id="address"
          value={profileData.address}
          onChange={(e) => updateProfileData('address', e.target.value)}
          placeholder="123 Rue de la République"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ville *</Label>
          <Input
            id="city"
            value={profileData.city}
            onChange={(e) => updateProfileData('city', e.target.value)}
            placeholder="Paris"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Code postal *</Label>
          <Input
            id="postalCode"
            value={profileData.postalCode}
            onChange={(e) => updateProfileData('postalCode', e.target.value)}
            placeholder="75001"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Pays</Label>
        <Select
          value={profileData.country}
          onValueChange={(value) => updateProfileData('country', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="France">France</SelectItem>
            <SelectItem value="Belgique">Belgique</SelectItem>
            <SelectItem value="Suisse">Suisse</SelectItem>
            <SelectItem value="Canada">Canada</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Gamme de prix</Label>
        <Select
          value={profileData.priceRange}
          onValueChange={(value) => updateProfileData('priceRange', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="budget">Budget (€)</SelectItem>
            <SelectItem value="medium">Moyen (€€)</SelectItem>
            <SelectItem value="premium">Premium (€€€)</SelectItem>
            <SelectItem value="luxury">Luxe (€€€€)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Ces informations sont optionnelles mais aident les utilisateurs à mieux comprendre votre offre.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Camera className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Photos et documents :</strong><br />
          Vous pourrez ajouter photos, logo et documents directement depuis votre dashboard après validation.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Informations bancaires (optionnel)</Label>
          <p className="text-sm text-muted-foreground">
            Pour les paiements et commissions futures
          </p>
          <Input
            placeholder="Titulaire du compte"
            value={profileData.bankDetails.accountHolder}
            onChange={(e) => updateProfileData('bankDetails.accountHolder', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {submissionMessage && (
        <Alert className="max-w-4xl mx-auto">
          <AlertDescription>{submissionMessage}</AlertDescription>
        </Alert>
      )}
      {formErrors.length > 0 && (
        <Alert variant="destructive" className="max-w-4xl mx-auto">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {formErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Complétez votre profil partenaire
          </CardTitle>
          <Badge variant="secondary">
            {getCompletionPercentage()}% complété
          </Badge>
        </div>
        <Progress value={getCompletionPercentage()} className="mt-2" />
      </CardHeader>

      <CardContent>
        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center space-x-2 ${
                  currentStep === step.id ? 'text-primary' : 
                  currentStep > step.id ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step.id ? 'bg-primary text-primary-foreground' :
                    currentStep > step.id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-medium">{step.title}</p>
                    {!step.required && (
                      <p className="text-xs text-muted-foreground">Optionnel</p>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 h-px bg-gray-300 mx-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenu de l'étape courante */}
        <div className="min-h-[300px]">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {steps[currentStep - 1].icon}
            {steps[currentStep - 1].title}
            {!steps[currentStep - 1].required && (
              <Badge variant="outline">Optionnel</Badge>
            )}
          </h3>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          {/* Validation de l'étape */}
          {steps[currentStep - 1].required && !canProceedToNextStep() && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Veuillez remplir les champs obligatoires pour continuer.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <div className="flex items-center space-x-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevStep}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!steps[currentStep - 1].required && (
              <Button variant="ghost" onClick={handleSkipForNow} disabled={loading}>
                <SkipForward className="w-4 h-4 mr-2" />
                {skipMode ? 'Sauvegarde...' : 'Compléter plus tard'}
              </Button>
            )}
            
            {currentStep < steps.length ? (
              <Button 
                onClick={handleNextStep}
                disabled={steps[currentStep - 1].required && !canProceedToNextStep()}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={() => handleFinalSubmit(false)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Finalisation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finaliser mon profil
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Information de bas */}
        <Alert className="mt-4 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Votre profil sera examiné par notre équipe sous 24-48h.</strong><br />
            Vous recevrez un email de confirmation une fois votre compte validé.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
    </div>
  );
};

export default CompletePartnerProfile;
