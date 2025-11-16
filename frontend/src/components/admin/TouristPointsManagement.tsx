import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, MapPin, Eye, EyeOff, Star, CheckCircle, Trash2, Ban, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { adminPoiService, AdminPoi, POIStatus } from "@/services/adminPoiService";

type TouristPoint = AdminPoi;

const TouristPointsManagement = () => {
  const [points, setPoints] = useState<TouristPoint[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<TouristPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const { toast } = useToast();

  const pagination = usePagination({
    data: filteredPoints,
    pageSize: 10
  });

  const fetchTouristPoints = async () => {
    try {
      setLoading(true);
      const data = await adminPoiService.list({ ordering: '-created_at' });
      setPoints(data);
      setFilteredPoints(data);
    } catch (error) {
      console.error('Error fetching tourist points:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les points d'intérêt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePointStatus = async (pointId: string, field: keyof Pick<TouristPoint, 'is_active' | 'is_verified'>, value: boolean) => {
    try {
      const updated = await adminPoiService.update(pointId, { [field]: value } as Partial<TouristPoint>);
      setPoints((prev) => prev.map((p) => (p.id === pointId ? updated : p)));
      toast({
        title: "Succès",
        description: "Point d'intérêt mis à jour avec succès",
      });
    } catch (error) {
      console.error('Error updating tourist point:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le point d'intérêt",
        variant: "destructive",
      });
    }
  };

  const suspendPoint = async (pointId: string, reason: string) => {
    try {
      const updated = await adminPoiService.moderate(pointId, {
        status: 'blocked',
        reason,
        admin_message: reason,
      });
      setPoints((prev) => prev.map((p) => (p.id === pointId ? updated : p)));
      toast({
        title: "Succès",
        description: "Point d'intérêt suspendu avec succès",
      });
    } catch (error) {
      console.error('Error suspending tourist point:', error);
      toast({
        title: "Erreur",
        description: "Impossible de suspendre le point d'intérêt",
        variant: "destructive",
      });
    }
  };

  const deletePoint = async (pointId: string) => {
    try {
      await adminPoiService.delete(pointId);
      setPoints((prev) => prev.filter((p) => p.id !== pointId));
      toast({
        title: "Succès",
        description: "Point d'intérêt supprimé avec succès",
      });
    } catch (error) {
      console.error('Error deleting tourist point:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le point d'intérêt",
        variant: "destructive",
      });
    }
  };

  // Batch actions
  const toggleSelectPoint = (pointId: string) => {
    const newSelected = new Set(selectedPoints);
    if (newSelected.has(pointId)) {
      newSelected.delete(pointId);
    } else {
      newSelected.add(pointId);
    }
    setSelectedPoints(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPoints.size === pagination.paginatedData.length) {
      setSelectedPoints(new Set());
    } else {
      setSelectedPoints(new Set(pagination.paginatedData.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedPoints(new Set());
  };

  const batchUpdateStatus = async (field: string, value: boolean) => {
    if (selectedPoints.size === 0) return;

    setBatchActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedPoints).map((id) =>
          adminPoiService.update(id, { [field]: value } as Partial<TouristPoint>)
        )
      );
      toast({
        title: "Succès",
        description: `${selectedPoints.size} point(s) d'intérêt mis à jour avec succès`,
      });
      clearSelection();
      fetchTouristPoints();
    } catch (error) {
      console.error('Error updating tourist points:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les points d'intérêt",
        variant: "destructive",
      });
    } finally {
      setBatchActionLoading(false);
    }
  };

  const batchSuspend = async () => {
    if (selectedPoints.size === 0) return;

    setBatchActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedPoints).map((id) =>
          adminPoiService.moderate(id, {
            status: 'blocked',
            reason: "Suspendu par l'administrateur (action en lot)",
            admin_message: "Suspendu par l'administrateur (action en lot)",
          })
        )
      );
      toast({
        title: "Succès",
        description: `${selectedPoints.size} point(s) d'intérêt suspendu(s) avec succès`,
      });
      clearSelection();
      fetchTouristPoints();
    } catch (error) {
      console.error('Error suspending tourist points:', error);
      toast({
        title: "Erreur",
        description: "Impossible de suspendre les points d'intérêt",
        variant: "destructive",
      });
    } finally {
      setBatchActionLoading(false);
    }
  };

  const batchDelete = async () => {
    if (selectedPoints.size === 0) return;

    setBatchActionLoading(true);
    try {
      await Promise.all(Array.from(selectedPoints).map((id) => adminPoiService.delete(id)));
      toast({
        title: "Succès",
        description: `${selectedPoints.size} point(s) d'intérêt supprimé(s) avec succès`,
      });
      clearSelection();
      fetchTouristPoints();
    } catch (error) {
      console.error('Error deleting tourist points:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les points d'intérêt",
        variant: "destructive",
      });
    } finally {
      setBatchActionLoading(false);
    }
  };

  const reactivatePoint = async (pointId: string) => {
    try {
      const updated = await adminPoiService.moderate(pointId, { status: 'approved' });
      setPoints((prev) => prev.map((p) => (p.id === pointId ? updated : p)));
      toast({
        title: "Succès",
        description: "Point d'intérêt réactivé avec succès",
      });
    } catch (error) {
      console.error('Error reactivating tourist point:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réactiver le point d'intérêt",
        variant: "destructive",
      });
    }
  };

  const filterPoints = () => {
    let filtered = points.filter(point => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        point.name.toLowerCase().includes(searchLower) ||
        (point.address || '').toLowerCase().includes(searchLower) ||
        (point.owner_detail?.email || '').toLowerCase().includes(searchLower);
      
      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "active" && point.is_active) ||
        (statusFilter === "inactive" && !point.is_active);
      
      const matchesVerification = 
        verificationFilter === "all" || 
        (verificationFilter === "verified" && point.is_verified) ||
        (verificationFilter === "unverified" && !point.is_verified);
      
      return matchesSearch && matchesStatus && matchesVerification;
    });

    setFilteredPoints(filtered);
    // Clear selection when filters change
    setSelectedPoints(new Set());
  };

  useEffect(() => {
    fetchTouristPoints();
  }, []);

  useEffect(() => {
    filterPoints();
  }, [points, searchTerm, statusFilter, verificationFilter]);

  const getStatusBadge = (point: TouristPoint) => {
    if (point.status_enum === 'blocked') {
      return <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" />Suspendu</Badge>;
    }
    if (point.is_verified) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Vérifié</Badge>;
    }
    if (point.is_active) {
      return <Badge variant="secondary">Actif</Badge>;
    }
    return <Badge variant="outline">Inactif</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Gestion des points d'intérêt ({filteredPoints.length})
            {selectedPoints.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedPoints.size} sélectionné(s)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Filtres et Pagination */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher par nom ou adresse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
          <Select value={verificationFilter} onValueChange={setVerificationFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Vérification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="verified">Vérifiés</SelectItem>
              <SelectItem value="unverified">Non vérifiés</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pagination.pageSize.toString()} onValueChange={(value) => pagination.setPageSize(Number(value))}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Taille" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table des points d'intérêt */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPoints.size === pagination.paginatedData.length && pagination.paginatedData.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Sélectionner tout"
                  />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Partenaire</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun point d'intérêt trouvé
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedData.map((point) => (
                  <TableRow key={point.id} className={selectedPoints.has(point.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPoints.has(point.id)}
                        onCheckedChange={() => toggleSelectPoint(point.id)}
                        aria-label={`Sélectionner ${point.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{point.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {point.address || 'Adresse non définie'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>
                          {point.owner_detail?.profile
                            ? `${point.owner_detail.profile.first_name || ''} ${point.owner_detail.profile.last_name || ''}`.trim() || 'Nom non défini'
                            : point.owner_detail?.display_name || 'Nom non défini'}
                        </div>
                        <div className="text-muted-foreground">{point.owner_detail?.email || 'Email non défini'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{Number(point.rating ?? 0).toFixed(1)}</span>
                        <span className="text-muted-foreground">({point.review_count ?? 0})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(point)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {point.backend && (
                          <Badge variant="secondary" className="w-fit">Partenaire</Badge>
                        )}
                        {point.metadata?.partner_featured && (
                          <Badge variant="default" className="w-fit">Mis en avant</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePointStatus(point.id, 'is_active', !point.is_active)}
                          disabled={point.status_enum === 'blocked'}
                        >
                          {point.is_active ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-1" />
                              Désactiver
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Activer
                            </>
                          )}
                        </Button>
                        {!point.is_verified && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updatePointStatus(point.id, 'is_verified', true)}
                            disabled={point.status_enum === 'blocked'}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Vérifier
                          </Button>
                        )}
                        {point.status_enum !== 'blocked' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-orange-600 hover:text-orange-700">
                                <Ban className="w-4 h-4 mr-1" />
                                Suspendre
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                                  Suspendre le POI
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir suspendre "{point.name}" ? 
                                  Le POI sera bloqué et désactivé. Cette action peut être annulée.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => suspendPoint(point.id, "Suspendu par l'administrateur")}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  Suspendre
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-red-500" />
                                Supprimer le POI
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer définitivement "{point.name}" ? 
                                Cette action est irréversible et supprimera toutes les données associées.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deletePoint(point.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Supprimer définitivement
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {point.status_enum === 'blocked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reactivatePoint(point.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Réactiver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Affichage {((pagination.currentPage - 1) * pagination.pageSize) + 1} à {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} sur {pagination.totalItems} résultats
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      pagination.goToPreviousPage();
                    }}
                    className={pagination.canGoPrevious ? "" : "pointer-events-none opacity-50"}
                  />
                </PaginationItem>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        pagination.goToPage(page);
                      }}
                      isActive={page === pagination.currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      pagination.goToNextPage();
                    }}
                    className={pagination.canGoNext ? "" : "pointer-events-none opacity-50"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{points.length}</div>
              <div className="text-sm text-muted-foreground">Total points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {points.filter(p => p.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Actifs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {points.filter(p => p.is_verified).length}
              </div>
              <div className="text-sm text-muted-foreground">Vérifiés</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {points.filter(p => p.backend).length}
              </div>
              <div className="text-sm text-muted-foreground">Partenaires</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {points.reduce((sum, p) => sum + (p.review_count ?? 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total avis</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>

    {/* Floating Action Bar */}
    {selectedPoints.size > 0 && (
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedPoints.size} point(s) sélectionné(s)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => batchUpdateStatus('is_active', true)}
              disabled={batchActionLoading}
            >
              <Eye className="w-4 h-4 mr-1" />
              Activer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => batchUpdateStatus('is_active', false)}
              disabled={batchActionLoading}
            >
              <EyeOff className="w-4 h-4 mr-1" />
              Désactiver
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => batchUpdateStatus('is_verified', true)}
              disabled={batchActionLoading}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Vérifier
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 hover:text-orange-700"
                  disabled={batchActionLoading}
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Suspendre
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Suspendre les POIs sélectionnés
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir suspendre {selectedPoints.size} point(s) d'intérêt ? 
                    Ils seront bloqués et désactivés. Cette action peut être annulée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={batchSuspend}
                    disabled={batchActionLoading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Suspendre
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  disabled={batchActionLoading}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    Supprimer les POIs sélectionnés
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer définitivement {selectedPoints.size} point(s) d'intérêt ? 
                    Cette action est irréversible et supprimera toutes les données associées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={batchDelete}
                    disabled={batchActionLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            disabled={batchActionLoading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )}
  </div>
  );
};

export default TouristPointsManagement;
