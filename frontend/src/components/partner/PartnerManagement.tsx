import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Search, Filter, CheckCircle, XCircle, Clock, Building2 } from 'lucide-react';
import { partnerService, PartnerProfile } from '@/services/partnerService';

interface Partner {
  id: number;
  owner_id: number;
  company_name: string;
  status: string;
  subscription_type: string;
  created_at: string;
  contact_email?: string;
  contact_phone?: string;
  contact_name?: string;
  description?: string;
  website_url?: string;
  metadata: Record<string, unknown>;
}

const PartnerManagement: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    filterPartners();
  }, [partners, searchTerm, statusFilter, subscriptionFilter]);

  const fetchPartners = async () => {
    try {
      // Récupérer d'abord les partenaires
      const profiles = await partnerService.listProfiles();
      const normalized = profiles
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((profile) => mapProfileToPartner(profile));

      setPartners(normalized);
    } catch (error) {
      console.error('Erreur lors du chargement des partenaires:', error);
      toast.error('Erreur lors du chargement des partenaires');
    } finally {
      setLoading(false);
    }
  };

  const filterPartners = () => {
    let filtered = [...partners];

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(partner =>
        partner.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.contact_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (partner.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(partner => partner.status === statusFilter);
    }

    // Filtre par type d'abonnement
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(partner => partner.subscription_type === subscriptionFilter);
    }

    setFilteredPartners(filtered);
  };

  const updatePartnerStatus = async (partnerId: number | string, newStatus: 'approved' | 'rejected') => {
    try {
      const target = partners.find((partner) => String(partner.id) === String(partnerId));
      const metadata = target?.metadata ?? {};
      const now = new Date();
      const subscriptionStart = newStatus === 'approved' ? now.toISOString().split('T')[0] : null;
      const subscriptionEnd =
        newStatus === 'approved'
          ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : null;

      await partnerService.updateProfile(partnerId, {
        status: newStatus,
        metadata: {
          ...metadata,
          subscription_start: subscriptionStart,
          subscription_end: subscriptionEnd,
        },
      });

      toast.success(`Partenaire ${newStatus === 'approved' ? 'approuvé' : 'rejeté'} avec succès`);
      fetchPartners();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approuvé
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Refusé
          </Badge>
        );
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getSubscriptionBadge = (type: string) => {
    const config = {
      basic: { label: 'Basic', color: 'bg-gray-500' },
      premium: { label: 'Premium', color: 'bg-blue-500' },
      enterprise: { label: 'Enterprise', color: 'bg-purple-500' }
    };

    const sub = config[type as keyof typeof config] || { label: type, color: 'bg-gray-400' };
    
    return (
      <Badge variant="default" className={`${sub.color} hover:opacity-80`}>
        {sub.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestion des Partenaires
            <Badge variant="outline" className="ml-2">
              {partners.length} partenaire{partners.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Filtres */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom d'entreprise, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="rejected">Refusé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-[180px]">
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
        </CardContent>
      </Card>

      {/* Liste des partenaires */}
      <div className="grid gap-4">
        {filteredPartners.length === 0 ? (
          <Card>
            <CardContent className="text-center p-8">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {partners.length === 0 ? 'Aucun partenaire trouvé' : 'Aucun partenaire ne correspond aux filtres'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPartners.map((partner) => (
            <Card key={partner.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{partner.company_name}</h3>
                      {getStatusBadge(partner.status)}
                      {getSubscriptionBadge(partner.subscription_type)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <p><strong>Contact:</strong> {partner.contact_name || '—'}</p>
                        <p><strong>Email:</strong> {partner.contact_email || '—'}</p>
                        {partner.contact_phone && <p><strong>Tél:</strong> {partner.contact_phone}</p>}
                      </div>
                      <div>
                        {partner.website_url && <p><strong>Site web:</strong> {partner.website_url}</p>}
                        <p><strong>Candidature:</strong> {new Date(partner.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    
                    {partner.description && (
                      <p className="mt-3 text-sm text-muted-foreground">{partner.description}</p>
                    )}
                  </div>
                  
                  {partner.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => updatePartnerStatus(partner.id, 'approved')}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updatePartnerStatus(partner.id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Refuser
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {partners.filter(p => p.status === 'pending').length}
            </p>
            <p className="text-sm text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {partners.filter(p => p.status === 'approved').length}
            </p>
            <p className="text-sm text-muted-foreground">Approuvés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {partners.filter(p => p.status === 'rejected').length}
            </p>
            <p className="text-sm text-muted-foreground">Refusés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {partners.filter(p => p.subscription_type === 'premium' || p.subscription_type === 'enterprise').length}
            </p>
            <p className="text-sm text-muted-foreground">Payants</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerManagement;

const mapProfileToPartner = (profile: PartnerProfile): Partner => {
  const metadata = profile.metadata || {};
  const contactName =
    (metadata.contact_name as string) ||
    [metadata.first_name, metadata.last_name].filter(Boolean).join(' ') ||
    undefined;

  return {
    id: Number(profile.id),
    owner_id: profile.owner,
    company_name: profile.company_name,
    status: profile.status,
    subscription_type: (metadata.subscription_type as string) || 'basic',
    created_at: profile.created_at,
    contact_email: (metadata.contact_email as string) || undefined,
    contact_phone: (metadata.contact_phone as string) || undefined,
    contact_name: contactName,
    description: (metadata.description as string) || undefined,
    website_url: (metadata.website_url as string) || undefined,
    metadata,
  };
};
