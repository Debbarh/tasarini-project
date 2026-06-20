import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Banknote,
  Copy,
  Percent,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  partnerService,
  type PartnerCommission,
  type PartnerInvoice,
  type PlatformBillingInfo,
} from '@/services/partnerService';

const fmt = (amount: string | number, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(Number(amount || 0));

const COMMISSION_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'À facturer', variant: 'secondary' },
  invoiced: { label: 'Facturée', variant: 'default' },
  paid: { label: 'Payée', variant: 'outline' },
  cancelled: { label: 'Annulée', variant: 'outline' },
  processing: { label: 'En cours', variant: 'secondary' },
  failed: { label: 'Échec', variant: 'destructive' },
};

const INVOICE_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'outline' },
  issued: { label: 'À régler', variant: 'default' },
  paid: { label: 'Payée', variant: 'outline' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'outline' },
};

const DynamicFinancialDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [invoices, setInvoices] = useState<PartnerInvoice[]>([]);
  const [billing, setBilling] = useState<PlatformBillingInfo | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchFinancialData();
  }, [user]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const [comm, inv, bank, profile] = await Promise.all([
        partnerService.listCommissions(),
        partnerService.listInvoices(),
        partnerService.getPlatformBillingInfo().catch(() => null),
        partnerService.getMyProfile().catch(() => null),
      ]);
      setCommissions(comm);
      setInvoices(inv);
      setBilling(bank);
      if (profile?.commission_rate) setCommissionRate(Number(profile.commission_rate));
    } catch (error) {
      console.error('Erreur lors de la récupération des données financières:', error);
      toast.error(t('partnerCenter.dashboard.finances.errors.loadError', 'Impossible de charger vos données financières.'));
    } finally {
      setLoading(false);
    }
  };

  // Montant dû à la plateforme = factures émises / en retard, non réglées
  const amountDue = invoices
    .filter((i) => i.status === 'issued' || i.status === 'overdue')
    .reduce((s, i) => s + Number(i.amount_due || 0), 0);

  // Commissions pas encore facturées (seront regroupées sur la prochaine facture mensuelle)
  const toBeInvoiced = commissions
    .filter((c) => c.payment_status === 'pending')
    .reduce((s, c) => s + Number(c.amount || 0), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonth = commissions
    .filter((c) => {
      const d = new Date(c.booking_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && c.payment_status !== 'cancelled';
    })
    .reduce((s, c) => s + Number(c.amount || 0), 0);

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value);
    toast.success(t('partnerCenter.dashboard.finances.transfer.copied', 'Copié dans le presse-papier.'));
  };

  const chartData = Object.entries(
    commissions
      .filter((c) => c.payment_status !== 'cancelled')
      .reduce((acc: Record<string, number>, c) => {
        const month = new Date(c.booking_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
        acc[month] = (acc[month] || 0) + Number(c.amount || 0);
        return acc;
      }, {}),
  )
    .map(([month, amount]) => ({ month, amount }))
    .slice(-12);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartes de synthèse — le partenaire DOIT la commission à la plateforme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('partnerCenter.dashboard.finances.stats.amountDue', 'À régler à la plateforme')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{fmt(amountDue)}</div>
            <p className="text-xs text-muted-foreground">{t('partnerCenter.dashboard.finances.stats.amountDueHint', 'Factures émises à payer par virement')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('partnerCenter.dashboard.finances.stats.toBeInvoiced', 'À facturer')}</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(toBeInvoiced)}</div>
            <p className="text-xs text-muted-foreground">{t('partnerCenter.dashboard.finances.stats.toBeInvoicedHint', 'Commissions du mois en cours')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('partnerCenter.dashboard.finances.stats.thisMonth', 'Ce mois-ci')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(thisMonth)}</div>
            <p className="text-xs text-muted-foreground">{t('partnerCenter.dashboard.finances.stats.monthlyRevenue', 'Commissions générées')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('partnerCenter.dashboard.finances.stats.avgCommission', 'Taux de commission')}</CardTitle>
            <Percent className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{t('partnerCenter.dashboard.finances.stats.avgRate', 'Fixé par la plateforme')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique des commissions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('partnerCenter.dashboard.finances.revenueChart.title', 'Commissions par mois')}</CardTitle>
          <CardDescription>{t('partnerCenter.dashboard.finances.revenueChart.description', 'Évolution des commissions sur 12 mois')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [fmt(value), t('partnerCenter.dashboard.finances.revenueChart.revenue', 'Commission')]} />
              <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">{t('partnerCenter.dashboard.finances.tabs.invoices', 'Mes factures')}</TabsTrigger>
          <TabsTrigger value="commissions">{t('partnerCenter.dashboard.finances.tabs.commissions', 'Commissions')}</TabsTrigger>
          <TabsTrigger value="transfer">{t('partnerCenter.dashboard.finances.tabs.transfer', 'Virement')}</TabsTrigger>
        </TabsList>

        {/* Factures à régler */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('partnerCenter.dashboard.finances.invoices.title', 'Mes factures')}</CardTitle>
              <CardDescription>{t('partnerCenter.dashboard.finances.invoices.description', 'Commissions facturées mensuellement, à régler par virement.')}</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.invoices.empty', 'Aucune facture pour le moment.')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => {
                    const st = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.issued;
                    return (
                      <div key={inv.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {inv.status === 'paid' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <FileText className="h-4 w-4 text-blue-500" />}
                            <div>
                              <p className="font-medium font-mono text-sm">{inv.number}</p>
                              <p className="text-sm text-muted-foreground">{inv.period_start} → {inv.period_end}</p>
                            </div>
                          </div>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.invoices.amount', 'Montant')}</p>
                            <p className="font-semibold">{fmt(inv.amount_due, inv.currency)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.invoices.dueDate', 'Échéance')}</p>
                            <p>{inv.due_date ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.invoices.reference', 'Référence virement')}</p>
                            <p className="font-mono">{inv.number}</p>
                          </div>
                        </div>
                        {(inv.status === 'issued' || inv.status === 'overdue') && (
                          <p className="text-xs text-amber-600 mt-3">
                            {t('partnerCenter.dashboard.finances.invoices.payHint', 'À régler par virement en indiquant la référence ci-dessus. Voir l’onglet « Virement ».')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Détail des commissions */}
        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('partnerCenter.dashboard.finances.commissions.title', 'Commissions')}</CardTitle>
              <CardDescription>{t('partnerCenter.dashboard.finances.commissions.description', 'Commission due à la plateforme sur chaque réservation terminée.')}</CardDescription>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.empty', 'Aucune commission pour le moment.')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {commissions.slice(0, 20).map((c) => {
                    const st = COMMISSION_STATUS[c.payment_status] ?? COMMISSION_STATUS.pending;
                    return (
                      <div key={c.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{c.tourist_point_detail?.name || t('partnerCenter.dashboard.finances.commissions.poi', 'Point d’intérêt')}</p>
                            {c.customer_name && (
                              <p className="text-sm text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.client', 'Client')}: {c.customer_name}</p>
                            )}
                          </div>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.reference', 'Référence')}</p>
                            <p className="font-mono">{c.booking_reference || '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.commission', 'Commission')}</p>
                            <p className="font-semibold">{fmt(c.amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.rate', 'Taux')}</p>
                            <p>{Number(c.commission_rate).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.commissions.date', 'Date')}</p>
                            <p>{new Date(c.booking_date).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instructions de virement (IBAN plateforme) */}
        <TabsContent value="transfer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> {t('partnerCenter.dashboard.finances.transfer.title', 'Coordonnées de virement')}</CardTitle>
              <CardDescription>{t('partnerCenter.dashboard.finances.transfer.description', 'Réglez vos factures par virement sur le compte de la plateforme, en rappelant le numéro de facture en référence.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {billing && (billing.iban || billing.bank_holder) ? (
                <>
                  {[
                    { label: t('partnerCenter.dashboard.finances.transfer.holder', 'Bénéficiaire'), value: billing.bank_holder },
                    { label: 'IBAN', value: billing.iban },
                    { label: 'BIC / SWIFT', value: billing.bic },
                  ].filter((row) => row.value).map((row) => (
                    <div key={row.label} className="flex items-center justify-between border rounded-lg px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                        <p className="font-mono">{row.value}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copy(row.value)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2">
                    {t('partnerCenter.dashboard.finances.transfer.note', 'Indiquez le numéro de facture (ex. INV-…) en référence du virement pour accélérer le rapprochement.')}
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('partnerCenter.dashboard.finances.transfer.unavailable', 'Les coordonnées bancaires seront communiquées prochainement.')}</p>
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
