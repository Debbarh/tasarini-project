import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calendar, Eye, TrendingUp, MapPin } from 'lucide-react';
import { partnerService } from '@/services/partnerService';
import { toast } from 'sonner';

interface RealTimeAnalytics {
  date: string;
  views: number;
  clicks: number;
  bookings: number;
  revenue: number;
  unique_visitors: number;
  conversion_rate: number;
}

interface PerformanceMetrics {
  totalViews: number;
  totalClicks: number;
  totalBookings: number;
  totalRevenue: number;
  conversionRate: number;
  avgRevenuePerBooking: number;
  topPerformingPOI: string;
  monthOverMonthGrowth: number;
}

const DynamicPartnerAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<RealTimeAnalytics[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalViews: 0,
    totalClicks: 0,
    totalBookings: 0,
    totalRevenue: 0,
    conversionRate: 0,
    avgRevenuePerBooking: 0,
    topPerformingPOI: '',
    monthOverMonthGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRealTimeAnalytics();
    }
  }, [user]);

  const fetchRealTimeAnalytics = async () => {
    try {
      setLoading(true);
      const [series, metrics] = await Promise.all([
        partnerService.getAnalyticsSeries({ days: 30 }),
        partnerService.getDashboardMetrics(),
      ]);

      const formattedSeries: RealTimeAnalytics[] = series.map((item) => ({
        date: item.date,
        views: item.views,
        clicks: item.clicks,
        bookings: item.bookings,
        revenue: item.revenue,
        unique_visitors: 0,
        conversion_rate: item.views > 0 ? (item.bookings / item.views) * 100 : 0,
      }));

      setAnalytics(formattedSeries);

      const totalViews = formattedSeries.reduce((sum, day) => sum + day.views, 0);
      const totalClicks = formattedSeries.reduce((sum, day) => sum + day.clicks, 0);
      const totalBookings = formattedSeries.reduce((sum, day) => sum + day.bookings, 0);
      const totalRevenue = formattedSeries.reduce((sum, day) => sum + day.revenue, 0);

      const currentMonth = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const currentMonthRevenue = formattedSeries
        .filter((day) => {
          const date = new Date(day.date);
          return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
        })
        .reduce((sum, day) => sum + day.revenue, 0);

      const lastMonthRevenue = formattedSeries
        .filter((day) => {
          const date = new Date(day.date);
          return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
        })
        .reduce((sum, day) => sum + day.revenue, 0);

      const monthOverMonthGrowth =
        lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      setMetrics({
        totalViews,
        totalClicks,
        totalBookings,
        totalRevenue,
        conversionRate: totalViews > 0 ? (totalBookings / totalViews) * 100 : 0,
        avgRevenuePerBooking: totalBookings > 0 ? totalRevenue / totalBookings : 0,
        topPerformingPOI: metrics.top_poi?.name || '',
        monthOverMonthGrowth,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des analytics:', error);
      toast.error("Impossible de charger les données d'analytics.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métriques de performance en temps réel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vues totales</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Taux de conversion: {metrics.conversionRate.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Revenus moyens: {metrics.avgRevenuePerBooking.toFixed(2)}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRevenue.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {metrics.monthOverMonthGrowth >= 0 ? '+' : ''}
              {metrics.monthOverMonthGrowth.toFixed(1)}% vs mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top POI</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{metrics.topPerformingPOI || 'Aucun'}</div>
            <p className="text-xs text-muted-foreground">Meilleur performer</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques analytiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des vues</CardTitle>
            <CardDescription>Vues et taux de conversion sur 30 jours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                  formatter={(value: number, name: string) => [
                    name === 'conversion_rate' ? `${value.toFixed(2)}%` : value.toLocaleString(),
                    name === 'views' ? 'Vues' : 
                    name === 'conversion_rate' ? 'Taux de conversion' : name
                  ]}
                />
                <Line yAxisId="left" type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="conversion_rate" stroke="hsl(var(--destructive))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance financière</CardTitle>
            <CardDescription>Réservations et revenus quotidiens</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? `${value.toFixed(2)}€` : value.toString(),
                    name === 'bookings' ? 'Réservations' : 'Revenus'
                  ]}
                />
                <Bar dataKey="bookings" fill="hsl(var(--primary))" />
                <Bar dataKey="revenue" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights automatiques */}
      <Card>
        <CardHeader>
          <CardTitle>Insights automatiques</CardTitle>
          <CardDescription>Analyses automatisées de vos performances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.conversionRate > 5 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                🎉 Excellent taux de conversion de {metrics.conversionRate.toFixed(2)}% ! 
                Votre contenu attire et convertit bien vos visiteurs.
              </p>
            </div>
          )}
          
          {metrics.monthOverMonthGrowth > 20 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                📈 Croissance exceptionnelle de {metrics.monthOverMonthGrowth.toFixed(1)}% ce mois !
                Continuez sur cette lancée.
              </p>
            </div>
          )}

          {metrics.conversionRate < 2 && metrics.totalViews > 100 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                💡 Taux de conversion faible ({metrics.conversionRate.toFixed(2)}%). 
                Pensez à optimiser vos descriptions et photos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicPartnerAnalytics;
