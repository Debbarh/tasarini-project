import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/integrations/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Plus, Edit, Eye, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Shield, RefreshCw, MessageSquare, Bed, Calendar, Utensils } from 'lucide-react';
import { PartnerAdvancedPOIForm, PartnerPOIEditForm } from '@/components/poi/migration';
import { POIConversationPanel } from '../admin/POIConversationPanel';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccommodationManagement } from '@/components/partner/AccommodationManagement';
import { ActivityManagement } from '@/components/partner/ActivityManagement';
import { RestaurantManagement } from '@/components/partner/RestaurantManagement';

type POIStatus = 'draft' | 'pending_validation' | 'under_review' | 'approved' | 'rejected' | 'blocked';

interface POI {
  id: string;
  name: string;
  description: string;
  address: string;
  status_enum: POIStatus;
  conversation_id?: string;
  submission_count?: number;
  rejection_reason?: string;
  blocked_reason?: string;
  created_at: string;
  updated_at: string;
  validated_at?: string;
  is_accommodation?: boolean;
  is_activity?: boolean;
  is_restaurant?: boolean;
  media_images?: string[] | null;
  previewImage?: string | null;
}

const POIManagement: React.FC = () => {
  const { user } = useAuth();
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showConversation, setShowConversation] = useState<string | null>(null);
  const [editingPOI, setEditingPOI] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; poi: POI | null }>({
    isOpen: false,
    poi: null,
  });
  const [managementDialog, setManagementDialog] = useState<{
    type: 'accommodation' | 'activity' | 'restaurant';
    poi: POI;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPOIs();
    }
  }, [user]);

  const fetchPOIs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await apiClient.get<any[]>('poi/tourist-points/', { owner: 'me' });

      const withPreview = (data || []).map((poi: any) => {
        const images: string[] = Array.isArray(poi.media_images) ? poi.media_images : [];
        const preview = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : null;
        return {
          ...poi,
          previewImage: preview,
        } as POI;
      });
      setPois(withPreview);
    } catch (error) {
      console.error('Error fetching POIs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos points d'intérêt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: POIStatus) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Brouillon
          </Badge>
        );
      case 'pending_validation':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            En attente de validation
          </Badge>
        );
      case 'under_review':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
            <AlertCircle className="h-3 w-3" />
            En cours de révision
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">{" "}
            <CheckCircle className="h-3 w-3" />
            Approuvé
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejeté
          </Badge>
        );
      case 'blocked':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 bg-red-200 text-red-900">
            <Shield className="h-3 w-3" />
            Bloqué
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Statut inconnu
          </Badge>
        );
    }
  };

  const getStatusDescription = (status: POIStatus) => {
    switch (status) {
      case 'draft':
        return "Ce point d'intérêt est en cours de création et n'a pas encore été soumis pour validation.";
      case 'pending_validation':
        return "Ce point d'intérêt a été soumis et est en attente de validation par notre équipe.";
      case 'under_review':
        return "Ce point d'intérêt est en cours de révision par notre équipe. Vous recevrez bientôt une réponse.";
      case 'approved':
        return "Ce point d'intérêt a été approuvé et est maintenant visible par le public.";
      case 'rejected':
        return "Ce point d'intérêt a été rejeté. Veuillez vérifier les commentaires et le resoumette après corrections.";
      case 'blocked':
        return "Ce point d'intérêt a été bloqué suite à une violation des conditions d'utilisation.";
      default:
        return "Statut inconnu.";
    }
  };

  const handleEdit = (poiId: string) => {
    setEditingPOI(poiId);
    setShowEditForm(true);
  };

  const handleDeleteClick = (poi: POI) => {
    setDeleteDialog({ isOpen: true, poi });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.poi) return;

    try {
      await apiClient.delete(`poi/tourist-points/${deleteDialog.poi.id}/`);

      toast({
        title: "POI supprimé avec succès",
        description: `Le point d'intérêt "${deleteDialog.poi.name}" a été supprimé définitivement`,
      });
      fetchPOIs();
    } catch (error) {
      console.error('Error deleting POI:', error);
      toast({
        title: "Erreur de suppression",
        description: "Une erreur est survenue lors de la suppression. Veuillez réessayer.",
        variant: "destructive",
      });
      throw error; // Re-throw to let the dialog handle the loading state
    }
  };

  const resubmitPOI = async (poiId: string) => {
    try {
      const currentCount = pois.find(p => p.id === poiId)?.submission_count || 1;
      await apiClient.patch(`poi/tourist-points/${poiId}/`, {
        status_enum: 'pending_validation',
        submission_count: currentCount + 1
      });

      toast({
        title: "POI resoumis",
        description: "Votre point d'intérêt a été resoumis pour validation",
      });

      fetchPOIs();
    } catch (error) {
      console.error('Error resubmitting POI:', error);
      toast({
        title: "Erreur",
        description: "Impossible de resoumettre le POI",
        variant: "destructive",
      });
    }
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
      {/* En-tête avec action */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Mes Points d'Intérêt</h2>
          <p className="text-muted-foreground">
            Gérez vos points d'intérêt et suivez leur statut de validation
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Créer un POI
        </Button>
      </div>

      <div
        className={`grid grid-cols-1 gap-6 ${showConversation ? 'lg:grid-cols-[2fr_1fr]' : ''}`}
      >
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-2 bg-secondary rounded-lg">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{pois.length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brouillons</p>
                  <p className="text-2xl font-bold">{pois.filter(p => p.status_enum === 'draft').length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold">{pois.filter(p => p.status_enum === 'pending_validation').length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">En révision</p>
                  <p className="text-2xl font-bold">{pois.filter(p => p.status_enum === 'under_review').length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approuvés</p>
                  <p className="text-2xl font-bold">{pois.filter(p => p.status_enum === 'approved').length}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejetés</p>
                  <p className="text-2xl font-bold">{pois.filter(p => p.status_enum === 'rejected').length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des POIs */}
          <div className="space-y-4">
            {pois.length === 0 ? (
              <Card>
                <CardContent className="text-center p-8">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun point d'intérêt</h3>
                  <p className="text-muted-foreground mb-4">
                    Vous n'avez pas encore créé de point d'intérêt. Commencez par en créer un !
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer mon premier POI
                  </Button>
                </CardContent>
              </Card>
            ) : (
              pois.map((poi) => (
                <Card key={poi.id}>
                  <CardContent className="p-0">
                    <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-muted">
                      {poi.previewImage ? (
                        <img
                          src={poi.previewImage}
                          alt={`Illustration de ${poi.name}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground">
                          <MapPin className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-start p-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{poi.name}</h3>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {poi.address}
                        </p>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {poi.description}
                        </p>
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          Créé le {new Date(poi.created_at).toLocaleDateString('fr-FR')}
                          {poi.updated_at !== poi.created_at && (
                            <span> • Modifié le {new Date(poi.updated_at).toLocaleDateString('fr-FR')}</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(poi.status_enum)}
                            {poi.submission_count && poi.submission_count > 1 && (
                              <Badge variant="outline">
                                Resoumission #{poi.submission_count}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(poi.id)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                          </Button>
                          {poi.status_enum === 'approved' && (
                            <>
                              {poi.is_accommodation && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setManagementDialog({ type: 'accommodation', poi })}
                                >
                                  <Bed className="h-4 w-4 mr-1" />
                                  Tarifs hébergement
                                </Button>
                              )}
                              {poi.is_activity && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setManagementDialog({ type: 'activity', poi })}
                                >
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Tarifs activité
                                </Button>
                              )}
                              {poi.is_restaurant && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setManagementDialog({ type: 'restaurant', poi })}
                                >
                                  <Utensils className="h-4 w-4 mr-1" />
                                  Menus & tables
                                </Button>
                              )}
                            </>
                          )}
                          {(poi.status_enum === 'rejected' || poi.status_enum === 'blocked') && (
                            <Button variant="outline" size="sm" onClick={() => resubmitPOI(poi.id)}>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Resoumettre
                            </Button>
                            )}
                            {poi.conversation_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowConversation(
                                  showConversation === poi.id ? null : poi.id
                                )}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                {showConversation === poi.id ? 'Masquer' : 'Discussion'}
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleDeleteClick(poi)}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-2">
                          {getStatusDescription(poi.status_enum)}
                        </p>
                        
                        {poi.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800">
                              <strong>Raison du rejet:</strong> {poi.rejection_reason}
                            </p>
                          </div>
                        )}
                        
                        {poi.blocked_reason && (
                          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                            <p className="text-sm text-red-900">
                              <strong>Raison du blocage:</strong> {poi.blocked_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Panel de conversation */}
        {showConversation && (
          <div>
            <POIConversationPanel
              poiId={showConversation}
              conversationId={pois.find(p => p.id === showConversation)?.conversation_id}
              className="sticky top-4"
            />
          </div>
        )}
      </div>

      {/* Formulaire de création */}
      <PartnerAdvancedPOIForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={() => {
          fetchPOIs();
          setShowCreateForm(false);
        }}
      />

      {/* Formulaire d'édition */}
      <PartnerPOIEditForm
        poiId={editingPOI}
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setEditingPOI(null);
        }}
        onSuccess={() => {
          fetchPOIs();
          setShowEditForm(false);
          setEditingPOI(null);
          toast({
            title: "POI modifié",
            description: "Votre point d'intérêt a été modifié avec succès",
          });
        }}
      />

      {/* Dialog de confirmation de suppression */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, poi: null })}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le point d'intérêt"
        itemName={deleteDialog.poi?.name || ''}
        itemType="POI"
        warningText={
          deleteDialog.poi?.status_enum === 'approved' 
            ? "Ce POI est actuellement visible par le public et peut avoir des avis ou des réservations associés." 
            : undefined
        }
        requireConfirmation={deleteDialog.poi?.status_enum === 'approved'}
      />

      <Dialog
        open={managementDialog?.type === 'accommodation'}
        onOpenChange={(open) => {
          if (!open) setManagementDialog(null);
        }}
      >
        <DialogContent className="flex h-[98vh] w-[98vw] max-w-[98vw] flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background p-0 shadow-2xl">
          {managementDialog?.type === 'accommodation' && (
            <AccommodationManagement
              touristPointId={managementDialog.poi.id}
              poiName={managementDialog.poi.name}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={managementDialog?.type === 'activity'}
        onOpenChange={(open) => {
          if (!open) setManagementDialog(null);
        }}
      >
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle>
              Gestion des tarifs d'activité – {managementDialog?.poi.name}
            </DialogTitle>
          </DialogHeader>
          {managementDialog?.type === 'activity' && (
            <ActivityManagement
              touristPointId={managementDialog.poi.id}
              activityName={managementDialog.poi.name}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={managementDialog?.type === 'restaurant'}
        onOpenChange={(open) => {
          if (!open) setManagementDialog(null);
        }}
      >
        <DialogContent className="flex h-[98vh] w-[98vw] max-w-[98vw] flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background p-0 shadow-2xl">
          {managementDialog?.type === 'restaurant' && (
            <RestaurantManagement restaurantId={managementDialog.poi.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POIManagement;
