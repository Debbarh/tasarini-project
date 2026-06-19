import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, MapPin, Eye, EyeOff, Star, CheckCircle, Trash2, Ban, AlertTriangle, X, ThumbsUp, ThumbsDown, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { adminPoiService, AdminPoi } from "@/services/adminPoiService";
import { POIModerationPanel } from "@/components/admin/POIModerationPanel";

type TouristPoint = AdminPoi;

const PAGE_SIZE_OPTS = [25, 50, 100];
// Statuts actionnables (file de modération).
const MODERATION_STATUSES = new Set(['pending_validation', 'under_review', 'draft', 'rejected']);

// Helpers d'affichage pour la fiche détaillée admin.
const yn = (v: any) => (v ? 'Oui' : 'Non');
const arr = (v: any) => (Array.isArray(v) && v.length ? v.join(', ') : '—');
const lbl = (o: any) => (o && typeof o === 'object' ? (o.label_fr || o.label_en || o.code || JSON.stringify(o)) : (o ?? '—'));
const val = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v));

const Row = ({ k, v }: { k: string; v: any }) => (
  <div className="grid grid-cols-3 gap-2 py-1 text-sm border-b border-border/40 last:border-0">
    <span className="text-muted-foreground">{k}</span>
    <span className="col-span-2 break-words">{v}</span>
  </div>
);
const Sec = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-md border p-3">
    <h4 className="text-sm font-semibold mb-1.5">{title}</h4>
    {children}
  </div>
);

const TouristPointsManagement = () => {
  const [points, setPoints] = useState<TouristPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");      // status_enum
  const [typeFilter, setTypeFilter] = useState<string>("all");          // tourist/restaurant/accommodation/activity
  const [activeFilter, setActiveFilter] = useState<string>("all");      // is_active
  const [sourceFilter, setSourceFilter] = useState<string>("all");      // plateforme / overture
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [detailPoi, setDetailPoi] = useState<TouristPoint | null>(null);
  const { toast } = useToast();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Debounce de la recherche (300 ms) → revient page 1.
  useEffect(() => {
    const tm = setTimeout(() => { setDebouncedSearch(searchTerm.trim()); setPage(1); }, 300);
    return () => clearTimeout(tm);
  }, [searchTerm]);

  // Tout changement de filtre revient page 1.
  useEffect(() => { setPage(1); }, [statusFilter, typeFilter, activeFilter, sourceFilter, pageSize]);

  const fetchTouristPoints = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | boolean> = {
        ordering: '-created_at', page, page_size: pageSize,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active';
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (typeFilter === 'restaurant') params.is_restaurant = true;
      else if (typeFilter === 'accommodation') params.is_accommodation = true;
      else if (typeFilter === 'activity') params.is_activity = true;
      else if (typeFilter === 'tourist') { params.is_restaurant = false; params.is_accommodation = false; params.is_activity = false; }
      const data: any = await adminPoiService.list(params);
      setPoints(Array.isArray(data) ? data : (data?.results || []));
      setTotal(Array.isArray(data) ? data.length : (data?.count ?? 0));
      setSelectedPoints(new Set());
    } catch (error) {
      console.error('Error fetching tourist points:', error);
      toast({ title: "Erreur", description: "Impossible de charger les points d'intérêt", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTouristPoints(); /* eslint-disable-next-line */ }, [page, pageSize, debouncedSearch, statusFilter, typeFilter, activeFilter, sourceFilter]);

  const patchLocal = (updated: TouristPoint) =>
    setPoints((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  const updatePointStatus = async (pointId: string, field: 'is_active' | 'is_verified', value: boolean) => {
    try {
      patchLocal(await adminPoiService.update(pointId, { [field]: value } as Partial<TouristPoint>));
      toast({ title: "Succès", description: "Point d'intérêt mis à jour" });
    } catch { toast({ title: "Erreur", description: "Mise à jour impossible", variant: "destructive" }); }
  };

  const moderate = async (pointId: string, status: string, reason?: string) => {
    try {
      patchLocal(await adminPoiService.moderate(pointId, { status: status as any, ...(reason ? { reason, admin_message: reason } : {}) }));
      const labels: Record<string, string> = { approved: 'approuvé', rejected: 'rejeté', blocked: 'suspendu' };
      toast({ title: "Succès", description: `Point d'intérêt ${labels[status] || 'mis à jour'}` });
      if (statusFilter !== 'all') fetchTouristPoints(); // sort de la file si le statut filtré change
    } catch { toast({ title: "Erreur", description: "Action de modération impossible", variant: "destructive" }); }
  };

  const deletePoint = async (pointId: string) => {
    try {
      await adminPoiService.delete(pointId);
      setPoints((prev) => prev.filter((p) => p.id !== pointId));
      setTotal((t) => Math.max(0, t - 1));
      toast({ title: "Succès", description: "Point d'intérêt supprimé" });
    } catch { toast({ title: "Erreur", description: "Suppression impossible", variant: "destructive" }); }
  };

  // Sélection / actions en lot
  const toggleSelectPoint = (id: string) => {
    const s = new Set(selectedPoints);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedPoints(s);
  };
  const toggleSelectAll = () =>
    setSelectedPoints(selectedPoints.size === points.length ? new Set() : new Set(points.map((p) => p.id)));
  const clearSelection = () => setSelectedPoints(new Set());

  const batchUpdate = async (field: 'is_active' | 'is_verified', value: boolean) => {
    if (!selectedPoints.size) return;
    setBatchActionLoading(true);
    try {
      await Promise.all(Array.from(selectedPoints).map((id) => adminPoiService.update(id, { [field]: value } as Partial<TouristPoint>)));
      toast({ title: "Succès", description: `${selectedPoints.size} POI mis à jour` });
      clearSelection(); fetchTouristPoints();
    } catch { toast({ title: "Erreur", description: "Action en lot impossible", variant: "destructive" }); }
    finally { setBatchActionLoading(false); }
  };
  const batchDelete = async () => {
    if (!selectedPoints.size) return;
    setBatchActionLoading(true);
    try {
      await Promise.all(Array.from(selectedPoints).map((id) => adminPoiService.delete(id)));
      toast({ title: "Succès", description: `${selectedPoints.size} POI supprimé(s)` });
      clearSelection(); fetchTouristPoints();
    } catch { toast({ title: "Erreur", description: "Suppression en lot impossible", variant: "destructive" }); }
    finally { setBatchActionLoading(false); }
  };

  const sourceBadge = (p: TouristPoint) => {
    if ((p.metadata as any)?.external_source === 'overture') return <Badge variant="outline" className="w-fit">Overture</Badge>;
    if (p.backend) return <Badge variant="secondary" className="w-fit">Partenaire</Badge>;
    return <Badge variant="outline" className="w-fit">Plateforme</Badge>;
  };

  const getStatusBadge = (p: TouristPoint) => {
    if (p.status_enum === 'blocked') return <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" />Suspendu</Badge>;
    if (p.status_enum === 'pending_validation') return <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">En attente</Badge>;
    if (p.status_enum === 'under_review') return <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">En revue</Badge>;
    if (p.status_enum === 'rejected') return <Badge variant="outline" className="gap-1 border-red-500 text-red-600">Rejeté</Badge>;
    if (p.is_verified) return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Vérifié</Badge>;
    if (p.is_active) return <Badge variant="secondary">Actif</Badge>;
    return <Badge variant="outline">Inactif</Badge>;
  };

  // Pages affichées (fenêtre autour de la page courante).
  const pageWindow = useMemo(() => {
    const set = new Set<number>([1, totalPages, page, page - 1, page + 1, page - 2, page + 2]);
    return Array.from(set).filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  }, [page, totalPages]);

  return (
    <div className="relative space-y-6">
      {/* File de modération : revendications partenaire + suggestions d'enrichissement */}
      <POIModerationPanel />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Points d'intérêt ({total.toLocaleString('fr-FR')})
            {selectedPoints.size > 0 && <Badge variant="secondary" className="ml-2">{selectedPoints.size} sélectionné(s)</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtres */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Rechercher par nom, adresse…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending_validation">En attente (à modérer)</SelectItem>
                <SelectItem value="under_review">En revue</SelectItem>
                <SelectItem value="approved">Approuvés</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
                <SelectItem value="blocked">Suspendus</SelectItem>
                <SelectItem value="draft">Brouillons</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="tourist">Site touristique</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="accommodation">Hébergement</SelectItem>
                <SelectItem value="activity">Activité</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sources</SelectItem>
                <SelectItem value="platform">Plateforme / Partenaire</SelectItem>
                <SelectItem value="overture">Overture (importés)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-full lg:w-36"><SelectValue placeholder="Activité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Actif + inactif</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-full lg:w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{PAGE_SIZE_OPTS.map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Barre d'actions en lot */}
          {selectedPoints.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 bg-muted/40">
              <span className="text-sm text-muted-foreground">{selectedPoints.size} sélectionné(s) :</span>
              <Button size="sm" variant="outline" disabled={batchActionLoading} onClick={() => batchUpdate('is_active', true)}><Eye className="w-4 h-4 mr-1" />Activer</Button>
              <Button size="sm" variant="outline" disabled={batchActionLoading} onClick={() => batchUpdate('is_active', false)}><EyeOff className="w-4 h-4 mr-1" />Désactiver</Button>
              <Button size="sm" variant="outline" disabled={batchActionLoading} className="text-red-600" onClick={batchDelete}><Trash2 className="w-4 h-4 mr-1" />Supprimer</Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}><X className="w-4 h-4" /></Button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={selectedPoints.size === points.length && points.length > 0} onCheckedChange={toggleSelectAll} aria-label="Tout sélectionner" />
                  </TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : points.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun point d'intérêt trouvé</TableCell></TableRow>
                ) : points.map((point) => (
                  <TableRow key={point.id} className={selectedPoints.has(point.id) ? "bg-muted/50" : ""}>
                    <TableCell><Checkbox checked={selectedPoints.has(point.id)} onCheckedChange={() => toggleSelectPoint(point.id)} aria-label={`Sélectionner ${point.name}`} /></TableCell>
                    <TableCell>
                      <div className="font-medium">{point.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">{point.address || 'Adresse non définie'}</div>
                    </TableCell>
                    <TableCell>{sourceBadge(point)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{Number(point.rating ?? 0).toFixed(1)}</span>
                        <span className="text-muted-foreground">({point.review_count ?? 0})</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(point)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setDetailPoi(point)}>
                          <Info className="w-4 h-4 mr-1" />Détails
                        </Button>
                        {/* Modération : approuver / rejeter pour les POI à traiter */}
                        {MODERATION_STATUSES.has(point.status_enum as string) && (
                          <>
                            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => moderate(point.id, 'approved')}>
                              <ThumbsUp className="w-4 h-4 mr-1" />Approuver
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => moderate(point.id, 'rejected', "Rejeté par l'administrateur")}>
                              <ThumbsDown className="w-4 h-4 mr-1" />Rejeter
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => updatePointStatus(point.id, 'is_active', !point.is_active)} disabled={point.status_enum === 'blocked'}>
                          {point.is_active ? <><EyeOff className="w-4 h-4 mr-1" />Désactiver</> : <><Eye className="w-4 h-4 mr-1" />Activer</>}
                        </Button>
                        {!point.is_verified && (
                          <Button size="sm" variant="default" onClick={() => updatePointStatus(point.id, 'is_verified', true)} disabled={point.status_enum === 'blocked'}>
                            <CheckCircle className="w-4 h-4 mr-1" />Vérifier
                          </Button>
                        )}
                        {point.status_enum !== 'blocked' ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-orange-600 hover:text-orange-700"><Ban className="w-4 h-4 mr-1" />Suspendre</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" />Suspendre le POI</AlertDialogTitle>
                                <AlertDialogDescription>Suspendre « {point.name} » ? Le POI sera bloqué et désactivé. Réversible.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => moderate(point.id, 'blocked', "Suspendu par l'administrateur")} className="bg-orange-600 hover:bg-orange-700">Suspendre</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => moderate(point.id, 'approved')} className="text-green-600 hover:text-green-700"><CheckCircle className="w-4 h-4 mr-1" />Réactiver</Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4 mr-1" />Supprimer</Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-500" />Supprimer le POI</AlertDialogTitle>
                              <AlertDialogDescription>Supprimer définitivement « {point.name} » ? Action irréversible.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePoint(point.id)} className="bg-red-600 hover:bg-red-700">Supprimer définitivement</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination serveur */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Page {page} / {totalPages} — {total.toLocaleString('fr-FR')} résultats
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }} className={page > 1 ? "" : "pointer-events-none opacity-50"} />
                  </PaginationItem>
                  {pageWindow.map((p, i) => (
                    <PaginationItem key={p}>
                      {i > 0 && pageWindow[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                      <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(p); }} isActive={p === page}>{p}</PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }} className={page < totalPages ? "" : "pointer-events-none opacity-50"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fiche détaillée : TOUTES les informations du POI */}
      <Dialog open={!!detailPoi} onOpenChange={(o) => !o && setDetailPoi(null)}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto">
          {detailPoi && (() => {
            const p: any = detailPoi;
            const m: any = p.metadata || {};
            const imgs: string[] = [...(p.media || []).map((x: any) => x.external_url || x.url || x.image).filter(Boolean), ...((m.images || []))];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />{p.name}</DialogTitle>
                  <DialogDescription className="break-all">ID : {p.id}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Sec title="Général">
                    <Row k="Statut" v={val(p.status_enum)} />
                    <Row k="Actif / Vérifié" v={`${yn(p.is_active)} / ${yn(p.is_verified)}`} />
                    <Row k="Partenaire lié" v={yn(p.is_partner_point)} />
                    <Row k="Note" v={`${Number(p.rating ?? 0).toFixed(1)} (${p.review_count ?? 0} avis)`} />
                    <Row k="Score validation" v={val(p.validation_score)} />
                    <Row k="Nb soumissions" v={val(p.submission_count)} />
                    <Row k="Description" v={val(p.description)} />
                  </Sec>
                  <Sec title="Localisation">
                    <Row k="Latitude / Longitude" v={`${val(p.latitude)} , ${val(p.longitude)}`} />
                    <Row k="Adresse" v={val(p.address)} />
                  </Sec>
                  <Sec title="Contact">
                    <Row k="Téléphone" v={val(p.contact_phone)} />
                    <Row k="Email" v={val(p.contact_email)} />
                    <Row k="Site web" v={p.website_url ? <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{p.website_url}</a> : '—'} />
                  </Sec>
                  <Sec title="Type & tarif">
                    <Row k="Restaurant / Hébergement / Activité" v={`${yn(p.is_restaurant)} / ${yn(p.is_accommodation)} / ${yn(p.is_activity)}`} />
                    <Row k="Gamme de prix" v={val(p.price_range)} />
                    <Row k="Budget" v={lbl(p.budget_level)} />
                    <Row k="Difficulté" v={lbl(p.difficulty_level)} />
                    <Row k="Niveau de recommandation" v={m.recommendation_level ? `${m.recommendation_level}/5` : '—'} />
                  </Sec>
                  <Sec title="Horaires">
                    <Row k="Ouverture" v={val(p.opening_hours || m.opening_hours)} />
                  </Sec>
                  <Sec title="Accessibilité">
                    <Row k="Fauteuil roulant" v={yn(m.is_wheelchair_accessible)} />
                    <Row k="Parking accessible" v={yn(m.has_accessible_parking)} />
                    <Row k="Toilettes accessibles" v={yn(m.has_accessible_restrooms)} />
                    <Row k="Audioguide" v={yn(m.has_audio_guide)} />
                    <Row k="Langue des signes" v={yn(m.has_sign_language_support)} />
                  </Sec>
                  <Sec title="Taxonomies (Plan Your Trip)">
                    <Row k="Types de cuisine" v={arr(m.cuisine_types)} />
                    <Row k="Régimes alimentaires" v={arr(m.dietary_restrictions_supported)} />
                    <Row k="Catégories restaurant" v={arr(m.restaurant_categories)} />
                    <Row k="Types hébergement" v={arr(m.accommodation_types)} />
                    <Row k="Équipements hébergement" v={arr(m.accommodation_amenities)} />
                    <Row k="Emplacement hébergement" v={arr(m.accommodation_locations)} />
                    <Row k="Catégories activité" v={arr(m.activity_categories)} />
                    <Row k="Intérêts activité" v={arr(m.activity_interests)} />
                    <Row k="Tags" v={arr((p.tags || []).map((t: any) => (typeof t === 'object' ? (t.label_fr || t.code) : t)))} />
                    <Row k="Amenities" v={arr(p.amenities)} />
                  </Sec>
                  {imgs.length > 0 && (
                    <Sec title={`Photos (${imgs.length})`}>
                      <div className="flex flex-wrap gap-2">
                        {imgs.slice(0, 12).map((u, i) => (
                          <a key={i} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="" className="w-16 h-16 object-cover rounded border" /></a>
                        ))}
                      </div>
                    </Sec>
                  )}
                  <Sec title="Source / Provenance">
                    <Row k="Source externe" v={val(m.external_source)} />
                    <Row k="ID externe" v={val(m.external_id)} />
                    <Row k="Confiance" v={m.confidence != null ? Number(m.confidence).toFixed(2) : '—'} />
                    <Row k="Catégories source" v={arr(m.categories)} />
                    <Row k="URL source" v={m.source_url ? <a href={m.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">lien</a> : '—'} />
                    <Row k="Licence" v={val(m.license)} />
                  </Sec>
                  <Sec title="Propriétaire / Partenaire">
                    <Row k="Propriétaire" v={p.owner_detail ? `${p.owner_detail.display_name || ''} ${p.owner_detail.email ? '(' + p.owner_detail.email + ')' : ''}`.trim() : '—'} />
                    <Row k="Partenaire" v={p.partner_detail ? `${p.partner_detail.company_name} — ${p.partner_detail.status}` : '—'} />
                    <Row k="POI partenaire (backend)" v={yn(p.backend)} />
                  </Sec>
                  <Sec title="Système">
                    <Row k="Créé le" v={p.created_at ? new Date(p.created_at).toLocaleString('fr-FR') : '—'} />
                    <Row k="Modifié le" v={p.updated_at ? new Date(p.updated_at).toLocaleString('fr-FR') : '—'} />
                    <Row k="Motif rejet" v={val(p.rejection_reason)} />
                    <Row k="Motif blocage" v={val(p.blocked_reason)} />
                  </Sec>
                  <details className="rounded-md border p-3">
                    <summary className="text-sm font-semibold cursor-pointer">Metadata brut (JSON)</summary>
                    <pre className="mt-2 text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-64">{JSON.stringify(m, null, 2)}</pre>
                  </details>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TouristPointsManagement;
