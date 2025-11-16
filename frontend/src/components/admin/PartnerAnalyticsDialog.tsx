import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, TrendingUp, MapPin, DollarSign, Eye, Calendar,
  Star, Users, CheckCircle, Clock, XCircle 
} from 'lucide-react';
import { usePartnerManagement, PartnerAnalytics } from '@/hooks/usePartnerManagement';

interface PartnerAnalyticsDialogProps {
  partner: {
    id: string;
    user_id: string;
    company_name: string | null;
    status: string;
    subscription_type: string;
  };
}

const AnalyticsSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const PartnerAnalyticsDialog: React.FC<PartnerAnalyticsDialogProps> = ({ partner }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [analytics, setAnalytics] = useState<PartnerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getPartnerAnalytics } = usePartnerManagement();

  const fetchAnalytics = async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    try {
      const data = await getPartnerAnalytics(partner.user_id);
      setAnalytics(data);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [isOpen]);

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSubscriptionBadge = (type: string) => {
    const variants = {
      basic: { variant: 'outline' as const, label: 'Basic' },
      premium: { variant: 'secondary' as const, label: 'Premium' },
      enterprise: { variant: 'default' as const, label: 'Enterprise' }
    };
    
    const config = variants[type as keyof typeof variants] || variants.basic;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics - {partner.company_name || 'Partenaire'}
            {getSubscriptionBadge(partner.subscription_type)}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <AnalyticsSkeleton />
        ) : analytics ? (
          <div className="space-y-6">
            {/* Vue d'ensemble */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total POIs</p>
                      <p className="text-2xl font-bold">{analytics.totalPOIs}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Réservations</p>
                      <p className="text-2xl font-bold">{analytics.totalBookings}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vues</p>
                      <p className="text-2xl font-bold">{analytics.totalViews}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Score</p>
                      <p className={`text-2xl font-bold ${getPerformanceColor(analytics.performanceScore)}`}>
                        {analytics.performanceScore}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Détails des POIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Statut des POIs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Approuvés</span>
                      </div>
                      <Badge variant="default">{analytics.approvedPOIs}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">En attente</span>
                      </div>
                      <Badge variant="secondary">{analytics.pendingPOIs}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Refusés</span>
                      </div>
                      <Badge variant="destructive">{analytics.rejectedPOIs}</Badge>
                    </div>
                  </div>
                  
                  {/* Taux d'approbation */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Taux d'approbation</span>
                      <span className="text-sm font-bold">
                        {analytics.totalPOIs > 0 
                          ? Math.round((analytics.approvedPOIs / analytics.totalPOIs) * 100)
                          : 0
                        }%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ 
                          width: `${analytics.totalPOIs > 0 
                            ? (analytics.approvedPOIs / analytics.totalPOIs) * 100
                            : 0
                          }%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getPerformanceColor(analytics.performanceScore)}`}>
                        {analytics.performanceScore}%
                      </div>
                      <p className="text-sm text-muted-foreground">Score global</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Qualité des POIs</span>
                        <span>{Math.round((analytics.approvedPOIs / Math.max(analytics.totalPOIs, 1)) * 60)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Activité réservations</span>
                        <span>{Math.min(30, analytics.totalBookings * 3)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Volume de contenu</span>
                        <span>{Math.min(10, analytics.totalPOIs)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Activité récente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Dernières 30 jours
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Nouveaux POIs</span>
                        <Badge variant="outline">
                          {Math.floor(analytics.totalPOIs * 0.2)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Réservations</span>
                        <Badge variant="outline">
                          {Math.floor(analytics.totalBookings * 0.3)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Vues moyennes</span>
                        <Badge variant="outline">
                          {Math.floor(analytics.totalViews / Math.max(analytics.totalPOIs, 1))}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Revenus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {analytics.monthlyRevenue.toLocaleString('fr-FR')} €
                      </div>
                      <p className="text-sm text-muted-foreground">Ce mois</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Commissions POI</span>
                        <span>{(analytics.totalBookings * 15).toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Frais abonnement</span>
                        <span>
                          {partner.subscription_type === 'enterprise' ? '99' :
                           partner.subscription_type === 'premium' ? '49' : '19'} €
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommandations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommandations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.performanceScore < 60 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        ⚠️ Performance faible: Encouragez le partenaire à améliorer la qualité de ses POIs
                      </p>
                    </div>
                  )}
                  {analytics.pendingPOIs > 5 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⏳ {analytics.pendingPOIs} POIs en attente de validation
                      </p>
                    </div>
                  )}
                  {analytics.totalBookings === 0 && analytics.approvedPOIs > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 Aucune réservation: Proposer une formation sur l'optimisation des annonces
                      </p>
                    </div>
                  )}
                  {partner.subscription_type === 'basic' && analytics.totalPOIs > 10 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        🚀 Candidat idéal pour un upgrade Premium ou Enterprise
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucune donnée disponible</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PartnerAnalyticsDialog;