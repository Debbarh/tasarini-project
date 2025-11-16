import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MapPin, CheckCircle, XCircle, Eye, Building2, Phone, Mail, Globe, Camera } from 'lucide-react';
import { adminPoiService, AdminPoi } from '@/services/adminPoiService';

type PartnerPoint = AdminPoi;

const PartnerPointsValidation: React.FC = () => {
  const [points, setPoints] = useState<PartnerPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<PartnerPoint | null>(null);

  useEffect(() => {
    fetchPartnerPoints();
  }, []);

  const fetchPartnerPoints = async () => {
    try {
      const results = await adminPoiService.list({ backend: true, ordering: '-created_at' });
      setPoints(results);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des points:', error);
      toast.error('Erreur lors du chargement des points d\'intérêt');
    } finally {
      setLoading(false);
    }
  };

  const updatePointStatus = async (pointId: string, isActive: boolean, isVerified: boolean) => {
    try {
      const updated = await adminPoiService.update(pointId, {
        is_active: isActive,
        is_verified: isVerified,
      });
      setPoints((prev) => prev.map((point) => (point.id === pointId ? updated : point)));
      toast.success(`Point d'intérêt ${isActive && isVerified ? 'validé et activé' : 'désactivé'} avec succès`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour du point');
    }
  };

  const getStatusBadge = (point: PartnerPoint) => {
    if (!point.is_active && !point.is_verified) {
      return (
        <Badge variant="secondary">
          <XCircle className="w-3 h-3 mr-1" />
          En attente
        </Badge>
      );
    }
    if (point.is_active && point.is_verified) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Validé
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Rejeté
      </Badge>
    );
  };

  const getPartnerStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Partenaire Approuvé</Badge>;
      case 'pending':
        return <Badge variant="secondary">Partenaire En Attente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Partenaire Refusé</Badge>;
      default:
        return <Badge variant="outline">Statut Inconnu</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedMediaImages = selectedPoint
    ? (
        selectedPoint.media?.map((m) => m.external_url || m.file || '').filter(Boolean) ??
        selectedPoint.metadata?.media_images ??
        selectedPoint.media_images ??
        []
      )
    : [];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Validation des Points d'Intérêt Partenaires
            <Badge variant="outline" className="ml-2">
              {points.length} point{points.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {points.filter(p => !p.is_active && !p.is_verified).length}
            </p>
            <p className="text-sm text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {points.filter(p => p.is_active && p.is_verified).length}
            </p>
            <p className="text-sm text-muted-foreground">Validés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {points.filter(p => !p.is_active && p.is_verified === false).length}
            </p>
            <p className="text-sm text-muted-foreground">Rejetés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {points.filter(p => p.partner_detail?.status === 'approved').length}
            </p>
            <p className="text-sm text-muted-foreground">Partenaires Approuvés</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des points */}
      <div className="grid gap-4">
        {points.length === 0 ? (
          <Card>
            <CardContent className="text-center p-8">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun point d'intérêt partenaire trouvé</p>
            </CardContent>
          </Card>
        ) : (
          points.map((point) => (
            <Card key={point.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{point.name}</h3>
                      {getStatusBadge(point)}
                      {point.partner_detail && getPartnerStatusBadge(point.partner_detail.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                      <div>
                        <p><strong>Partenaire:</strong> {point.partner_detail?.company_name || 'Non défini'}</p>
                        <p><strong>Contact:</strong> {point.owner_detail?.profile?.first_name} {point.owner_detail?.profile?.last_name}</p>
                        <p><strong>Email:</strong> {point.contact_email || point.owner_detail?.email}</p>
                      </div>
                      <div>
                        <p><strong>Adresse:</strong> {point.address}</p>
                        <p><strong>Téléphone:</strong> {point.contact_phone || 'Non renseigné'}</p>
                        <p><strong>Créé le:</strong> {new Date(point.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    
                    {point.description && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        {point.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {/* Bouton Voir détails */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPoint(point)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Détails du Point d'Intérêt</DialogTitle>
                        </DialogHeader>
                        {selectedPoint && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Informations générales</h4>
                                  <div className="space-y-2 text-sm">
                                    <p><strong>Nom:</strong> {selectedPoint.name}</p>
                                    <p><strong>Adresse:</strong> {selectedPoint.address}</p>
                                    <p><strong>Coordonnées:</strong> {selectedPoint.latitude}, {selectedPoint.longitude}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold mb-2">Contact</h4>
                                  <div className="space-y-2 text-sm">
                                    <p className="flex items-center gap-2">
                                      <Mail className="w-4 h-4" />
                                      {selectedPoint.contact_email || 'Non renseigné'}
                                    </p>
                                    <p className="flex items-center gap-2">
                                      <Phone className="w-4 h-4" />
                                      {selectedPoint.contact_phone || 'Non renseigné'}
                                    </p>
                                    <p className="flex items-center gap-2">
                                      <Globe className="w-4 h-4" />
                                      {selectedPoint.website_url || 'Non renseigné'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Partenaire</h4>
                                  <div className="space-y-2 text-sm">
                                    <p className="flex items-center gap-2">
                                      <Building2 className="w-4 h-4" />
                                      {selectedPoint.partner_detail?.company_name || 'Non défini'}
                                    </p>
                                    <p><strong>Contact:</strong> {selectedPoint.owner_detail?.profile?.first_name} {selectedPoint.owner_detail?.profile?.last_name}</p>
                                    <p><strong>Email:</strong> {selectedPoint.contact_email || selectedPoint.owner_detail?.email}</p>
                                    <div className="mt-2">
                                      {selectedPoint.partner_detail && getPartnerStatusBadge(selectedPoint.partner_detail.status)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold mb-2">Statut</h4>
                                  <div className="space-y-2">
                                    {getStatusBadge(selectedPoint)}
                                    <p className="text-sm text-muted-foreground">
                                      Créé le {new Date(selectedPoint.created_at).toLocaleDateString('fr-FR')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {selectedPoint.description && (
                              <div>
                                <h4 className="font-semibold mb-2">Description</h4>
                                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                                  {selectedPoint.description}
                                </p>
                              </div>
                            )}
                            
            {selectedPoint.categories && selectedPoint.categories.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Catégories</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedPoint.categories || []).map((category, index) => (
                    <Badge key={index} variant="outline">{category}</Badge>
                  ))}
                </div>
              </div>
            )}
                            
            {selectedMediaImages.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Images ({selectedMediaImages.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedMediaImages.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                                      alt={`Image ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-md"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    {/* Boutons d'action pour les points en attente */}
                    {!point.is_active && !point.is_verified && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updatePointStatus(point.id, true, true)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updatePointStatus(point.id, false, false)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeter
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PartnerPointsValidation;
