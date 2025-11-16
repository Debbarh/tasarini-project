import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { partnerService, PartnerProfile } from '@/services/partnerService';
import { toast } from 'sonner';
import { Building2, Eye, Search, Filter, Mail, Phone, CreditCard, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

interface Partner {
  id: string;
  user_id: number;
  company_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url?: string | null;
  status: string;
  subscription_type: string;
  created_at: string;
  updated_at: string;
  owner_detail?: PartnerProfile['owner_detail'];
  managed_pois?: PartnerProfile['managed_pois'];
  metadata?: Record<string, any>;
}

const PartnerManagement: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const profiles = await partnerService.listProfiles();
      const formatted: Partner[] = profiles.map((profile: PartnerProfile) => ({
        id: profile.id,
        user_id: profile.owner,
        company_name: profile.company_name ?? null,
        contact_email: profile.metadata?.contact_email || profile.owner_detail?.email || null,
        contact_phone: profile.metadata?.contact_phone || profile.owner_detail?.profile?.phone_number || null,
        website_url: profile.website ?? null,
        status: profile.status,
        subscription_type: (profile.metadata?.subscription_type as string) || 'basic',
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        owner_detail: profile.owner_detail,
        managed_pois: profile.managed_pois,
        metadata: profile.metadata,
      }));
      formatted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPartners(formatted);
      setError(null);
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des partenaires:', error);
      setError(error.message || 'Erreur inconnue');
      toast.error(`Erreur lors du chargement des partenaires: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonction supprimée - plus d'approbation manuelle des partenaires

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'En attente' },
      approved: { variant: 'default' as const, label: 'Approuvé' },
      rejected: { variant: 'destructive' as const, label: 'Refusé' },
      cancelled: { variant: 'outline' as const, label: 'Annulé' },
      incomplete: { variant: 'outline' as const, label: 'Profil incomplet' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Refusé',
      cancelled: 'Annulé',
      incomplete: 'Profil incomplet'
    };
    return labels[status as keyof typeof labels] || status;
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

  const filteredPartners = partners.filter(partner => {
    const searchText = searchTerm.toLowerCase();
    const matchesSearch = 
      (partner.company_name || '').toLowerCase().includes(searchText) ||
      (partner.contact_email || '').toLowerCase().includes(searchText) ||
      ((partner.owner_detail?.profile?.first_name || '') + ' ' + (partner.owner_detail?.profile?.last_name || ''))
        .toLowerCase()
        .includes(searchText);
    
    const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;
    const matchesSubscription = subscriptionFilter === 'all' || partner.subscription_type === subscriptionFilter;
    
    return matchesSearch && matchesStatus && matchesSubscription;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{partners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{partners.filter(p => p.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-muted-foreground">Approuvés</p>
                <p className="text-2xl font-bold">{partners.filter(p => p.status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <div>
                <p className="text-sm text-muted-foreground">Refusés</p>
                <p className="text-2xl font-bold">{partners.filter(p => p.status === 'rejected').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Gestion des Partenaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom d'entreprise, email ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="incomplete">Profil incomplet</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="rejected">Refusé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger className="w-40">
                  <CreditCard className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Abonnement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les plans</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tableau des partenaires */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Contact & Email</TableHead>
                  <TableHead>POIs gérés</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Abonnement</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {partner.company_name || (
                            <span className="text-muted-foreground italic">
                              Entreprise non renseignée
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {partner.owner_detail?.profile?.first_name} {partner.owner_detail?.profile?.last_name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {partner.contact_email || 'Email non renseigné'}
                        </p>
                        {partner.contact_phone && (
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {partner.contact_phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">
                          {partner.managed_pois?.length ?? 0} POI(s)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {getStatusBadge(partner.status)}
                        <p className="text-xs text-muted-foreground">
                          Dernière mise à jour le {new Date(partner.updated_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSubscriptionBadge(partner.subscription_type)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {new Date(partner.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPartner(partner)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Profil partenaire</DialogTitle>
                          </DialogHeader>
                          {selectedPartner && (
                            <div className="space-y-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Aperçu du partenaire
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center space-y-1">
                                      {getStatusBadge(selectedPartner.status)}
                                      <p className="text-xs text-muted-foreground">
                                        {getStatusLabel(selectedPartner.status)}
                                      </p>
                                    </div>
                                    <div className="text-center space-y-1">
                                      {getSubscriptionBadge(selectedPartner.subscription_type)}
                                      <p className="text-xs text-muted-foreground">
                                        Plan d'abonnement
                                      </p>
                                    </div>
                                    <div className="text-center space-y-1">
                                      <div className="flex items-center justify-center gap-1 text-sm font-semibold">
                                        <MapPin className="w-4 h-4" />
                                        {selectedPartner.managed_pois?.length ?? 0}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        POI(s) gérés
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Coordonnées
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <Label>Entreprise</Label>
                                      <p className="font-medium mt-1">
                                        {selectedPartner.company_name || 'Non renseignée'}
                                      </p>
                                      <p className="text-muted-foreground">ID: {selectedPartner.id}</p>
                                    </div>
                                    <div>
                                      <Label>Contact</Label>
                                      <p className="mt-1">
                                        {selectedPartner.owner_detail?.profile?.first_name}{' '}
                                        {selectedPartner.owner_detail?.profile?.last_name}
                                      </p>
                                      <p className="text-muted-foreground">
                                        {selectedPartner.contact_email || 'Email non renseigné'}
                                      </p>
                                      {selectedPartner.contact_phone && (
                                        <p className="text-muted-foreground">{selectedPartner.contact_phone}</p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Points d'intérêt gérés
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {selectedPartner.managed_pois && selectedPartner.managed_pois.length > 0 ? (
                                    <ul className="space-y-2">
                                      {selectedPartner.managed_pois.map((poi) => (
                                        <li key={poi.id} className="flex items-center gap-2 text-sm">
                                          <CheckCircle className="w-4 h-4 text-green-500" />
                                          <span>{poi.name}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      Aucun point d'intérêt lié pour le moment.
                                    </p>
                                  )}
                                </CardContent>
                              </Card>

                              {selectedPartner.metadata && Object.keys(selectedPartner.metadata).length > 0 && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <AlertCircle className="w-4 h-4" />
                                      Métadonnées
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
                                      {JSON.stringify(selectedPartner.metadata, null, 2)}
                                    </pre>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          )}
                        </DialogContent>

                       </Dialog>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>

           {filteredPartners.length === 0 && (
             <div className="text-center py-8 text-muted-foreground">
               Aucun partenaire trouvé avec les critères sélectionnés
             </div>
           )}
         </CardContent>
       </Card>
     </div>
   );
 };

 export default PartnerManagement;
