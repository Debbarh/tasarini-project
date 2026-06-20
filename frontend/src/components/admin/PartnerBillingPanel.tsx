import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, Percent, CheckCircle2, RefreshCw } from 'lucide-react';
import { partnerService, type PartnerInvoice, type PartnerProfile } from '@/services/partnerService';

const INVOICE_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'outline' },
  issued: { label: 'Émise', variant: 'secondary' },
  paid: { label: 'Payée', variant: 'default' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'outline' },
};

const fmt = (amount: string | number, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(Number(amount || 0));

const CommissionRateCell = ({ profile, onSaved }: { profile: PartnerProfile; onSaved: () => void }) => {
  const [rate, setRate] = useState<string>(profile.commission_rate ?? '10.00');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = Number(rate);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      toast.error('Le taux doit être compris entre 0 et 100.');
      return;
    }
    setSaving(true);
    try {
      await partnerService.setCommissionRate(profile.id, value);
      toast.success(`Taux de commission de ${profile.company_name} fixé à ${value} %.`);
      onSaved();
    } catch {
      toast.error('Impossible de mettre à jour le taux.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-24">
        <Input
          type="number"
          min={0}
          max={100}
          step="0.5"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="pr-7"
        />
        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <Button size="sm" variant="outline" onClick={save} disabled={saving || rate === (profile.commission_rate ?? '10.00')}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
      </Button>
    </div>
  );
};

const MarkPaidDialog = ({ invoice, onPaid }: { invoice: PartnerInvoice; onPaid: () => void }) => {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await partnerService.markInvoicePaid(invoice.id, { payment_reference: reference });
      toast.success(`Facture ${invoice.number} marquée payée.`);
      setOpen(false);
      onPaid();
    } catch {
      toast.error('Échec du marquage.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <CheckCircle2 className="w-4 h-4" /> Marquer payée
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer le paiement — {invoice.number}</DialogTitle>
          <DialogDescription>
            Montant {fmt(invoice.amount_due, invoice.currency)} de {invoice.partner_name}. Saisissez la référence du virement reçu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="payment-ref">Référence du virement</Label>
          <Input id="payment-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. VIR-2026-05-0012" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer payée'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function PartnerBillingPanel() {
  const [profiles, setProfiles] = useState<PartnerProfile[]>([]);
  const [invoices, setInvoices] = useState<PartnerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, i] = await Promise.all([
        partnerService.listProfiles(),
        partnerService.listInvoices(),
      ]);
      setProfiles(p);
      setInvoices(i);
    } catch {
      toast.error('Chargement de la facturation impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await partnerService.generateInvoices();
      toast.success(`${res.created} facture(s) générée(s) pour le mois précédent.`);
      await load();
    } catch {
      toast.error('La génération des factures a échoué.');
    } finally {
      setGenerating(false);
    }
  };

  const outstanding = useMemo(
    () => invoices.filter((i) => i.status === 'issued' || i.status === 'overdue')
      .reduce((s, i) => s + Number(i.amount_due || 0), 0),
    [invoices],
  );

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Encours à recouvrer</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{fmt(outstanding)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Factures émises</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{invoices.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Partenaires actifs</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{profiles.length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Percent className="w-5 h-5" /> Taux de commission par partenaire</CardTitle>
          <CardDescription>
            Pourcentage prélevé par la plateforme sur chaque réservation terminée. Défaut 10 %.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partenaire</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Taux de commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.company_name}</TableCell>
                  <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                  <TableCell><CommissionRateCell profile={p} onSaved={load} /></TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Aucun partenaire.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Factures partenaires</CardTitle>
            <CardDescription>Commissions facturées mensuellement. Le partenaire règle par virement.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1"><RefreshCw className="w-4 h-4" /> Rafraîchir</Button>
            <Button size="sm" onClick={generate} disabled={generating} className="gap-1">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Générer (mois précédent)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Partenaire</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const st = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.issued;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                    <TableCell>{inv.partner_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.period_start} → {inv.period_end}</TableCell>
                    <TableCell className="font-medium">{fmt(inv.amount_due, inv.currency)}</TableCell>
                    <TableCell className="text-xs">{inv.due_date ?? '—'}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      {inv.status !== 'paid' && inv.status !== 'cancelled'
                        ? <MarkPaidDialog invoice={inv} onPaid={load} />
                        : inv.payment_reference
                          ? <span className="text-xs text-muted-foreground">{inv.payment_reference}</span>
                          : null}
                    </TableCell>
                  </TableRow>
                );
              })}
              {invoices.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Aucune facture émise.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
