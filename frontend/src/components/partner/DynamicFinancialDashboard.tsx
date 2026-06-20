import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient, extractArrayFromResponse } from '@/integrations/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Plus
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Commission {
  id: string;
  amount: number;
  commission_rate: number;
  booking_date: string;
  payment_status: 'pending' | 'processing' | 'paid' | 'failed';
  tourist_point_name: string;
  booking_reference: string;
  customer_name: string;
}

interface PaymentMethod {
  id: string;
  type: 'bank_transfer' | 'paypal' | 'stripe';
  details: any;
  is_default: boolean;
  is_active: boolean;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payment_method_type: string;
  created_at: string;
  processed_at?: string;
}

interface FinancialStats {
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  averageCommissionRate: number;
  totalWithdrawals: number;
  nextPaymentDate: string;
}

const DynamicFinancialDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    availableBalance: 0,
    pendingBalance: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
    averageCommissionRate: 0,
    totalWithdrawals: 0,
    nextPaymentDate: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      // Récupération des commissions via Django API
      const commissionsData = extractArrayFromResponse<any>(await apiClient.get<any>('partners/commissions/'));

      const formattedCommissions: Commission[] = commissionsData?.map(item => ({
        id: item.id,
        amount: Number(item.amount),
        commission_rate: Number(item.commission_rate),
        booking_date: item.booking_date,
        payment_status: item.payment_status as Commission['payment_status'],
        tourist_point_name: item.tourist_point_detail?.name || 'Point d\'intérêt',
        booking_reference: item.booking_reference,
        customer_name: item.customer_name
      })) || [];

      setCommissions(formattedCommissions);

      // Récupération des moyens de paiement via Django API
      const paymentMethodsData = extractArrayFromResponse<any>(await apiClient.get<any>('partners/payment-methods/'));

      // Conversion des données DB vers l'interface TypeScript
      const formattedPaymentMethods: PaymentMethod[] = (paymentMethodsData || []).map(method => ({
        id: method.id,
        type: method.method_type as 'bank_transfer' | 'paypal' | 'stripe',
        details: method.details,
        is_default: method.is_default,
        is_active: true
      }));

      setPaymentMethods(formattedPaymentMethods);

      // Récupération des demandes de retrait via Django API
      const withdrawalsData = extractArrayFromResponse<any>(await apiClient.get<any>('partners/withdrawals/'));

      // Conversion des données DB vers l'interface TypeScript
      const formattedWithdrawals: WithdrawalRequest[] = (withdrawalsData || []).map(withdrawal => ({
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status as 'pending' | 'processing' | 'completed' | 'rejected',
        payment_method_type: withdrawal.payment_method_detail?.method_type || 'bank_transfer',
        created_at: withdrawal.requested_at,
        processed_at: withdrawal.processed_at
      }));

      setWithdrawals(formattedWithdrawals);

      // Calcul des statistiques financières
      const totalEarnings = formattedCommissions.reduce((sum, comm) => sum + comm.amount, 0);
      const availableBalance = formattedCommissions
        .filter(comm => comm.payment_status === 'pending')
        .reduce((sum, comm) => sum + comm.amount, 0);
      const pendingBalance = formattedCommissions
        .filter(comm => comm.payment_status === 'processing')
        .reduce((sum, comm) => sum + comm.amount, 0);

      // Revenus du mois actuel
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthEarnings = formattedCommissions
        .filter(comm => {
          const commDate = new Date(comm.booking_date);
          return commDate.getMonth() === currentMonth && commDate.getFullYear() === currentYear;
        })
        .reduce((sum, comm) => sum + comm.amount, 0);

      // Taux de commission moyen
      const averageCommissionRate = formattedCommissions.length > 0
        ? formattedCommissions.reduce((sum, comm) => sum + comm.commission_rate, 0) / formattedCommissions.length
        : 0;

      // Total des retraits
      const totalWithdrawals = withdrawalsData?.reduce((sum, withdrawal) => 
        withdrawal.status === 'completed' ? sum + withdrawal.amount : sum, 0) || 0;

      // Prochaine date de paiement (15 du mois prochain)
      const nextPayment = new Date();
      nextPayment.setMonth(nextPayment.getMonth() + 1);
      nextPayment.setDate(15);

      setStats({
        availableBalance,
        pendingBalance,
        totalEarnings,
        thisMonthEarnings,
        averageCommissionRate: averageCommissionRate * 100,
        totalWithdrawals,
        nextPaymentDate: nextPayment.toLocaleDateString('fr-FR')
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des données financières:', error);
      toast.error(t('partnerCenter.dashboard.finances.errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const requestWithdrawal = async (amount: number, paymentMethodId: string) => {
    try {
      if (amount > stats.availableBalance) {
        toast.error(t('partnerCenter.dashboard.finances.withdrawals.amountExceeds'));
        return;
      }

      await apiClient.post('partners/withdrawals/', {
        amount: amount,
        payment_method: paymentMethodId
      });

      toast.success(t('partnerCenter.dashboard.finances.withdrawals.requestSuccess'));
      fetchFinancialData(); // Rafraîchir les données
    } catch (error) {
      console.error('Erreur lors de la demande de retrait:', error);
      toast.error(t('partnerCenter.dashboard.finances.withdrawals.requestError'));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      processing: 'default',
      paid: 'outline',
      completed: 'outline',
      failed: 'destructive',
      rejected: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  // Préparation des données pour le graphique des revenus
  const revenueChartData = commissions
    .reduce((acc: Record<string, number>, comm) => {
      const month = new Date(comm.booking_date).toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'short' 
      });
      acc[month] = (acc[month] || 0) + comm.amount;
      return acc;
    }, {});

  const chartData = Object.entries(revenueChartData)
    .map(([month, amount]) => ({ month, amount }))
    .slice(-12); // 12 derniers mois

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
      {/* Statistiques financières */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('partnerCenter.dashboard.finances.stats.availableBalance')}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.availableBalance.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {t('partnerCenter.dashboard.finances.stats.readyForWithdrawal')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('partnerCenter.dashboard.finances.stats.processing')}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingBalance.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {t('partnerCenter.dashboard.finances.stats.paymentOn')} {stats.nextPaymentDate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('partnerCenter.dashboard.finances.stats.thisMonth')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.thisMonthEarnings.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">
              {t('partnerCenter.dashboard.finances.stats.monthlyRevenue')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('partnerCenter.dashboard.finances.stats.avgCommission')}</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageCommissionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('partnerCenter.dashboard.finances.stats.avgRate')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique des revenus */}
      <Card>
        <CardHeader>
          <CardTitle>{t('partnerCenter.dashboard.finances.revenueChart.title')}</CardTitle>
          <CardDescription>{t('partnerCenter.dashboard.finances.revenueChart.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}€`, t('partnerCenter.dashboard.finances.revenueChart.revenue')]}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Onglets pour gérer les finances */}
      <Tabs defaultValue="commissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commissions">{t('partnerCenter.dashboard.finances.tabs.commissions')}</TabsTrigger>
          <TabsTrigger value="withdrawals">{t('partnerCenter.dashboard.finances.tabs.withdrawals')}</TabsTrigger>
          <TabsTrigger value="payment-methods">{t('partnerCenter.dashboard.finances.tabs.paymentMethods')}</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('partnerCenter.dashboard.finances.commissions.title')}</CardTitle>
                <CardDescription>{t('partnerCenter.dashboard.finances.commissions.description')}</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t('partnerCenter.dashboard.finances.commissions.export')}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissions.slice(0, 10).map((commission) => (
                  <div key={commission.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(commission.payment_status)}
                        <div>
                          <p className="font-medium">{commission.tourist_point_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('partnerCenter.dashboard.finances.commissions.client')}: {commission.customer_name}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusBadge(commission.payment_status)}>
                        {t(`partnerCenter.dashboard.finances.status.${commission.payment_status}`)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.reference')}</p>
                        <p className="font-mono">{commission.booking_reference}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.commission')}</p>
                        <p className="font-semibold text-green-600">
                          {commission.amount.toFixed(2)}€
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.rate')}</p>
                        <p>{(commission.commission_rate * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.date')}</p>
                        <p>{new Date(commission.booking_date).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('partnerCenter.dashboard.finances.withdrawals.title')}</CardTitle>
                <CardDescription>{t('partnerCenter.dashboard.finances.withdrawals.description')}</CardDescription>
              </div>
              <Button 
                onClick={() => {
                  // Ouvrir un dialogue pour demander un retrait
                  if (paymentMethods.length === 0) {
                    toast.error(t('partnerCenter.dashboard.finances.withdrawals.noPaymentMethod'));
                    return;
                  }
                  // Logique pour demander un retrait
                }}
                disabled={stats.availableBalance <= 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('partnerCenter.dashboard.finances.withdrawals.request')}
              </Button>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.withdrawals.empty')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(withdrawal.status)}
                          <div>
                            <p className="font-medium">{withdrawal.amount.toFixed(2)}€</p>
                            <p className="text-sm text-muted-foreground">
                              {withdrawal.payment_method_type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusBadge(withdrawal.status)}>
                            {t(`partnerCenter.dashboard.finances.status.${withdrawal.status}`)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(withdrawal.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('partnerCenter.dashboard.finances.paymentMethods.title')}</CardTitle>
                <CardDescription>{t('partnerCenter.dashboard.finances.paymentMethods.description')}</CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('partnerCenter.dashboard.finances.paymentMethods.add')}
              </Button>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.paymentMethods.empty')}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('partnerCenter.dashboard.finances.paymentMethods.emptyDescription')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium capitalize">{method.type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              {method.details?.account_name || t('partnerCenter.dashboard.finances.paymentMethods.accountConfigured')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {method.is_default && (
                            <Badge variant="secondary">{t('partnerCenter.dashboard.finances.paymentMethods.default')}</Badge>
                          )}
                          <Badge variant={method.is_active ? 'outline' : 'secondary'}>
                            {method.is_active ? t('partnerCenter.dashboard.finances.paymentMethods.active') : t('partnerCenter.dashboard.finances.paymentMethods.inactive')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DynamicFinancialDashboard;