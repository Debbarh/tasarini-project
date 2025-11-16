import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, Mail, Phone, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { partnerService } from '@/services/partnerService';
import { useEffect } from 'react';

interface PartnerApplicationFormProps {
  onSuccess?: () => void;
}

const PartnerApplicationForm: React.FC<PartnerApplicationFormProps> = ({ onSuccess }) => {
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    company_name: '',
    description: '',
    website_url: '',
    contact_phone: '',
    contact_email: '',
    subscription_type: 'basic'
  });
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfileLoaded(true);
      return;
    }

    let isMounted = true;
    partnerService
      .getMyProfile()
      .then((profile) => {
        if (profile && isMounted) {
          setFormData((prev) => ({
            ...prev,
            company_name: profile.company_name || prev.company_name,
            website_url: profile.website || prev.website_url,
            contact_email: (profile.metadata?.contact_email as string) || prev.contact_email,
            contact_phone: (profile.metadata?.contact_phone as string) || prev.contact_phone,
            description: (profile.metadata?.description as string) || prev.description,
            subscription_type: (profile.metadata?.subscription_type as string) || prev.subscription_type,
          }));
        }
      })
      .catch((error) => {
        console.error('Erreur lors du chargement du profil partenaire:', error);
      })
      .finally(() => {
        if (isMounted) {
          setProfileLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Connectez-vous pour soumettre une candidature partenaire.');
      return;
    }

    setLoading(true);

    try {
      let profile = await partnerService.getMyProfile();
      const metadata = {
        ...(profile?.metadata || {}),
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        subscription_type: formData.subscription_type,
        description: formData.description,
        website_url: formData.website_url,
      };

      const payload = {
        company_name: formData.company_name,
        website: formData.website_url || undefined,
        metadata,
      };

      if (profile) {
        profile = await partnerService.updateProfile(profile.id, payload);
      } else {
        profile = await partnerService.createProfile(payload);
      }

      await partnerService.submitApplication(
        formData.description || `Candidature partenaire pour ${formData.company_name}`
      );

      toast.success('Candidature partenaire soumise avec succès !');
      onSuccess?.();
    } catch (error: any) {
      console.error('❌ Erreur lors de la soumission:', error);
      toast.error(error?.payload?.detail || error?.message || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (authLoading || !profileLoaded) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Chargement...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Veuillez patienter pendant le chargement du formulaire.</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Devenir partenaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Vous devez être connecté pour soumettre une candidature partenaire.
          </p>
          <Button onClick={() => (window.location.href = `/auth?redirectTo=${encodeURIComponent('/partner-center')}`)}>
            Se connecter
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Building2 className="w-6 h-6 text-primary" />
          Devenir Partenaire
        </CardTitle>
        <p className="text-muted-foreground">
          Rejoignez notre réseau de partenaires et commercialisez vos points d'intérêt
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom de l'entreprise */}
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom de l'entreprise *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => updateFormData('company_name', e.target.value)}
              required
              placeholder="Ex: Restaurant Le Gourmand"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description de votre entreprise</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              rows={3}
              placeholder="Décrivez votre activité et ce qui vous rend unique..."
            />
          </div>

          {/* Informations de contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => updateFormData('contact_email', e.target.value)}
                  className="pl-10"
                  placeholder="contact@entreprise.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => updateFormData('contact_phone', e.target.value)}
                  className="pl-10"
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>
          </div>

          {/* Site web */}
          <div className="space-y-2">
            <Label htmlFor="website_url">Site web</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => updateFormData('website_url', e.target.value)}
                className="pl-10"
                placeholder="https://www.votre-site.com"
              />
            </div>
          </div>

          {/* Type d'abonnement */}
          <div className="space-y-2">
            <Label htmlFor="subscription_type">Type d'abonnement souhaité</Label>
            <Select 
              value={formData.subscription_type} 
              onValueChange={(value) => updateFormData('subscription_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">
                  <div className="flex flex-col">
                    <span className="font-medium">Basic - Gratuit</span>
                    <span className="text-xs text-muted-foreground">Badge partenaire, 1 point d'intérêt</span>
                  </div>
                </SelectItem>
                <SelectItem value="premium">
                  <div className="flex flex-col">
                    <span className="font-medium">Premium - 19€/mois</span>
                    <span className="text-xs text-muted-foreground">Mise en avant, 5 points d'intérêt, statistiques</span>
                  </div>
                </SelectItem>
                <SelectItem value="enterprise">
                  <div className="flex flex-col">
                    <span className="font-medium">Enterprise - 49€/mois</span>
                    <span className="text-xs text-muted-foreground">Points illimités, support prioritaire, API</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Information importante */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Important :</strong> Votre candidature sera examinée par notre équipe. 
              Vous recevrez une notification une fois approuvée.
            </p>
          </div>

          {/* Bouton de soumission */}
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Envoi en cours...' : 'Soumettre ma candidature'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PartnerApplicationForm;
