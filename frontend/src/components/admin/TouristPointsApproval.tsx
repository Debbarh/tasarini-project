import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MapPin, Eye, Search, Filter, CheckCircle, XCircle, Clock, User, Building2, Calendar, AlertCircle, Shield } from 'lucide-react';
import { POIValidationDialog } from './POIValidationDialog';
import { POIConversationPanel } from './POIConversationPanel';
import { adminPoiService, AdminPoi, POIStatus } from '@/services/adminPoiService';

type TouristPoint = AdminPoi;

const TouristPointsApproval: React.FC = () => {
  const [points, setPoints] = useState<TouristPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending_validation');
  const [selectedPoint, setSelectedPoint] = useState<TouristPoint | null>(null);
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [showConversation, setShowConversation] = useState<string | null>(null);

  useEffect(() => {
    fetchTouristPoints();
  }, []);

  const fetchTouristPoints = async () => {
    try {
      
      const fetched = await adminPoiService.list({ ordering: '-created_at' });
      setPoints(fetched);
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des points d\'intérêt:', error);
      toast.error(`Erreur lors du chargement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openValidationDialog = (point: TouristPoint) => {
    setSelectedPoint(point);
    setIsValidationDialogOpen(true);
  };

  const closeValidationDialog = () => {
    setSelectedPoint(null);
    setIsValidationDialogOpen(false);
  };

  const handleStatusUpdate = () => {
    fetchTouristPoints(); // Refresh the list
  };

  const getStatusBadge = (point: TouristPoint) => {
    const statusConfig = {
      draft: { label: 'Brouillon', variant: 'secondary', icon: Clock },
      pending_validation: { label: 'En attente', variant: 'warning', icon: Clock },
      under_review: { label: 'En cours de révision', variant: 'info', icon: AlertCircle },
      approved: { label: 'Approuvé', variant: 'success', icon: CheckCircle },
      rejected: { label: 'Rejeté', variant: 'destructive', icon: XCircle },
      blocked: { label: 'Bloqué', variant: 'destructive', icon: Shield }
    };

    const config = statusConfig[point.status_enum] || statusConfig.draft;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPointStatus = (point: TouristPoint): POIStatus => {
    return point.status_enum;
  };

  const filteredPoints = points.filter(point => {
    const searchText = searchTerm.toLowerCase();
    const matchesSearch = 
      point.name.toLowerCase().includes(searchText) ||
      (point.address || '').toLowerCase().includes(searchText) ||
      (point.partner_detail?.company_name || '').toLowerCase().includes(searchText) ||
      (point.owner_detail?.email || '').toLowerCase().includes(searchText);
    
    const pointStatus = getPointStatus(point);
    const matchesStatus = statusFilter === 'all' || pointStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: points.length,
    draft: points.filter(p => p.status_enum === 'draft').length,
    pending: points.filter(p => p.status_enum === 'pending_validation').length,
    under_review: points.filter(p => p.status_enum === 'under_review').length,
    approved: points.filter(p => p.status_enum === 'approved').length,
    rejected: points.filter(p => p.status_enum === 'rejected').length,
    blocked: points.filter(p => p.status_enum === 'blocked').length,
  };

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
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">En révision</p>
                <p className="text-2xl font-bold">{stats.under_review}</p>
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
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Rejetés</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Bloqués</p>
                <p className="text-2xl font-bold">{stats.blocked}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interface de gestion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Validation des Points d'Intérêt
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtres */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, adresse, partenaire..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="pending_validation">En attente</SelectItem>
                    <SelectItem value="under_review">En révision</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                    <SelectItem value="blocked">Bloqué</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Liste des points */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {filteredPoints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun point d'intérêt trouvé
                  </div>
                ) : (
                  filteredPoints.map((point) => (
                    <Card key={point.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <h3 className="font-medium">{point.name}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {point.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {point.address}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(point.created_at).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(point)}
                                {point.submission_count && point.submission_count > 1 && (
                                  <Badge variant="outline">
                                    Resoumission #{point.submission_count}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-sm">
                              {point.partner_detail ? (
                                <div className="flex items-center gap-1 text-blue-600">
                                  <Building2 className="w-3 h-3" />
                                  <span className="font-medium">{point.partner_detail.company_name}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span className="font-medium">
                                    {point.owner_detail?.profile?.first_name} {point.owner_detail?.profile?.last_name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openValidationDialog(point)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Valider
                          </Button>
                          {point.metadata?.conversation_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowConversation(showConversation === point.id ? null : point.id)}
                            >
                              💬 {showConversation === point.id ? 'Masquer' : 'Conversation'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de conversation */}
        <div className="lg:col-span-1">
          {showConversation && (
            <POIConversationPanel
              poiId={showConversation}
              conversationId={points.find((p) => p.id === showConversation)?.conversation_id}
              className="sticky top-4"
            />
          )}
        </div>
      </div>

      {/* Dialog de validation */}
      <POIValidationDialog
        poi={selectedPoint}
        isOpen={isValidationDialogOpen}
        onClose={closeValidationDialog}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
};

export default TouristPointsApproval;
