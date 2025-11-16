import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { MediaCarousel } from '@/components/media/MediaCarousel';
import { 
  MapPin, 
  Star, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Camera,
  Clock,
  Globe,
  Phone,
  Mail,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { PartnerSimplePOIForm, PartnerPOIEditForm } from '@/components/poi/migration';
import ViewsDisplay from './ViewsDisplay';

interface TouristPoint {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  is_active: boolean;
  is_verified: boolean;
  is_partner_point: boolean;
  partner_featured: boolean;
  tags: string[];
  amenities: string[];
  price_range: string;
  contact_phone: string;
  contact_email: string;
  website_url: string;
  media_images: string[];
  opening_hours: any;
  created_at: string;
}

const PartnerPointsManagement: React.FC = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState<TouristPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPoint, setEditingPoint] = useState<TouristPoint | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; point: TouristPoint | null }>({
    isOpen: false,
    point: null,
  });

  useEffect(() => {
    if (user) {
      fetchPoints();
    }
  }, [user]);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<TouristPoint[]>('poi/tourist-points/', { owner: 'me' });
      setPoints(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des points:', error);
      toast.error('Erreur lors du chargement des points d\'intérêt');
    } finally {
      setLoading(false);
    }
  };

  const togglePointStatus = async (pointId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`poi/tourist-points/${pointId}/`, {
        is_active: !currentStatus
      });

      setPoints(points.map(point =>
        point.id === pointId ? { ...point, is_active: !currentStatus } : point
      ));

      toast.success(`Point d'intérêt ${!currentStatus ? 'activé' : 'désactivé'}`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const toggleFeaturedStatus = async (pointId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`poi/tourist-points/${pointId}/`, {
        partner_featured: !currentStatus
      });

      setPoints(points.map(point =>
        point.id === pointId ? { ...point, partner_featured: !currentStatus } : point
      ));

      toast.success(`Point d'intérêt ${!currentStatus ? 'mis en avant' : 'retiré de la mise en avant'}`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDeleteClick = (point: TouristPoint) => {
    setDeleteDialog({ isOpen: true, point });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.point) return;

    try {
      await apiClient.delete(`poi/tourist-points/${deleteDialog.point.id}/`);

      setPoints(points.filter(point => point.id !== deleteDialog.point!.id));
      toast.success(`Point d'intérêt "${deleteDialog.point.name}" supprimé avec succès`);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Une erreur est survenue lors de la suppression. Veuillez réessayer.');
      throw error; // Re-throw to let the dialog handle the loading state
    }
  };

  const getStatusBadge = (point: TouristPoint) => {
    if (!point.is_active) {
      return <Badge variant="secondary">Inactif</Badge>;
    }
    if (point.is_verified) {
      return <Badge variant="default" className="bg-green-500">Vérifié</Badge>;
    }
    return <Badge variant="outline">En attente</Badge>;
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
          <h1 className="text-3xl font-bold">Mes Points d'Intérêt</h1>
          <p className="text-muted-foreground">Gérez vos points d'intérêt et leurs paramètres</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Point
        </Button>
      </div>

      {/* Tourist Point Form */}
      <PartnerSimplePOIForm
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          fetchPoints();
          setIsDialogOpen(false);
        }}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{points.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <MapPin className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{points.filter(p => p.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Actifs</p>
              </div>
              <ToggleRight className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{points.filter(p => p.is_verified).length}</p>
                <p className="text-sm text-muted-foreground">Vérifiés</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {(points.reduce((sum, p) => sum + (p.rating || 0), 0) / Math.max(points.length, 1)).toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">Note moyenne</p>
              </div>
              <Star className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Points List */}
      <div className="space-y-4">
        {points.map((point) => (
          <Card key={point.id}>
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Image Section */}
                <div className="flex-shrink-0">
                  {point.media_images && point.media_images.length > 0 ? (
                    <div className="relative">
                      <MediaCarousel 
                        images={point.media_images} 
                        className="w-32 h-32"
                      />
                      {point.media_images.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          {point.media_images.length}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold truncate">{point.name}</h3>
                    {getStatusBadge(point)}
                    {point.partner_featured && (
                      <Badge variant="default" className="bg-purple-500">
                        Mis en avant
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground mb-3 line-clamp-2">
                    {point.description}
                  </p>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{point.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      <span>{point.rating || 0}/5 ({point.review_count || 0} avis)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <ViewsDisplay pointId={point.id} />
                    </div>
                    {point.price_range && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {point.price_range}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  {(point.contact_phone || point.contact_email || point.website_url) && (
                    <div className="flex flex-wrap gap-3 text-sm mb-3">
                      {point.contact_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">{point.contact_phone}</span>
                        </div>
                      )}
                      {point.contact_email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">{point.contact_email}</span>
                        </div>
                      )}
                      {point.website_url && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">Site web</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Opening Hours */}
                  {point.opening_hours && (
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Horaires configurés
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {point.tags && point.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {point.tags.slice(0, 4).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {point.tags.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{point.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Amenities */}
                  {point.amenities && point.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {point.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {point.amenities.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{point.amenities.length - 3} équipements
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Section */}
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePointStatus(point.id, point.is_active)}
                    title={point.is_active ? "Désactiver" : "Activer"}
                  >
                    {point.is_active ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFeaturedStatus(point.id, point.partner_featured)}
                    title={point.partner_featured ? "Retirer de la mise en avant" : "Mettre en avant"}
                  >
                    <Star className={`w-4 h-4 ${point.partner_featured ? 'fill-current text-purple-500' : ''}`} />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPoint(point);
                      setIsEditDialogOpen(true);
                    }}
                    title="Éditer"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(point)}
                    className="text-destructive hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {points.length === 0 && (
          <Card>
            <CardContent className="text-center p-12">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun point d'intérêt</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par créer votre premier point d'intérêt
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer mon premier point
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Tourist Point Dialog */}
      <PartnerPOIEditForm
        poiId={editingPoint?.id || null}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingPoint(null);
        }}
        onSuccess={() => {
          fetchPoints();
          setIsEditDialogOpen(false);
          setEditingPoint(null);
        }}
      />

      {/* Dialog de confirmation de suppression */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, point: null })}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le point d'intérêt"
        itemName={deleteDialog.point?.name || ''}
        itemType="point"
        warningText={
          deleteDialog.point?.is_verified
            ? "Ce point d'intérêt est vérifié et peut avoir des avis ou des interactions utilisateurs associés."
            : undefined
        }
        requireConfirmation={deleteDialog.point?.is_verified || false}
      />
    </div>
  );
};

export default PartnerPointsManagement;