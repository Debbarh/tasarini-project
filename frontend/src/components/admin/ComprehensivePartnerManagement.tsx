import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Building2, Search, Filter, Mail, Phone, MapPin, CheckCircle, XCircle,
  CreditCard, RefreshCw, Edit, UserCheck, Clock, AlertTriangle,
  Key, Globe
} from 'lucide-react';
import { useOptimizedPartners, OptimizedPartner } from '@/hooks/useOptimizedPartners';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { partnerService } from '@/services/partnerService';
import { adminPoiService, AdminPoi, POIStatus } from '@/services/adminPoiService';
import { adminService } from '@/services/adminService';

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

const PartnerStats = ({ partners }: { partners: OptimizedPartner[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
          <Clock className="w-4 h-4 text-yellow-500" />
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
          <CheckCircle className="w-4 h-4 text-green-500" />
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
          <XCircle className="w-4 h-4 text-red-500" />
          <div>
            <p className="text-sm text-muted-foreground">Refusés</p>
            <p className="text-2xl font-bold">{partners.filter(p => p.status === 'rejected').length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <div>
            <p className="text-sm text-muted-foreground">Incomplets</p>
            <p className="text-2xl font-bold">{partners.filter(p => p.is_incomplete).length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Partner validation dialog
const PartnerValidationDialog = ({ partner, onValidated }: { partner: OptimizedPartner; onValidated: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [validationType, setValidationType] = useState<'approve' | 'reject' | 'suspend' | null>(null);
  const [reason, setReason] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleValidation = async () => {
    if (!validationType) return;

    setIsLoading(true);
    try {
      await partnerService.moderateProfile(partner.profile_id, {
        action: validationType,
        admin_message: adminMessage || undefined,
        reason: (validationType === 'reject' || validationType === 'suspend') ? reason : undefined,
      });

      toast.success(
        `Partenaire ${
          validationType === 'approve' ? 'approuvé' : validationType === 'reject' ? 'refusé' : 'suspendu'
        } avec succès`,
      );
      setIsOpen(false);
      onValidated();
    } catch (error: any) {
      console.error('Erreur lors de la validation:', error);
      toast.error('Erreur lors de la validation du partenaire');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCheck className="w-4 h-4 mr-2" />
          Valider
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Valider le partenaire</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Action de validation</Label>
            <Select value={validationType || ''} onValueChange={(value: any) => setValidationType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">✅ Approuver</SelectItem>
                <SelectItem value="reject">❌ Refuser</SelectItem>
                <SelectItem value="suspend">⏸️ Suspendre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(validationType === 'reject' || validationType === 'suspend') && (
            <div>
              <Label htmlFor="reason">Raison (obligatoire)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquer la raison du refus/suspension..."
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="admin-message">Message pour le partenaire</Label>
            <Textarea
              id="admin-message"
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Message personnalisé (optionnel)..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleValidation} 
            disabled={isLoading || !validationType || ((validationType === 'reject' || validationType === 'suspend') && !reason)}
          >
            {isLoading ? 'Traitement...' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Partner modification dialog
const PartnerEditDialog = ({ partner, onUpdated }: { partner: OptimizedPartner; onUpdated: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: partner.company_name || '',
    contact_email: partner.contact_email || '',
    contact_phone: partner.contact_phone || '',
    website_url: partner.website_url || '',
    description: partner.description || '',
    subscription_type: partner.subscription_type || 'basic'
  });

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const nextMetadata = {
        ...partner.metadata,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        description: formData.description || null,
        website_url: formData.website_url || null,
      };

      await partnerService.updateProfile(partner.profile_id, {
        company_name: formData.company_name,
        website: formData.website_url || undefined,
        metadata: nextMetadata,
      });

      if (formData.subscription_type !== partner.subscription_type) {
        await partnerService.updateSubscription(partner.profile_id, formData.subscription_type);
      }

      toast.success('Partenaire mis à jour avec succès');
      setIsOpen(false);
      onUpdated();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du partenaire');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le partenaire</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_name">Nom de l'entreprise</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="contact_email">Email de contact</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="contact_phone">Téléphone</Label>
            <Input
              id="contact_phone"
              value={formData.contact_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="website_url">Site web</Label>
            <Input
              id="website_url"
              value={formData.website_url}
              onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="subscription_type">Type d'abonnement</Label>
            <Select 
              value={formData.subscription_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, subscription_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleUpdate} disabled={isLoading}>
            {isLoading ? 'Mise à jour...' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Password reset dialog
const PasswordResetDialog = ({ partner }: { partner: OptimizedPartner }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordReset = async () => {
    setIsLoading(true);
    try {
      if (!partner.owner_id) {
        throw new Error('Identifiant utilisateur manquant');
      }
      const response = await adminService.resetUserPassword(partner.owner_id);
      const temporaryPassword = (response as { temporary_password?: string })?.temporary_password;
      toast.success(
        temporaryPassword
          ? `Mot de passe temporaire généré: ${temporaryPassword}`
          : 'Mot de passe réinitialisé avec succès',
      );
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast.error("Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Key className="w-4 h-4 mr-2" />
          Reset MDP
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Réinitialiser le mot de passe</AlertDialogTitle>
          <AlertDialogDescription>
            Un mot de passe temporaire sera généré pour {partner.contact_email || partner.profile.email}.
            Communiquez-le au partenaire pour sa prochaine connexion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handlePasswordReset} disabled={isLoading}>
            {isLoading ? 'Envoi...' : 'Envoyer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// POI management dialog
const PartnerPOIDialog = ({ partner }: { partner: OptimizedPartner }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pois, setPois] = useState<AdminPoi[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPartnerPOIs = async () => {
    setIsLoading(true);
    try {
      const ownerParam = partner.owner_public_id ?? String(partner.owner_id);
      const data = await adminPoiService.list({
        owner: ownerParam,
      });
      setPois(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des POIs:', error);
      toast.error('Erreur lors du chargement des points d\'intérêt');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePOIStatus = async (poiId: string, newStatus: string) => {
    try {
      await adminPoiService.moderate(poiId, {
        status: newStatus as POIStatus,
      });
      toast.success('Statut du POI mis à jour');
      fetchPartnerPOIs(); // Refresh the list
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du POI:', error);
      toast.error('Erreur lors de la mise à jour du POI');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setIsOpen(true);
            fetchPartnerPOIs();
          }}
        >
          <MapPin className="w-4 h-4 mr-2" />
          POIs ({partner.poi_count || 0})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Points d'intérêt - {partner.company_name}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <PartnerTableSkeleton />
        ) : (
          <div className="space-y-4">
            {pois.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun point d'intérêt trouvé pour ce partenaire
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pois.map((poi) => (
                    <TableRow key={poi.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{poi.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {poi.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {poi.address || '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            poi.status_enum === 'approved' ? 'default' :
                            poi.status_enum === 'pending_validation' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {poi.status_enum === 'approved' ? 'Approuvé' :
                           poi.status_enum === 'pending_validation' ? 'En attente' :
                           poi.status_enum === 'rejected' ? 'Refusé' : 'Bloqué'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {new Date(poi.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {poi.status_enum === 'pending_validation' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updatePOIStatus(poi.id, 'approved')}
                                className="h-8 px-2"
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updatePOIStatus(poi.id, 'rejected')}
                                className="h-8 px-2"
                              >
                                ✗
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const ComprehensivePartnerManagement: React.FC = () => {
  const {
    partners,
    isLoading,
    error,
    filters,
    updateFilters,
    refetch,
    invalidateCache
  } = useOptimizedPartners();

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedPartners,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious
  } = usePagination({
    data: partners,
    pageSize: 10
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'En attente', icon: Clock },
      approved: { variant: 'default' as const, label: 'Approuvé', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Refusé', icon: XCircle },
      suspended: { variant: 'outline' as const, label: 'Suspendu', icon: AlertTriangle },
      cancelled: { variant: 'outline' as const, label: 'Annulé', icon: XCircle },
      incomplete: { variant: 'outline' as const, label: 'Profil incomplet', icon: AlertTriangle }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
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
      {!isLoading && partners.length > 0 && <PartnerStats partners={partners} />}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Gestion Complète des Partenaires
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
          {/* Filtres */}
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
                  <SelectItem value="suspended">Suspendu</SelectItem>
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

          {/* Tableau principal */}
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
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Abonnement</TableHead>
                    <TableHead>POIs</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPartners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun partenaire trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPartners.map((partner) => (
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
                            </p>
                            {partner.contact_phone && (
                              <p className="text-sm flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {partner.contact_phone}
                              </p>
                            )}
                            {partner.website_url && (
                              <p className="text-sm flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  Site web
                                </a>
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(partner.status)}
                        </TableCell>
                        <TableCell>
                          {getSubscriptionBadge(partner.subscription_type)}
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <p className="text-sm font-medium">{partner.poi_count || 0}</p>
                            <p className="text-xs text-muted-foreground">
                              {partner.poi_approved || 0} approuvés
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {new Date(partner.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {/* Validation actions */}
                            {(partner.status === 'pending' || partner.status === 'approved') && (
                              <PartnerValidationDialog 
                                partner={partner} 
                                onValidated={invalidateCache}
                              />
                            )}
                            
                            {/* Edit partner */}
                            <PartnerEditDialog 
                              partner={partner} 
                              onUpdated={invalidateCache}
                            />
                            
                            {/* Password reset */}
                            {partner.contact_email && (
                              <PasswordResetDialog partner={partner} />
                            )}
                            
                            {/* POI management */}
                            <PartnerPOIDialog partner={partner} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={goToPreviousPage}
                      className={!canGoPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => goToPage(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={goToNextPage}
                      className={!canGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensivePartnerManagement;
