import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Eye, Search, Filter, Mail, Phone, MapPin, CheckCircle, XCircle, CreditCard, RefreshCw } from 'lucide-react';
import { useOptimizedPartners } from '@/hooks/useOptimizedPartners';

const PartnerTableSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex space-x-4">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-12 w-1/4" />
      </div>
    ))}
  </div>
);

const PartnerStats = ({ partners }: { partners: any[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
);

const OptimizedPartnerManagement: React.FC = () => {
  const {
    partners,
    isLoading,
    error,
    filters,
    updateFilters,
    refetch,
    invalidateCache
  } = useOptimizedPartners();

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

  const getSubscriptionBadge = (type: string) => {
    const variants = {
      basic: { variant: 'outline' as const, label: 'Basic' },
      premium: { variant: 'secondary' as const, label: 'Premium' },
      enterprise: { variant: 'default' as const, label: 'Enterprise' }
    };
    
    const config = variants[type as keyof typeof variants] || variants.basic;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Erreur lors du chargement des partenaires: {error.message}
            <Button onClick={() => refetch()} className="ml-2" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<PartnerTableSkeleton />}>
        {!isLoading && partners && <PartnerStats partners={partners} />}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Gestion des Partenaires Optimisée
              </CardTitle>
              <Button
                onClick={invalidateCache}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtres optimisés avec debouncing */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom d'entreprise, email ou nom..."
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filters.statusFilter} onValueChange={(value) => updateFilters({ statusFilter: value })}>
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
                <Select value={filters.subscriptionFilter} onValueChange={(value) => updateFilters({ subscriptionFilter: value })}>
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

            {/* Tableau avec loading states */}
            <div className="border rounded-lg">
              {isLoading ? (
                <div className="p-6">
                  <PartnerTableSkeleton />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Contact & Email</TableHead>
                      <TableHead>Point d'Intérêt</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Abonnement</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucun partenaire trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      partners.map((partner) => (
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
                                {partner.profile?.first_name} {partner.profile?.last_name}
                              </p>
                              {partner.is_incomplete && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Profil à compléter
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {partner.contact_email}
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="text-xs">Géré séparément</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {getStatusBadge(partner.status)}
                              {partner.is_incomplete ? (
                                <p className="text-xs text-muted-foreground">Profil à compléter</p>
                              ) : (
                                <p className="text-xs text-muted-foreground">Auto-approuvé</p>
                              )}
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
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Voir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </Suspense>
    </div>
  );
};

export default OptimizedPartnerManagement;