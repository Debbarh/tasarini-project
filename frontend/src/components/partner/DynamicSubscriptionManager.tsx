import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { partnerService } from '@/services/partnerService';
import { 
  Check, 
  Crown, 
  Star, 
  Shield, 
  Zap,
  Users,
  BarChart3,
  CreditCard,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_tourist_points: number;
  commission_rate: number;
  features: string[];
  is_active: boolean;
  display_order: number;
}

interface PartnerSubscription {
  id: string;
  partner_id: string;
  subscription_type: string;
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date: string;
  status: 'active' | 'cancelled' | 'suspended';
  auto_renew: boolean;
  current_usage: {
    tourist_points: number;
    monthly_bookings: number;
    storage_used: number;
  };
  metadata?: Record<string, unknown>;
}

const DynamicSubscriptionManager: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(AVAILABLE_PLANS);
  const [currentSubscription, setCurrentSubscription] = useState<PartnerSubscription | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);

      const profile = await partnerService.getMyProfile();
      if (!profile) {
        setCurrentSubscription(null);
        return;
      }
      setProfileId(profile.id.toString());
      const metadata = profile.metadata || {};

      let usage = { tourist_points: 0, monthly_bookings: 0, storage_used: 0 };
      if (user?.public_id) {
        try {
          const analytics = await partnerService.getAnalytics(user.public_id);
          usage = {
            tourist_points: analytics.totalPOIs,
            monthly_bookings: analytics.totalBookings,
            storage_used: 0,
          };
        } catch (error) {
          console.warn('Analytics indisponibles:', error);
        }
      }

      const subscriptionType = (metadata.subscription_type as string) || 'basic';
      const billingCycle = (metadata.billing_cycle as 'monthly' | 'yearly') || 'monthly';
      const nextBillingDate =
        (metadata.next_billing_date as string) ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const status = (metadata.subscription_status as 'active' | 'cancelled' | 'suspended') || 'active';
      const autoRenew = metadata.auto_renew !== false;

      setCurrentSubscription({
        id: profile.id.toString(),
        partner_id: profile.owner.toString(),
        subscription_type: subscriptionType,
        billing_cycle: billingCycle,
        next_billing_date: nextBillingDate,
        status,
        auto_renew: autoRenew,
        current_usage: usage,
        metadata,
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des données d\'abonnement:', error);
      toast.error('Erreur lors du chargement des informations d\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const upgradeSubscription = async (planCode: string, billingCycle: 'monthly' | 'yearly') => {
    if (!profileId) return;
    
    try {
      await partnerService.updateSubscription(profileId, planCode);
      const nextBillingDate = new Date(
        billingCycle === 'yearly'
          ? Date.now() + 365 * 24 * 60 * 60 * 1000
          : Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      await partnerService.updateProfile(profileId, {
        metadata: {
          ...(currentSubscription?.metadata || {}),
          subscription_type: planCode,
          billing_cycle: billingCycle,
          next_billing_date: nextBillingDate,
          subscription_status: 'active',
          auto_renew: true,
        },
      });

      toast.success('Abonnement mis à jour avec succès !');
      fetchSubscriptionData();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
      toast.error('Erreur lors de la mise à jour de l\'abonnement');
    }
  };

  const cancelSubscription = async () => {
    try {
      if (!profileId || !currentSubscription) return;
      await partnerService.updateProfile(profileId, {
        metadata: {
          ...(currentSubscription.metadata || {}),
          subscription_status: 'cancelled',
          auto_renew: false,
        },
      });

      toast.success("Abonnement annulé. Il restera actif jusqu'à la fin de la période facturée.");
      fetchSubscriptionData();
    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'abonnement:', error);
      toast.error('Erreur lors de l\'annulation de l\'abonnement');
    }
  };

  const getPlanIcon = (planCode: string) => {
    switch (planCode) {
      case 'basic':
        return <Star className="h-6 w-6 text-blue-500" />;
      case 'premium':
        return <Crown className="h-6 w-6 text-purple-500" />;
      case 'enterprise':
        return <Shield className="h-6 w-6 text-gold-500" />;
      default:
        return <Zap className="h-6 w-6 text-primary" />;
    }
  };

  const getCurrentPlan = () => {
    return plans.find(plan => plan.code === currentSubscription?.subscription_type) || plans[0];
  };

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0; // Illimité
    return Math.min((current / max) * 100, 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="space-y-6">
      {/* Abonnement actuel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getPlanIcon(currentPlan?.code || 'basic')}
              <div>
                <CardTitle className="flex items-center gap-2">
                  Plan {currentPlan?.name}
                  <Badge variant="outline">{currentSubscription?.status}</Badge>
                </CardTitle>
                <CardDescription>
                  {currentPlan?.description} - Commission {((currentPlan?.commission_rate || 0.15) * 100).toFixed(0)}%
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {currentSubscription?.billing_cycle === 'yearly' 
                  ? `${currentPlan?.price_yearly || 290}€/an` 
                  : `${currentPlan?.price_monthly || 29}€/mois`
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Prochain paiement: {new Date(currentSubscription?.next_billing_date || '').toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Utilisation actuelle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Points d'intérêt</span>
                <span className="text-sm text-muted-foreground">
                  {currentSubscription?.current_usage.tourist_points || 0}
                  {currentPlan?.max_tourist_points === -1 ? '' : `/${currentPlan?.max_tourist_points}`}
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(
                  currentSubscription?.current_usage.tourist_points || 0, 
                  currentPlan?.max_tourist_points || 5
                )}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Réservations ce mois</span>
                <span className="text-sm text-muted-foreground">
                  {currentSubscription?.current_usage.monthly_bookings || 0}
                </span>
              </div>
              <Progress value={Math.min((currentSubscription?.current_usage.monthly_bookings || 0) * 2, 100)} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Commission actuelle</span>
                <span className="text-sm font-semibold text-green-600">
                  {((currentPlan?.commission_rate || 0.15) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Plus le plan est élevé, plus la commission est faible
              </div>
            </div>
          </div>

          {/* Alertes */}
          {currentPlan?.max_tourist_points !== -1 && 
           (currentSubscription?.current_usage.tourist_points || 0) >= (currentPlan?.max_tourist_points || 5) * 0.8 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Vous approchez de la limite de votre plan. Considérez une mise à niveau.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = plan.code === currentSubscription?.subscription_type;
          const isUpgrade = plans.findIndex(p => p.code === currentSubscription?.subscription_type) < 
                           plans.findIndex(p => p.code === plan.code);

          return (
            <Card key={plan.id} className={isCurrentPlan ? 'border-primary shadow-lg' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  {getPlanIcon(plan.code)}
                  {isCurrentPlan && <Badge>Actuel</Badge>}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="space-y-1">
                  <p className="text-3xl font-bold">{plan.price_monthly}€<span className="text-base font-normal">/mois</span></p>
                  <p className="text-sm text-muted-foreground">
                    ou {plan.price_yearly}€/an (2 mois gratuits)
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {plan.max_tourist_points === -1 ? 'Points d\'intérêt illimités' : `${plan.max_tourist_points} points d'intérêt`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Commission {(plan.commission_rate * 100).toFixed(0)}%</span>
                  </div>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {!isCurrentPlan && (
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      variant={isUpgrade ? "default" : "outline"}
                      onClick={() => upgradeSubscription(plan.code, 'monthly')}
                    >
                      {isUpgrade ? 'Upgrader' : 'Changer'} - Mensuel
                    </Button>
                    <Button 
                      className="w-full" 
                      variant="secondary"
                      onClick={() => upgradeSubscription(plan.code, 'yearly')}
                    >
                      {isUpgrade ? 'Upgrader' : 'Changer'} - Annuel
                    </Button>
                  </div>
                )}

                {isCurrentPlan && currentSubscription?.status === 'active' && (
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={cancelSubscription}
                  >
                    Annuler l'abonnement
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Historique de facturation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historique de facturation
          </CardTitle>
          <CardDescription>Vos dernières factures et paiements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune facture disponible</p>
            <p className="text-sm text-muted-foreground mt-2">
              Les factures apparaîtront ici une fois les paiements effectués
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicSubscriptionManager;

const AVAILABLE_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_basic',
    code: 'basic',
    name: 'Basic',
    description: 'Idéal pour commencer à publier vos points d\'intérêt',
    price_monthly: 29,
    price_yearly: 290,
    max_tourist_points: 5,
    commission_rate: 0.15,
    features: [
      'Jusqu\'à 5 points d\'intérêt',
      'Support standard',
      'Analytics de base',
    ],
    is_active: true,
    display_order: 1,
  },
  {
    id: 'plan_premium',
    code: 'premium',
    name: 'Premium',
    description: 'Développez votre catalogue et améliorez la visibilité',
    price_monthly: 79,
    price_yearly: 790,
    max_tourist_points: 25,
    commission_rate: 0.12,
    features: [
      '25 points d\'intérêt',
      'Support prioritaire',
      'Analytics avancés',
      'Campagnes marketing',
    ],
    is_active: true,
    display_order: 2,
  },
  {
    id: 'plan_enterprise',
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Pour les réseaux d\'hôtels ou de POI à grande échelle',
    price_monthly: 199,
    price_yearly: 1990,
    max_tourist_points: -1,
    commission_rate: 0.08,
    features: [
      'Points d\'intérêt illimités',
      'Account manager dédié',
      'Intégrations personnalisées',
      'Support 24/7',
    ],
    is_active: true,
    display_order: 3,
  },
];
