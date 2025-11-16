import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  TrendingUp,
  Users,
  Euro,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/integrations/api/client';

interface BookingTransaction {
  id: string;
  booking_reference: string;
  tourist_point_id: string;
  tourist_point_name: string;
  booking_amount: number;
  commission_amount: number;
  customer_name: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  booking_type: string;
  created_at: string;
}

export const BookingAnalyticsPanel: React.FC = () => {
  const [transactions, setTransactions] = useState<BookingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    pendingBookings: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchBookingData();
    }
  }, [user]);

  const fetchBookingData = async () => {
    try {
      setLoading(true);

      // Fetch booking reservations from Django API
      const bookingData = await apiClient.get<any[]>('bookings/reservations/', {
        ordering: '-created_at'
      });

      const formattedTransactions = bookingData?.map((transaction: any) => ({
        ...transaction,
        tourist_point_name: transaction.tourist_point_name || 'Point d\'intérêt',
        booking_date: transaction.created_at ? transaction.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        status: (transaction.booking_status || transaction.status || 'pending') as 'pending' | 'confirmed' | 'cancelled' | 'completed',
        booking_type: 'partner'
      })) || [];

      setTransactions(formattedTransactions);

      // Calculate stats
      const totalBookings = formattedTransactions.length;
      const totalRevenue = formattedTransactions.reduce((sum: number, t: any) => sum + (t.booking_amount || 0), 0);
      const totalCommissions = formattedTransactions.reduce((sum: number, t: any) => sum + (t.commission_amount || 0), 0);
      const pendingBookings = formattedTransactions.filter((t: any) => t.status === 'pending').length;

      setStats({
        totalBookings,
        totalRevenue,
        totalCommissions,
        pendingBookings
      });

    } catch (error) {
      console.error('Error fetching booking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      confirmed: 'default',
      cancelled: 'destructive',
      completed: 'outline'
    };
    return variants[status] || 'secondary';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Réservations</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chiffre d'Affaires</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commissions</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCommissions)}</p>
              </div>
              <Euro className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En Attente</p>
                <p className="text-2xl font-bold">{stats.pendingBookings}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Historique des Réservations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune réservation pour le moment</p>
              <p className="text-sm text-muted-foreground mt-2">
                Les réservations de vos points d'intérêt apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(transaction.status)}
                      <div>
                        <p className="font-medium">{transaction.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.tourist_point_name}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusBadge(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Référence</p>
                      <p className="font-mono">{transaction.booking_reference}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Montant</p>
                      <p className="font-semibold">{formatCurrency(transaction.booking_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Commission</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(transaction.commission_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p>{new Date(transaction.booking_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};