import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { subscriptionService } from '@/services/subscriptionService';
import { 
  Crown, 
  Check, 
  Star, 
  Zap, 
  TrendingUp,
  MapPin,
  Camera,
  BarChart3,
  Users,
  Globe,
  Headphones
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing: 'monthly' | 'yearly';
  features: string[];
  limits: {
    points: number;
    photos: number;
    analytics: boolean;
    support: string;
    featured: number;
  };
  popular?: boolean;
  current?: boolean;
}

const PartnerSubscriptionManager: React.FC = () => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: billingCycle === 'monthly' ? 29 : 290,
      billing: billingCycle,
      current: true,
      features: [
        'Jusqu\'à 3 points d\'intérêt',
        '5 photos par point',
        'Profil partenaire',
        'Support par email'
      ],
      limits: {
        points: 3,
        photos: 5,
        analytics: false,
        support: 'Email',
        featured: 0
      }
    },
    {
      id: 'premium',
      name: 'Premium',
      price: billingCycle === 'monthly' ? 79 : 790,
      billing: billingCycle,
      popular: true,
      features: [
        'Jusqu\'à 10 points d\'intérêt',
        '20 photos par point',
        'Analytics avancées',
        'Mise en avant prioritaire',
        'Support prioritaire',
        'Badge premium'
      ],
      limits: {
        points: 10,
        photos: 20,
        analytics: true,
        support: 'Prioritaire',
        featured: 2
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: billingCycle === 'monthly' ? 199 : 1990,
      billing: billingCycle,
      features: [
        'Points d\'intérêt illimités',
        'Photos illimitées',
        'Analytics personnalisées',
        'API access',
        'Support dédié 24/7',
        'Branding personnalisé',
        'Mise en avant garantie'
      ],
      limits: {
        points: -1, // unlimited
        photos: -1, // unlimited
        analytics: true,
        support: 'Dédié 24/7',
        featured: -1 // unlimited
      }
    }
  ];

  const currentUsage = {
    points: 2,
    photos: 12,
    views: 1250,
    bookings: 23
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const response = await subscriptionService.createCheckoutSession(planId, billingCycle);
      if (response?.url) {
        window.open(response.url, '_blank');
      } else {
        throw new Error('URL de paiement manquante');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du checkout:', error);
      toast.error(error?.message || 'Erreur lors de l\'initialisation du paiement');
    }
  };

  const handleDowngrade = (planId: string) => {
    toast.success(`Changement vers ${planId} programmé pour la prochaine période de facturation`);
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Gestion d'Abonnement</h1>
        <p className="text-muted-foreground">
          Choisissez le plan qui correspond le mieux à vos besoins
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('monthly')}
          >
            Mensuel
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('yearly')}
          >
            Annuel
            <Badge variant="secondary" className="ml-2">-20%</Badge>
          </Button>
        </div>
      </div>

      {/* Current Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Utilisation Actuelle
          </CardTitle>
          <CardDescription>
            Votre utilisation sur le plan Basic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Points d'intérêt</span>
                <span className="text-sm text-muted-foreground">
                  {currentUsage.points} / 3
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(currentUsage.points, 3)} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Photos uploadées</span>
                <span className="text-sm text-muted-foreground">
                  {currentUsage.photos} / 15
                </span>
              </div>
              <Progress 
                value={getUsagePercentage(currentUsage.photos, 15)} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Vues ce mois</span>
                <span className="text-sm text-muted-foreground">
                  {currentUsage.views.toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-green-600">↗ +15% vs mois dernier</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Réservations</span>
                <span className="text-sm text-muted-foreground">
                  {currentUsage.bookings}
                </span>
              </div>
              <div className="text-sm text-green-600">↗ +8% vs mois dernier</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {subscriptionPlans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge variant="default" className="bg-primary">
                  <Star className="w-3 h-3 mr-1" />
                  Populaire
                </Badge>
              </div>
            )}
            
            {plan.current && (
              <div className="absolute -top-3 right-4">
                <Badge variant="secondary">
                  <Check className="w-3 h-3 mr-1" />
                  Actuel
                </Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                {plan.id === 'enterprise' && <Crown className="w-5 h-5 text-yellow-500" />}
                {plan.id === 'premium' && <Zap className="w-5 h-5 text-blue-500" />}
                {plan.id === 'basic' && <TrendingUp className="w-5 h-5 text-green-500" />}
                {plan.name}
              </CardTitle>
              <div className="space-y-1">
                <div className="text-3xl font-bold">
                  {plan.price}€
                  <span className="text-lg font-normal text-muted-foreground">
                    /{billingCycle === 'monthly' ? 'mois' : 'an'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-sm text-green-600">
                    Économisez {Math.round(plan.price * 0.2)}€ par rapport au mensuel
                  </p>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Features */}
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Limits */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Points d'intérêt
                  </span>
                  <span className="font-medium">
                    {plan.limits.points === -1 ? 'Illimité' : plan.limits.points}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Photos par point
                  </span>
                  <span className="font-medium">
                    {plan.limits.photos === -1 ? 'Illimité' : plan.limits.photos}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </span>
                  <span className="font-medium">
                    {plan.limits.analytics ? 'Inclus' : 'Basic'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    Support
                  </span>
                  <span className="font-medium">{plan.limits.support}</span>
                </div>
              </div>

              <Separator />

              {/* Action Button */}
              <div className="space-y-2">
                {plan.current ? (
                  <Button variant="outline" className="w-full" disabled>
                    Plan Actuel
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {plan.id === 'basic' ? 'Rétrograder' : 'Choisir ce plan'}
                  </Button>
                )}
                
                {plan.popular && (
                  <p className="text-xs text-center text-muted-foreground">
                    Essai gratuit de 14 jours inclus
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Questions Fréquentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">Puis-je changer de plan à tout moment ?</h4>
            <p className="text-sm text-muted-foreground">
              Oui, vous pouvez upgrader immédiatement ou programmer un downgrade pour la prochaine période.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-1">Que se passe-t-il si je dépasse mes limites ?</h4>
            <p className="text-sm text-muted-foreground">
              Nous vous préviendrons avant d'atteindre vos limites et vous proposerons de passer au plan supérieur.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-1">Y a-t-il une période d'engagement ?</h4>
            <p className="text-sm text-muted-foreground">
              Non, vous pouvez annuler votre abonnement à tout moment. Les plans annuels offrent simplement une remise.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerSubscriptionManager;
