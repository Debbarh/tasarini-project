import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Bell,
  Calendar,
  Download,
  DollarSign,
  Star
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import MobilePartnerStats from './MobilePartnerStats';
import POIManagement from './POIManagement';
import { PartnerBookingSettings } from './PartnerBookingSettings';
import { BookingAnalyticsPanel } from './BookingAnalyticsPanel';
import { PartnerNotificationSystem } from './PartnerNotificationSystem';
import { PartnerEndpointMonitor } from './PartnerEndpointMonitor';
import DynamicPartnerAnalytics from './DynamicPartnerAnalytics';
import DynamicFinancialDashboard from './DynamicFinancialDashboard';
import DynamicSubscriptionManager from './DynamicSubscriptionManager';
import { partnerService } from '@/services/partnerService';

interface PartnerAnalytics {
  id: string;
  date: string;
  views: number;
  clicks: number;
  bookings: number;
  revenue: number;
}

interface PartnerEarnings {
  id: string;
  amount: number;
  commission_rate: number;
  booking_date: string;
  payment_status: string;
  tourist_point_name: string;
}

interface PartnerNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface PartnerStats {
  totalPoints: number;
  totalViews: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  pendingPayments: number;
  thisMonthViews: number;
  thisMonthBookings: number;
  thisMonthRevenue: number;
}

const ResponsivePartnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [analytics, setAnalytics] = useState<PartnerAnalytics[]>([]);
  const [earnings, setEarnings] = useState<PartnerEarnings[]>([]);
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [stats, setStats] = useState<PartnerStats>({
    totalPoints: 0,
    totalViews: 0,
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    pendingPayments: 0,
    thisMonthViews: 0,
    thisMonthBookings: 0,
    thisMonthRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      if (!user?.id) return;

      const [metrics, series, commissionData, notificationData] = await Promise.all([
        partnerService.getDashboardMetrics(),
        partnerService.getAnalyticsSeries({ days: 30 }),
        partnerService.listCommissions({}),
        partnerService.listNotifications({ limit: 10 }),
      ]);

      const analyticsSeries: PartnerAnalytics[] = series.map((item) => ({
        id: item.date,
        date: item.date,
        views: item.views,
        clicks: item.clicks,
        bookings: item.bookings,
        revenue: item.revenue,
      }));

      const earningsData: PartnerEarnings[] = commissionData.map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        commission_rate: Number(item.commission_rate),
        booking_date: item.booking_date,
        payment_status: item.payment_status,
        tourist_point_name: item.tourist_point_name || item.tourist_point_detail?.name || 'Point d’intérêt',
      }));

      const notificationItems: PartnerNotification[] = notificationData.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.body,
        type: item.category,
        is_read: item.is_read,
        created_at: item.created_at,
      }));

      setAnalytics(analyticsSeries);
      setEarnings(earningsData);
      setNotifications(notificationItems);

      setStats({
        totalPoints: metrics.total_pois,
        totalViews: metrics.total_views,
        totalBookings: metrics.total_bookings,
        totalRevenue: metrics.total_revenue,
        averageRating: metrics.avg_rating,
        pendingPayments: metrics.pending_payments,
        thisMonthViews: metrics.this_month.views,
        thisMonthBookings: metrics.this_month.bookings,
        thisMonthRevenue: metrics.this_month.revenue,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`partners/notifications/${notificationId}/`, {
        is_read: true
      });

      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', error);
      toast.error('Erreur lors de la mise à jour de la notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Calendar className="w-4 h-4" />;
      case 'payment': return <DollarSign className="w-4 h-4" />;
      case 'review': return <Star className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case 'booking': return 'default';
      case 'payment': return 'secondary';
      case 'review': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] md:min-h-[400px]">
        <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Tableau de Bord</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gérez vos points d'intérêt et suivez vos performances
          </p>
        </div>
        {!isMobile && (
          <Button size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <MobilePartnerStats stats={stats} />

      {/* Tabs Content */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex flex-wrap min-w-full gap-2 h-auto md:flex-nowrap md:gap-0 md:justify-between">
            <TabsTrigger value="analytics" className="text-xs md:text-sm py-2 md:flex-1">
              Analytiques
            </TabsTrigger>
            <TabsTrigger value="pois" className="text-xs md:text-sm py-2 md:flex-1">
              <span className="hidden md:inline">Mes POIs</span>
              <span className="md:hidden">POIs</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs md:text-sm py-2 md:flex-1">
              <span className="hidden md:inline">Réservations</span>
              <span className="md:hidden">Rés.</span>
            </TabsTrigger>
            <TabsTrigger value="finances" className="text-xs md:text-sm py-2 md:flex-1">
              Finances
            </TabsTrigger>
            <TabsTrigger value="subscription" className="text-xs md:text-sm py-2 md:flex-1">
              <span className="hidden md:inline">Abonnement</span>
              <span className="md:hidden">Abo</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs md:text-sm py-2 md:flex-1 relative">
              <span className="hidden md:inline">Notifications</span>
              <span className="md:hidden">Notifs</span>
              {notifications.filter(n => !n.is_read).length > 0 && (
                <Badge variant="destructive" className="ml-1 md:ml-2 text-xs scale-75 md:scale-100">
                  {notifications.filter(n => !n.is_read).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="analytics" className="space-y-4">
          <DynamicPartnerAnalytics />
        </TabsContent>

        <TabsContent value="pois" className="space-y-4">
          <POIManagement />
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <BookingAnalyticsPanel />
        </TabsContent>

        <TabsContent value="finances" className="space-y-4">
          <DynamicFinancialDashboard />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <DynamicSubscriptionManager />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Notifications récentes</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Restez informé de l'activité sur vos points d'intérêt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {notifications.slice(0, isMobile ? 3 : 6).map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-3 md:p-4 border rounded-lg cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-muted/50' : ''
                    }`}
                    onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {notification.type === 'booking' && <Calendar className="w-3 h-3 md:w-4 md:h-4" />}
                        {notification.type === 'payment' && <DollarSign className="w-3 h-3 md:w-4 md:h-4" />}
                        {notification.type === 'review' && <Star className="w-3 h-3 md:w-4 md:h-4" />}
                        {!['booking', 'payment', 'review'].includes(notification.type) && <Bell className="w-3 h-3 md:w-4 md:h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium truncate text-sm md:text-base">
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2 ml-2">
                            <Badge 
                              variant={
                                notification.type === 'booking' ? 'default' :
                                notification.type === 'payment' ? 'secondary' :
                                notification.type === 'review' ? 'outline' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {notification.type}
                            </Badge>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mobile Export Button */}
      {isMobile && (
        <div className="fixed bottom-4 right-4">
          <Button size="sm" className="shadow-lg">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      )}
    </div>
  );
};

export default ResponsivePartnerDashboard;
