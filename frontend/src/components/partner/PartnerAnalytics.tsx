import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { partnerService, PartnerAnalyticsSummary } from '@/services/partnerService';
import { 
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  MapPin,
  Calendar,
  Download,
  Filter,
  AlertCircle,
  Target,
  Clock,
  Star
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface AnalyticsData {
  period: string;
  views: number;
  bookings: number;
  revenue: number;
  rating: number;
  conversion_rate: number;
}

interface PerformanceMetrics {
  total_views: number;
  total_bookings: number;
  total_revenue: number;
  average_rating: number;
  conversion_rate: number;
  growth_rate: number;
  top_performing_point: string;
  peak_hour: string;
}

interface TrafficSource {
  source: string;
  visits: number;
  conversions: number;
  percentage: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

const PartnerAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<PartnerAnalyticsSummary | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
      fetchTrafficSources();
      fetchAlerts();
    }
  }, [user, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      if (!user?.public_id) return;
      setLoading(true);

      const summary = await partnerService.getAnalytics(user.public_id);
      setAnalyticsSummary(summary);

      const processedData = generateSyntheticTimeline(summary, timeRange);
      setAnalyticsData(processedData);
      setPerformanceMetrics(buildPerformanceMetrics(summary));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrafficSources = async () => {
    try {
      const mockSources: TrafficSource[] = [
        { source: 'Recherche Google', visits: 4250, conversions: 289, percentage: 34.1 },
        { source: 'Réseaux sociaux', visits: 3120, conversions: 187, percentage: 25.0 },
        { source: 'Direct', visits: 2890, conversions: 201, percentage: 23.2 },
        { source: 'Référencement', visits: 1540, conversions: 98, percentage: 12.4 },
        { source: 'Email marketing', visits: 650, conversions: 81, percentage: 5.3 }
      ];

      setTrafficSources(mockSources);
    } catch (error) {
      console.error('Error fetching traffic sources:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const mockAlerts: Alert[] = [
        {
          id: '1',
          type: 'warning',
          title: 'Baisse des conversions',
          message: 'Le taux de conversion a diminué de 12% cette semaine',
          created_at: '2024-01-20T10:30:00Z',
          is_read: false
        },
        {
          id: '2',
          type: 'success',
          title: 'Objectif atteint',
          message: 'Vous avez dépassé votre objectif de revenus mensuel !',
          created_at: '2024-01-19T14:15:00Z',
          is_read: false
        },
        {
          id: '3',
          type: 'info',
          title: 'Nouveau pic de trafic',
          message: 'Record de visiteurs hier avec 1,250 vues',
          created_at: '2024-01-18T09:45:00Z',
          is_read: true
        }
      ];

      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      // Mock export functionality
      toast.success(`Rapport ${format.toUpperCase()} généré et téléchargé`);
    } catch (error) {
      toast.error('Erreur lors de l\'export du rapport');
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, is_read: true } : alert
      )
    );
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <Target className="w-4 h-4 text-green-500" />;
      case 'info': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'warning': return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Attention</Badge>;
      case 'success': return <Badge variant="outline" className="border-green-500 text-green-600">Succès</Badge>;
      case 'info': return <Badge variant="outline" className="border-blue-500 text-blue-600">Info</Badge>;
      case 'error': return <Badge variant="destructive">Erreur</Badge>;
      default: return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Rapports</h1>
          <p className="text-muted-foreground">Analysez vos performances et générez des rapports</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">3 derniers mois</SelectItem>
              <SelectItem value="1y">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{performanceMetrics.total_views.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Vues totales</p>
                </div>
                <Eye className="w-8 h-8 text-blue-500" />
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{performanceMetrics.growth_rate}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{performanceMetrics.total_bookings.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Réservations</p>
                </div>
                <Calendar className="w-8 h-8 text-green-500" />
              </div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-muted-foreground">
                  Taux: {performanceMetrics.conversion_rate}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{performanceMetrics.total_revenue.toLocaleString()}€</p>
                  <p className="text-sm text-muted-foreground">Revenus totaux</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-muted-foreground">
                  Heure de pointe: {performanceMetrics.peak_hour}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{performanceMetrics.average_rating}</p>
                  <p className="text-sm text-muted-foreground">Note moyenne</p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-muted-foreground">
                  Top: {performanceMetrics.top_performing_point}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="traffic">Sources de trafic</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alertes & Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution des revenus et conversions</CardTitle>
              <CardDescription>Analyse des performances sur la période sélectionnée</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                    name="Revenus (€)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="conversion_rate" 
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Taux de conversion (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Views vs Bookings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vues vs Réservations</CardTitle>
                <CardDescription>Comparaison du trafic et des conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" fill="#3B82F6" name="Vues" />
                    <Bar dataKey="bookings" fill="#10B981" name="Réservations" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Évolution des notes</CardTitle>
                <CardDescription>Satisfaction client sur la période</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke="#F59E0B"
                      strokeWidth={3}
                      dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                      name="Note moyenne"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sources de trafic</CardTitle>
                <CardDescription>Répartition des visiteurs par source</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={trafficSources}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ source, percentage }) => `${source}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="visits"
                    >
                      {trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance par source</CardTitle>
                <CardDescription>Taux de conversion par canal d'acquisition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trafficSources.map((source, index) => {
                    const conversionRate = ((source.conversions / source.visits) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <p className="font-medium">{source.source}</p>
                            <p className="text-sm text-muted-foreground">
                              {source.visits.toLocaleString()} visites
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{conversionRate}%</p>
                          <p className="text-sm text-muted-foreground">
                            {source.conversions} conversions
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rapport de performance détaillé</CardTitle>
              <CardDescription>Métriques avancées et recommandations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Meilleur jour de la semaine</p>
                  <p className="text-2xl font-bold">Samedi</p>
                  <p className="text-sm text-muted-foreground">+45% de conversions</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Durée moyenne de visite</p>
                  <p className="text-2xl font-bold">3m 24s</p>
                  <p className="text-sm text-muted-foreground">+12% ce mois</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Taux de rebond</p>
                  <p className="text-2xl font-bold">32%</p>
                  <p className="text-sm text-muted-foreground">-8% ce mois</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pages vues par session</p>
                  <p className="text-2xl font-bold">2.8</p>
                  <p className="text-sm text-muted-foreground">+0.3 ce mois</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Retour visiteurs</p>
                  <p className="text-2xl font-bold">28%</p>
                  <p className="text-sm text-muted-foreground">Fidélisation</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Score mobile</p>
                  <p className="text-2xl font-bold">92/100</p>
                  <p className="text-sm text-muted-foreground">Excellent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertes et Notifications</CardTitle>
              <CardDescription>Surveillez les changements importants de performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 border rounded-lg ${alert.is_read ? 'opacity-60' : 'bg-muted/30'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            {getAlertBadge(alert.type)}
                            {!alert.is_read && (
                              <Badge variant="outline" className="text-xs">Nouveau</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      {!alert.is_read && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => markAlertAsRead(alert.id)}
                        >
                          Marquer comme lu
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerAnalytics;

const generateSyntheticTimeline = (summary: PartnerAnalyticsSummary | null, range: string): AnalyticsData[] => {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const baseViews = summary ? Math.max(summary.totalViews / days, 50) : 200;
  const baseBookings = summary ? Math.max(summary.totalBookings / days, 5) : 20;
  const baseRevenue = summary ? Math.max(summary.monthlyRevenue / days, 100) : 400;

  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));

    const variance = 0.3 + Math.random() * 0.4;
    const views = Math.round(baseViews * variance);
    const bookings = Math.max(1, Math.round(baseBookings * (variance - 0.1)));
    const revenue = Math.max(50, Math.round(baseRevenue * variance));

    return {
      period: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      views,
      bookings,
      revenue,
      rating: summary ? parseFloat((summary.performanceScore / 20).toFixed(1)) : parseFloat((Math.random() * 2 + 3).toFixed(1)),
      conversion_rate: views > 0 ? parseFloat(((bookings / views) * 100).toFixed(1)) : 0,
    };
  });
};

const buildPerformanceMetrics = (summary: PartnerAnalyticsSummary): PerformanceMetrics => {
  const conversion =
    summary.totalViews > 0 ? parseFloat(((summary.totalBookings / summary.totalViews) * 100).toFixed(1)) : 0;
  return {
    total_views: summary.totalViews,
    total_bookings: summary.totalBookings,
    total_revenue: summary.monthlyRevenue,
    average_rating: parseFloat((summary.performanceScore / 20 || 4).toFixed(1)),
    conversion_rate: conversion,
    growth_rate: parseFloat((summary.performanceScore).toFixed(1)),
    top_performing_point: conversion > 7 ? 'Campagne Premium' : 'Tendance générale',
    peak_hour: '14:00-15:00',
  };
};
