import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { widgetService, Widget, WidgetsByPlacement } from "@/services/widgetService";
import { Check, X, Loader2, RefreshCw, Settings, Layout, Plus, Edit, Trash2, Search, Filter, Sparkles, CheckCircle2, XCircle, Save } from "lucide-react";
import { WIDGET_TEMPLATES } from "@/components/widgets/widgetRegistry";

const WIDGET_TYPE_OPTIONS = [
  { value: 'booking', label: 'Widget de réservation' },
  { value: 'search', label: 'Widget de recherche' },
  { value: 'promotion', label: 'Widget promotionnel' },
  { value: 'information', label: 'Widget informatif' },
  { value: 'partner', label: 'Widget partenaire' },
  { value: 'social', label: 'Widget social' },
  { value: 'custom', label: 'Widget personnalisé' },
];

const PLACEMENT_OPTIONS = [
  { value: 'home', label: 'Page d\'accueil' },
  { value: 'home_transport_car', label: 'Accueil - Location de voiture' },
  { value: 'home_transport_transfers', label: 'Accueil - Transferts' },
  { value: 'home_transport_public', label: 'Accueil - Transport public' },
  { value: 'home_transport_urban', label: 'Accueil - Transport urbain' },
  { value: 'home_activities_tours', label: 'Accueil - Tours & Visites' },
  { value: 'home_activities_dining', label: 'Accueil - Gastronomie' },
  { value: 'home_services_esim', label: 'Accueil - Cartes eSIM' },
  { value: 'home_services_compensation', label: 'Accueil - Indemnisation' },
  { value: 'search_results', label: 'Résultats de recherche' },
  { value: 'detail_page', label: 'Page de détail' },
  { value: 'sidebar', label: 'Barre latérale' },
  { value: 'footer', label: 'Pied de page' },
  { value: 'header', label: 'En-tête' },
  { value: 'floating', label: 'Flottant' },
  { value: 'modal', label: 'Modal/Popup' },
];

const SERVICE_OPTIONS = [
  { value: 'all', label: 'Tous les services' },
  { value: 'hotels', label: 'Hôtels' },
  { value: 'flights', label: 'Vols' },
  { value: 'activities', label: 'Activités' },
  { value: 'transfers', label: 'Transferts' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'car_rental', label: 'Location de voiture' },
];

const WidgetManagement = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [groupedWidgets, setGroupedWidgets] = useState<WidgetsByPlacement>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPlacement, setFilterPlacement] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all' | 'active' | 'inactive'

  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    widget_code: '',
    widget_name: '',
    widget_type: 'custom' as string,
    placement: 'home' as string,
    service_type: 'all' as string,
    priority: 1,
    description: '',
    configuration: '{}',
    content: '{}',
    script_url: '',
    css_url: '',
  });

  const fetchWidgets = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allData, groupedData] = await Promise.all([
        widgetService.list(),
        widgetService.byPlacement(),
      ]);
      // Handle both array and paginated response formats
      const widgetsArray = Array.isArray(allData)
        ? allData
        : (allData as any)?.results || [];
      setWidgets(widgetsArray);
      setGroupedWidgets(groupedData || {});
    } catch (err) {
      console.error("Error fetching widgets", err);
      setError("Impossible de charger les widgets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  const openEditDialog = (widget: Widget) => {
    setEditingWidget(widget);
    setFormData({
      widget_code: widget.widget_code,
      widget_name: widget.widget_name,
      widget_type: widget.widget_type,
      placement: widget.placement,
      service_type: widget.service_type || 'all',
      priority: widget.priority,
      description: widget.description || '',
      configuration: JSON.stringify(widget.configuration || {}, null, 2),
      content: JSON.stringify(widget.content || {}, null, 2),
      script_url: widget.script_url || '',
      css_url: widget.css_url || '',
    });
    setIsCreateDialogOpen(true);
  };

  const createFromTemplate = (template: typeof WIDGET_TEMPLATES[0]) => {
    setFormData({
      widget_code: template.code,
      widget_name: template.name,
      widget_type: template.type,
      placement: template.placement || 'home',
      service_type: template.service_type,
      priority: 1,
      description: template.description,
      configuration: '{}',
      content: '{}',
      script_url: '',
      css_url: '',
    });
    setIsTemplatesDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handleSaveWidget = async () => {
    try {
      // Validate JSON fields
      let config, content;
      try {
        config = formData.configuration ? JSON.parse(formData.configuration) : {};
        content = formData.content ? JSON.parse(formData.content) : {};
      } catch (e) {
        toast({
          title: "Erreur JSON",
          description: "Les champs Configuration et Contenu doivent être du JSON valide",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        widget_code: formData.widget_code,
        widget_name: formData.widget_name,
        widget_type: formData.widget_type,
        placement: formData.placement,
        service_type: formData.service_type,
        priority: formData.priority,
        description: formData.description,
        configuration: config,
        content: content,
        script_url: formData.script_url,
        css_url: formData.css_url,
      };

      if (editingWidget) {
        // Update existing widget
        await widgetService.update(editingWidget.id, payload);
        toast({ title: "Widget mis à jour avec succès" });
      } else {
        // Create new widget
        await widgetService.create(payload);
        toast({ title: "Widget créé avec succès" });
      }

      // Notify all widget renderers to refresh
      window.dispatchEvent(new CustomEvent('widgets-updated', {
        detail: { action: editingWidget ? 'update' : 'create' }
      }));

      setIsCreateDialogOpen(false);
      setEditingWidget(null);
      resetForm();
      fetchWidgets();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || `Impossible de ${editingWidget ? 'modifier' : 'créer'} le widget`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      widget_code: '',
      widget_name: '',
      widget_type: 'custom',
      placement: 'home',
      service_type: 'all',
      priority: 1,
      description: '',
      configuration: '{}',
      content: '{}',
      script_url: '',
      css_url: '',
    });
    setEditingWidget(null);
  };

  const updateWidget = async (id: string, updates: any) => {
    setSavingId(id);
    try {
      const updated = await widgetService.update(id, updates);
      setWidgets((prev) =>
        prev.map((widget) => (widget.id === id ? updated : widget))
      );

      // Update grouped widgets as well
      setGroupedWidgets((prev) => {
        const newGrouped = { ...prev };
        Object.keys(newGrouped).forEach((placement) => {
          newGrouped[placement] = newGrouped[placement].map((w) =>
            w.id === id ? updated : w
          );
        });
        return newGrouped;
      });

      // Notify all widget renderers to refresh
      window.dispatchEvent(new CustomEvent('widgets-updated', {
        detail: { widgetId: id, action: 'update' }
      }));

      toast({ title: "Widget mis à jour avec succès" });
    } catch (err: any) {
      console.error("Error updating widget", err);
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de mettre à jour le widget.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const toggleWidget = async (id: string) => {
    setSavingId(id);
    try {
      const updated = await widgetService.toggleActive(id);
      setWidgets((prev) =>
        prev.map((widget) => (widget.id === id ? updated : widget))
      );

      setGroupedWidgets((prev) => {
        const newGrouped = { ...prev };
        Object.keys(newGrouped).forEach((placement) => {
          newGrouped[placement] = newGrouped[placement].map((w) =>
            w.id === id ? updated : w
          );
        });
        return newGrouped;
      });

      // Notify all widget renderers to refresh
      window.dispatchEvent(new CustomEvent('widgets-updated', {
        detail: { widgetId: id, action: 'toggle' }
      }));

      toast({
        title: updated.is_active ? "Widget activé" : "Widget désactivé",
      });
    } catch (err: any) {
      console.error("Error toggling widget", err);
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de modifier le statut.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const deleteWidget = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce widget ?")) return;

    try {
      await widgetService.delete(id);
      setWidgets((prev) => prev.filter((w) => w.id !== id));

      setGroupedWidgets((prev) => {
        const newGrouped = { ...prev };
        Object.keys(newGrouped).forEach((placement) => {
          newGrouped[placement] = newGrouped[placement].filter((w) => w.id !== id);
        });
        return newGrouped;
      });

      // Notify all widget renderers to refresh
      window.dispatchEvent(new CustomEvent('widgets-updated', {
        detail: { widgetId: id, action: 'delete' }
      }));

      toast({ title: "Widget supprimé avec succès" });
    } catch (err: any) {
      console.error("Error deleting widget", err);
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de supprimer le widget.",
        variant: "destructive",
      });
    }
  };

  // Apply filters and search
  const filteredWidgets = widgets.filter((widget) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        widget.widget_name.toLowerCase().includes(query) ||
        widget.widget_code.toLowerCase().includes(query) ||
        (widget.description && widget.description.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType !== 'all' && widget.widget_type !== filterType) {
      return false;
    }

    // Placement filter
    if (filterPlacement !== 'all' && widget.placement !== filterPlacement) {
      return false;
    }

    // Service filter
    if (filterService !== 'all' && widget.service_type !== filterService) {
      return false;
    }

    // Status filter
    if (filterStatus === 'active' && !widget.is_active) {
      return false;
    }
    if (filterStatus === 'inactive' && widget.is_active) {
      return false;
    }

    return true;
  });

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterPlacement('all');
    setFilterService('all');
    setFilterStatus('all');
  };

  const hasActiveFilters = searchQuery || filterType !== 'all' ||
    filterPlacement !== 'all' || filterService !== 'all' || filterStatus !== 'all';

  const renderWidgetRow = (widget: Widget) => (
    <TableRow key={widget.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          {widget.is_active ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <X className="w-4 h-4 text-red-600" />
          )}
          <div>
            <div className="font-medium">{widget.widget_name}</div>
            <div className="text-xs text-muted-foreground">{widget.widget_code}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {widget.widget_type_display}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {widget.placement_display}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {widget.service_type_display}
        </Badge>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={widget.priority}
          className="w-20"
          min="1"
          disabled={savingId === widget.id}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value >= 1) {
              updateWidget(widget.id, { priority: value });
            }
          }}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={widget.is_active}
          disabled={savingId === widget.id}
          onCheckedChange={() => toggleWidget(widget.id)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(widget)}
            title="Éditer"
          >
            <Edit className="w-4 h-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteWidget(widget.id)}
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Gestion des Widgets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Gestion des Widgets
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les widgets affichés sur votre site de voyage
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={viewMode} onValueChange={(value: 'all' | 'grouped') => setViewMode(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Mode d'affichage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grouped">Par emplacement</SelectItem>
                <SelectItem value="all">Tous</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchWidgets} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Rafraîchir
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsTemplatesDialogOpen(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Widget
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {widgets.filter((w) => w.is_active).length > 0 && (
            <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm font-medium mb-2 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1" /> {widgets.filter((w) => w.is_active).length} widget(s) actif(s) sur {widgets.length}
              </p>
            </div>
          )}

          {/* Search and Filter Section */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recherche et filtres</h3>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, code ou description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {WIDGET_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Emplacement</Label>
                <Select value={filterPlacement} onValueChange={setFilterPlacement}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les emplacements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les emplacements</SelectItem>
                    {PLACEMENT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Service</Label>
                <Select value={filterService} onValueChange={setFilterService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les services" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Statut</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="active"><span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Actifs uniquement</span></SelectItem>
                    <SelectItem value="inactive"><span className="flex items-center"><XCircle className="w-4 h-4 mr-1" /> Inactifs uniquement</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Info and Clear Button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredWidgets.length === widgets.length ? (
                  `${widgets.length} widget(s) au total`
                ) : (
                  <>
                    <span className="font-medium text-primary">{filteredWidgets.length}</span> widget(s) sur {widgets.length}
                  </>
                )}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Effacer les filtres
                </Button>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Widget</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWidgets.map(renderWidgetRow)}
              {filteredWidgets.length === 0 && widgets.length > 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Aucun widget ne correspond aux filtres sélectionnés.
                  </TableCell>
                </TableRow>
              )}
              {widgets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Aucun widget configuré. Cliquez sur "Nouveau Widget" pour commencer.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Guide d'utilisation
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <strong>Priorité :</strong> Définit l'ordre d'affichage des widgets (1 = plus haute priorité)
              </li>
              <li>
                <strong>Configuration :</strong> Stocke les paramètres spécifiques du widget (JSON)
              </li>
              <li>
                <strong>Contenu :</strong> Stocke le contenu du widget (JSON)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de création/édition */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">{editingWidget ? <><Edit className="w-5 h-5" /> Éditer le widget</> : <><Plus className="w-5 h-5" /> Créer un nouveau widget</>}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="widget_code">Code du widget *</Label>
                <Input
                  id="widget_code"
                  placeholder="ex: kayak_hotel_search"
                  value={formData.widget_code}
                  onChange={(e) => setFormData({ ...formData, widget_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="widget_name">Nom du widget *</Label>
                <Input
                  id="widget_name"
                  placeholder="ex: Recherche d'hôtels Kayak"
                  value={formData.widget_name}
                  onChange={(e) => setFormData({ ...formData, widget_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="widget_type">Type de widget</Label>
                <Select value={formData.widget_type} onValueChange={(value) => setFormData({ ...formData, widget_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WIDGET_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="placement">Emplacement</Label>
                <Select value={formData.placement} onValueChange={(value) => setFormData({ ...formData, placement: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_type">Service</Label>
                <Select value={formData.service_type} onValueChange={(value) => setFormData({ ...formData, service_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description du widget"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="script_url">URL du script (optionnel)</Label>
                <Input
                  id="script_url"
                  placeholder="https://..."
                  value={formData.script_url}
                  onChange={(e) => setFormData({ ...formData, script_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="css_url">URL du CSS (optionnel)</Label>
                <Input
                  id="css_url"
                  placeholder="https://..."
                  value={formData.css_url}
                  onChange={(e) => setFormData({ ...formData, css_url: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="configuration">Configuration (JSON)</Label>
              <Textarea
                id="configuration"
                placeholder='{"height": "500px", "width": "100%"}'
                value={formData.configuration}
                onChange={(e) => setFormData({ ...formData, configuration: e.target.value })}
                className="font-mono text-xs"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenu (JSON)</Label>
              <Textarea
                id="content"
                placeholder='{"title": "Mon widget", "description": "..."}'
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="font-mono text-xs"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              Annuler
            </Button>
            <Button onClick={handleSaveWidget}>
              <span className="flex items-center gap-2">{editingWidget ? <><Save className="w-4 h-4" /> Enregistrer</> : <><CheckCircle2 className="w-4 h-4" /> Créer le widget</>}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={isTemplatesDialogOpen} onOpenChange={setIsTemplatesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Templates de widgets prédéfinis
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-6">
              Sélectionnez un widget prédéfini pour l'ajouter rapidement à votre site.
              Ces widgets sont déjà configurés et prêts à l'emploi.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WIDGET_TEMPLATES.map((template) => (
                <Card key={template.code} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => createFromTemplate(template)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <template.icon className="w-8 h-8 text-muted-foreground" />
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {template.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {SERVICE_OPTIONS.find(s => s.value === template.service_type)?.label || template.service_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplatesDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WidgetManagement;
