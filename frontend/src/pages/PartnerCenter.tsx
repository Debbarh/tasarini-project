
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { partnerService, PartnerProfile as PartnerProfileType } from '@/services/partnerService';
import { useNavigate } from 'react-router-dom';
import PartnerApplicationForm from '@/components/partner/PartnerApplicationForm';
import PartnerDashboard from '@/components/partner/PartnerDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, Star, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PartnerCenter: React.FC = () => {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [isPartner, setIsPartner] = useState(false);
  const [hasPartnerRole, setHasPartnerRole] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfileType | null>(null);

  useEffect(() => {
    if (user) {
      checkPartnerStatus();
      cleanupOldPOIData();
    }
  }, [user]);

  // Clean up old POI data from localStorage
  const cleanupOldPOIData = () => {
    try {
      const pendingPOIData = localStorage.getItem('pendingPartnerPOI');
      if (pendingPOIData) {
        localStorage.removeItem('pendingPartnerPOI');
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage localStorage:', error);
    }
  };

  const checkPartnerStatus = async () => {
    try {
      if (!user) return;

      // Vérifier si l'utilisateur a le rôle partenaire via AuthContext
      const userHasPartnerRole = hasRole('partner');
      setHasPartnerRole(userHasPartnerRole);

      // Si l'utilisateur n'a pas le rôle partenaire, pas de profil partenaire
      if (!userHasPartnerRole) {
        setIsPartner(false);
        return;
      }

      // Vérifier si l'utilisateur a un profil partenaire via l'API Django
      const partnerProfile = await partnerService.getMyProfile();

      // Si pas de profil partenaire mais a le rôle, afficher en attente
      if (!partnerProfile) {
        setIsPartner(false); // Restera en mode "en attente"
        setPartnerProfile(null);
        return;
      }
      setPartnerProfile(partnerProfile);

      // Gérer les différents statuts
      if (partnerProfile.status === 'rejected' || partnerProfile.status === 'cancelled') {
        // Rediriger vers une page de blocage pour les comptes refusés/annulés
        navigate('/partner-blocked');
        return;
      }

      // Afficher l'espace partenaire pour pending et approved
      setIsPartner(partnerProfile.status === 'approved');
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut partenaire:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-6 md:p-8">
            <Building2 className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm md:text-base text-muted-foreground">
              {t('partnerCenter.loginRequired')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto w-full px-4 py-6 md:py-8">
      {/* Hero Section */}
      <div className="text-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
          {t('partnerCenter.title')}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
          {t('partnerCenter.subtitle')}
        </p>
      </div>

      {/* Affichage conditionnel */}
      {isPartner ? (
        // Dashboard pour les partenaires approuvés
        <>
          {partnerProfile && (
            <PartnerProfileOverview profile={partnerProfile} onEdit={() => navigate('/complete-partner-profile')} />
          )}
          <PartnerDashboard />
        </>
      ) : hasPartnerRole ? (
        // Message pour les partenaires en attente
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center gap-2 justify-center text-lg md:text-xl">
              <Building2 className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
              <span className="text-center">{t('partnerCenter.pending.title')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center px-4">
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              {t('partnerCenter.pending.message')}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mb-4">
              {t('partnerCenter.pending.completeProfile')}
            </p>
            <Button
              onClick={() => navigate('/complete-partner-profile')}
              className="mb-4"
            >
              {t('partnerCenter.pending.completeButton')}
            </Button>
            <div className="p-3 md:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-xs md:text-sm text-orange-800 dark:text-orange-200">
                <strong>{t('partnerCenter.pending.status')} :</strong> {t('partnerCenter.pending.statusPending')}
              </p>
            </div>
            {partnerProfile && (
              <div className="mt-6">
                <PartnerProfileOverview profile={partnerProfile} onEdit={() => navigate('/complete-partner-profile')} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Formulaire de candidature et avantages
        <div className="space-y-6 md:space-y-8">
          {/* Avantages du partenariat */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="h-full">
              <CardContent className="p-4 md:p-6 text-center h-full flex flex-col">
                <Users className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 md:mb-3 text-blue-500" />
                <h3 className="font-semibold mb-2 text-sm md:text-base">{t('partnerCenter.benefits.visibility.title')}</h3>
                <p className="text-xs md:text-sm text-muted-foreground flex-grow">
                  {t('partnerCenter.benefits.visibility.description')}
                </p>
              </CardContent>
            </Card>
            
            <Card className="h-full">
              <CardContent className="p-4 md:p-6 text-center h-full flex flex-col">
                <Star className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 md:mb-3 text-yellow-500" />
                <h3 className="font-semibold mb-2 text-sm md:text-base">{t('partnerCenter.benefits.premium.title')}</h3>
                <p className="text-xs md:text-sm text-muted-foreground flex-grow">
                  {t('partnerCenter.benefits.premium.description')}
                </p>
              </CardContent>
            </Card>
            
            <Card className="h-full md:col-span-1 col-span-1">
              <CardContent className="p-4 md:p-6 text-center h-full flex flex-col">
                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 md:mb-3 text-green-500" />
                <h3 className="font-semibold mb-2 text-sm md:text-base">{t('partnerCenter.benefits.analytics.title')}</h3>
                <p className="text-xs md:text-sm text-muted-foreground flex-grow">
                  {t('partnerCenter.benefits.analytics.description')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Formulaire de candidature */}
          <PartnerApplicationForm onSuccess={checkPartnerStatus} />
        </div>
      )}
    </div>
  );
};

export default PartnerCenter;

const PartnerProfileOverview: React.FC<{ profile: PartnerProfileType; onEdit: () => void }> = ({ profile, onEdit }) => {
  const { t } = useTranslation();
  
  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: t('partnerCenter.profile.status.pending'), color: 'text-orange-500' },
    approved: { label: t('partnerCenter.profile.status.approved'), color: 'text-green-600' },
    suspended: { label: t('partnerCenter.profile.status.suspended'), color: 'text-red-500' },
  };
  const metadata = profile.metadata || {};
  const contactEmail = metadata.contact_email || profile.owner_detail?.email;
  const contactPhone = metadata.contact_phone;
  const subscription = metadata.subscription_type || 'basic';
  const statusInfo = statusLabels[profile.status] || { label: profile.status, color: 'text-muted-foreground' };

  return (
    <Card className="max-w-3xl mx-auto mb-6">
      <CardHeader className="flex flex-col items-center gap-2">
        <CardTitle className="text-lg md:text-xl">{profile.company_name}</CardTitle>
        <p className={`text-sm ${statusInfo.color}`}>{t('partnerCenter.pending.status')} : {statusInfo.label}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t('partnerCenter.profile.contactEmail')}</p>
            <p className="font-medium">{contactEmail || t('partnerCenter.profile.notProvided')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('partnerCenter.profile.phone')}</p>
            <p className="font-medium">{contactPhone || t('partnerCenter.profile.notProvided')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('partnerCenter.profile.website')}</p>
            <p className="font-medium">{profile.website || metadata.website_url || t('partnerCenter.profile.notProvided')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('partnerCenter.profile.subscription')}</p>
            <p className="font-medium text-uppercase">{subscription}</p>
          </div>
        </div>
        {metadata.description && (
          <div>
            <p className="text-muted-foreground text-sm mb-1">{t('partnerCenter.profile.description')}</p>
            <p className="text-sm">{metadata.description}</p>
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={onEdit}>
            {t('partnerCenter.profile.updateButton')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
