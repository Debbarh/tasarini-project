import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  Eye,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Plus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { partnerService } from '@/services/partnerService';

interface Commission {
  id: string;
  amount: number;
  commission_rate: number;
  booking_date: string;
  payment_status: 'pending' | 'processing' | 'paid' | 'failed';
  tourist_point_name: string;
  booking_reference: string;
  customer_name: string;
  tourist_point_id: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  processed_at?: string;
  payment_method_type: string;
  payment_method_details: string;
}

interface PaymentMethod {
  id: string;
  type: 'bank' | 'paypal' | 'stripe';
  details: string;
  is_default: boolean;
}

const PartnerEarningsManager: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [partnerStats, setPartnerStats] = useState({
    totalEarnings: 0,
    paidEarnings: 0,
    pendingEarnings: 0,
    commissionRate: 0.15
  });
  
  // Withdrawal form state
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  
  // Payment method form state
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'bank' as 'bank' | 'paypal' | 'stripe',
    details: ''
  });

  useEffect(() => {
    fetchCommissions();
    fetchWithdrawals();
    fetchPaymentMethods();
  }, []);

  const fetchCommissions = async () => {
    try {
      const commissionsData = await partnerService.listCommissions();
      const processed = commissionsData.map<Commission>((item) => ({
        id: String(item.id),
        amount: Number(item.amount),
        commission_rate: Number(item.commission_rate),
        booking_date: item.booking_date,
        payment_status: item.payment_status,
        tourist_point_name: item.tourist_point_detail?.name || 'Point d\'intérêt',
        booking_reference: item.booking_reference || '',
        customer_name: item.customer_name || 'Client',
        tourist_point_id: item.tourist_point,
        created_at: item.created_at
      }));

      setCommissions(processed);

      const totalEarnings = processed.reduce((sum, c) => sum + c.amount, 0);
      const paidEarnings = processed
        .filter(c => c.payment_status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0);
      const pendingEarnings = processed
        .filter(c => c.payment_status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);

      setPartnerStats(prev => ({
        ...prev,
        totalEarnings,
        paidEarnings,
        pendingEarnings
      }));
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast.error('Erreur lors du chargement des commissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const withdrawalsData = await partnerService.listWithdrawals();
      const processed = withdrawalsData.map<Withdrawal>((item) => ({
        id: String(item.id),
        amount: Number(item.amount),
        status: item.status,
        requested_at: item.requested_at,
        processed_at: item.processed_at || undefined,
        payment_method_type: item.payment_method_detail?.method_type || 'bank',
        payment_method_details: item.payment_method_detail?.label || 'Méthode de paiement'
      }));
      setWithdrawals(processed);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const methods = await partnerService.listPaymentMethods();
      const formatted = methods.map<PaymentMethod>((method) => ({
        id: String(method.id),
        type: method.method_type,
        details: method.details?.raw || method.label || '',
        is_default: method.is_default
      }));
      setPaymentMethods(formatted);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const filteredCommissions = commissions.filter(commission => {
    if (selectedStatus !== 'all' && commission.payment_status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const handleWithdrawalRequest = async () => {
    if (!withdrawalAmount || !selectedPaymentMethod) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (amount > partnerStats.pendingEarnings) {
      toast.error('Montant supérieur aux revenus disponibles');
      return;
    }

    try {
      await partnerService.requestWithdrawal({
        amount,
        payment_method: Number(selectedPaymentMethod),
      });
      toast.success('Demande de retrait envoyée avec succès');
      setIsWithdrawalDialogOpen(false);
      setWithdrawalAmount('');
      setSelectedPaymentMethod('');
      fetchWithdrawals();
      fetchCommissions();
    } catch (error: any) {
      console.error('Error requesting withdrawal:', error);
      toast.error(error?.message || 'Erreur lors de la demande de retrait');
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethod.details) {
      toast.error('Veuillez remplir les détails de paiement');
      return;
    }

    try {
      await partnerService.addPaymentMethod({
        method_type: newPaymentMethod.type,
        label: newPaymentMethod.type === 'bank' ? 'Virement bancaire' : newPaymentMethod.type.toUpperCase(),
        details: { raw: newPaymentMethod.details },
        is_default: paymentMethods.length === 0,
      });
      toast.success('Méthode de paiement ajoutée avec succès');
      setIsPaymentMethodDialogOpen(false);
      setNewPaymentMethod({ type: 'bank', details: '' });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Erreur lors de l\'ajout de la méthode de paiement');
    }
  };

  // Chart data
  const chartData = commissions
    .reduce((acc, commission) => {
      const date = new Date(commission.booking_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.amount += commission.amount;
      } else {
        acc.push({ date, amount: commission.amount });
      }
      return acc;
    }, [] as { date: string; amount: number }[])
    .slice(-7);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Payé</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'processing':
        return <Badge variant="outline"><CreditCard className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Échec</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getWithdrawalStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Terminé</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'processing':
        return <Badge variant="outline"><CreditCard className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Échec</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'bank': return '🏦';
      case 'paypal': return '💳';
      case 'stripe': return '💰';
      default: return '💳';
    }
  };

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
          <h1 className="text-3xl font-bold">Revenus & Commissions</h1>
          <p className="text-muted-foreground">Gérez vos revenus, commissions et demandes de retrait</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={partnerStats.pendingEarnings === 0}>
                <DollarSign className="w-4 h-4 mr-2" />
                Demander un retrait
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Demande de retrait</DialogTitle>
                <DialogDescription>
                  Montant disponible: {partnerStats.pendingEarnings.toFixed(2)}€
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Montant</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    max={partnerStats.pendingEarnings}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Méthode de paiement</Label>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.type.toUpperCase()} - {method.details}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsWithdrawalDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleWithdrawalRequest}>
                  Confirmer la demande
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{partnerStats.totalEarnings.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground">Total des revenus</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{partnerStats.paidEarnings.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground">Revenus payés</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{partnerStats.pendingEarnings.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{(partnerStats.commissionRate * 100)}%</p>
                <p className="text-sm text-muted-foreground">Taux de commission</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution des revenus</CardTitle>
          <CardDescription>Revenus générés au cours des 7 derniers jours</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}€`, 'Revenus']} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="commissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commissions">Historique des commissions</TabsTrigger>
          <TabsTrigger value="withdrawals">Demandes de retrait</TabsTrigger>
          <TabsTrigger value="methods">Méthodes de paiement</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtres:</span>
            </div>
            <Button
              variant={selectedStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('all')}
            >
              Tous
            </Button>
            <Button
              variant={selectedStatus === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('paid')}
            >
              Payés
            </Button>
            <Button
              variant={selectedStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('pending')}
            >
              En attente
            </Button>
          </div>

          {/* Commissions List */}
          <div className="space-y-4">
            {filteredCommissions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Aucune commission trouvée</p>
                </CardContent>
              </Card>
            ) : (
              filteredCommissions.map((commission) => (
                <Card key={commission.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{commission.tourist_point_name}</h4>
                          {getStatusBadge(commission.payment_status)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Référence:</span> {commission.booking_reference}
                          </div>
                          <div>
                            <span className="font-medium">Client:</span> {commission.customer_name}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {new Date(commission.booking_date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{commission.amount.toFixed(2)}€</div>
                        <div className="text-sm text-muted-foreground">
                          Commission {(commission.commission_rate * 100)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demandes de retrait</CardTitle>
              <CardDescription>Historique de vos demandes de retrait</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {withdrawals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Aucune demande de retrait</p>
                  </div>
                ) : (
                  withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{withdrawal.amount.toFixed(2)}€</div>
                        <div className="text-sm text-muted-foreground">
                          Demandé le {new Date(withdrawal.requested_at).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {withdrawal.payment_method_type?.toUpperCase()} - {withdrawal.payment_method_details}
                        </div>
                      </div>
                      {getWithdrawalStatusBadge(withdrawal.status)}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Méthodes de paiement</CardTitle>
              <CardDescription>Gérez vos méthodes de paiement pour recevoir vos revenus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPaymentMethodIcon(method.type)}</span>
                      <div>
                        <div className="font-medium capitalize">{method.type}</div>
                        <div className="text-sm text-muted-foreground">{method.details}</div>
                      </div>
                      {method.is_default && (
                        <Badge variant="outline">Par défaut</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Modifier</Button>
                      {!method.is_default && (
                        <Button variant="outline" size="sm">Supprimer</Button>
                      )}
                    </div>
                  </div>
                ))}
                
                <Dialog open={isPaymentMethodDialogOpen} onOpenChange={setIsPaymentMethodDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une méthode de paiement
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une méthode de paiement</DialogTitle>
                      <DialogDescription>
                        Configurez une nouvelle méthode pour recevoir vos paiements
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select 
                          value={newPaymentMethod.type} 
                          onValueChange={(value: 'bank' | 'paypal' | 'stripe') => 
                            setNewPaymentMethod(prev => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank">Virement bancaire</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                            <SelectItem value="stripe">Stripe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="details">Détails</Label>
                        <Input
                          id="details"
                          placeholder={
                            newPaymentMethod.type === 'bank' ? 'IBAN: FR76 1234 5678 9012 3456' :
                            newPaymentMethod.type === 'paypal' ? 'email@example.com' :
                            'Compte Stripe'
                          }
                          value={newPaymentMethod.details}
                          onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, details: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPaymentMethodDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleAddPaymentMethod}>
                        Ajouter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerEarningsManager;
