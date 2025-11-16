import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  Calendar,
  Crown,
  User,
  Save
} from 'lucide-react';
import { partnerService } from '@/services/partnerService';
import { authService } from '@/services/authService';

interface PartnerInfo {
  id: string;
  company_name: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  logo_url?: string;
  status: string;
  subscription_type?: string;
  subscription_start?: string;
  subscription_end?: string;
  metadata: Record<string, unknown>;
}

interface ProfileInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

const PartnerProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPartnerInfo();
      fetchProfileInfo();
    }
  }, [user]);

  const fetchPartnerInfo = async () => {
    try {
      const profile = await partnerService.getMyProfile();
      if (!profile) {
        setPartnerInfo(null);
        return;
      }
      const metadata = profile.metadata || {};
      const info: PartnerInfo = {
        id: profile.id,
        company_name: profile.company_name || '',
        description: (metadata.description as string) || '',
        contact_email: (metadata.contact_email as string) || user?.email || '',
        contact_phone: (metadata.contact_phone as string) || '',
        website_url: profile.website || (metadata.website_url as string) || '',
        logo_url: (metadata.logo_url as string) || '',
        status: profile.status,
        subscription_type: (metadata.subscription_type as string) || 'basic',
        subscription_start: (metadata.subscription_start as string) || '',
        subscription_end: (metadata.subscription_end as string) || '',
        metadata,
      };
      setPartnerInfo(info);
    } catch (error) {
      console.error('Erreur lors du chargement des informations partenaire:', error);
    }
  };

  const fetchProfileInfo = async () => {
    try {
      const profile = await authService.getMyProfile();
      if (profile) {
        setProfileInfo({
          id: profile.id,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || '',
        });
      } else {
        setProfileInfo(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePartnerInfo = async () => {
    if (!partnerInfo) return;

    setSaving(true);
    try {
      const metadata = {
        ...partnerInfo.metadata,
        description: partnerInfo.description,
        contact_email: partnerInfo.contact_email,
        contact_phone: partnerInfo.contact_phone,
        website_url: partnerInfo.website_url,
        logo_url: partnerInfo.logo_url,
      };

      await partnerService.updateProfile(partnerInfo.id, {
        company_name: partnerInfo.company_name,
        website: partnerInfo.website_url,
        metadata,
      });

      setPartnerInfo((prev) =>
        prev ? { ...prev, metadata } : prev
      );
      toast.success('Informations partenaire mises à jour');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const saveProfileInfo = async () => {
    if (!profileInfo) return;

    setSaving(true);
    try {
      await authService.updateProfile(profileInfo.id, {
        first_name: profileInfo.first_name,
        last_name: profileInfo.last_name,
        email: profileInfo.email,
      });
      toast.success('Profil personnel mis à jour');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approuvé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getSubscriptionBadge = (type: string) => {
    switch (type) {
      case 'enterprise':
        return <Badge variant="default" className="bg-purple-500">
          <Crown className="w-3 h-3 mr-1" />
          Enterprise
        </Badge>;
      case 'premium':
        return <Badge variant="default" className="bg-blue-500">Premium</Badge>;
      case 'basic':
        return <Badge variant="outline">Basic</Badge>;
      default:
        return <Badge variant="outline">Aucun</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres du profil</h1>
        <p className="text-muted-foreground">Gérez vos informations personnelles et d'entreprise</p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company">Entreprise</TabsTrigger>
          <TabsTrigger value="personal">Personnel</TabsTrigger>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informations de l'entreprise
              </CardTitle>
              <CardDescription>
                Gérez les informations de votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nom de l'entreprise</Label>
                  <Input
                    id="company_name"
                    value={partnerInfo?.company_name || ''}
                    onChange={(e) => setPartnerInfo(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <div>
                    {partnerInfo && getStatusBadge(partnerInfo.status)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={partnerInfo?.description || ''}
                  onChange={(e) => setPartnerInfo(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Décrivez votre entreprise et vos services"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email de contact</Label>
                  <div className="flex">
                    <Mail className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                    <Input
                      id="contact_email"
                      type="email"
                      value={partnerInfo?.contact_email || ''}
                      onChange={(e) => setPartnerInfo(prev => prev ? { ...prev, contact_email: e.target.value } : null)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Téléphone</Label>
                  <div className="flex">
                    <Phone className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                    <Input
                      id="contact_phone"
                      value={partnerInfo?.contact_phone || ''}
                      onChange={(e) => setPartnerInfo(prev => prev ? { ...prev, contact_phone: e.target.value } : null)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Site web</Label>
                <div className="flex">
                  <Globe className="w-4 h-4 mr-2 mt-3 text-muted-foreground" />
                  <Input
                    id="website_url"
                    type="url"
                    value={partnerInfo?.website_url || ''}
                    onChange={(e) => setPartnerInfo(prev => prev ? { ...prev, website_url: e.target.value } : null)}
                    placeholder="https://www.votre-site.com"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={savePartnerInfo} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Gérez vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input
                    id="first_name"
                    value={profileInfo?.first_name || ''}
                    onChange={(e) => setProfileInfo(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    value={profileInfo?.last_name || ''}
                    onChange={(e) => setProfileInfo(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileInfo?.email || ''}
                  onChange={(e) => setProfileInfo(prev => prev ? { ...prev, email: e.target.value } : null)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveProfileInfo} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Abonnement
              </CardTitle>
              <CardDescription>
                Informations sur votre abonnement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Type d'abonnement</Label>
                  <div>
                    {partnerInfo && getSubscriptionBadge(partnerInfo.subscription_type)}
                  </div>
                </div>
                
                {partnerInfo?.subscription_start && (
                  <div className="space-y-3">
                    <Label>Date de début</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(partnerInfo.subscription_start).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {partnerInfo?.subscription_end && (
                <div className="space-y-3">
                  <Label>Date d'expiration</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(partnerInfo.subscription_end).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold">Avantages de votre abonnement</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {partnerInfo?.subscription_type === 'enterprise' && (
                    <>
                      <div>• Commission réduite (10%)</div>
                      <div>• Support prioritaire</div>
                      <div>• Analytics avancés</div>
                      <div>• Points d'intérêt illimités</div>
                    </>
                  )}
                  {partnerInfo?.subscription_type === 'premium' && (
                    <>
                      <div>• Commission réduite (12%)</div>
                      <div>• Analytics de base</div>
                      <div>• Jusqu'à 10 points d'intérêt</div>
                    </>
                  )}
                  {partnerInfo?.subscription_type === 'basic' && (
                    <>
                      <div>• Commission standard (15%)</div>
                      <div>• Jusqu'à 3 points d'intérêt</div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerProfileSettings;
