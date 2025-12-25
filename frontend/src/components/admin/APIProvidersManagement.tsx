import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiProviderService, APIProvider, APIProvidersByService } from "@/services/apiProviderService";
import { Check, X, Loader2, RefreshCw, Settings, Server, AlertCircle } from "lucide-react";

const SERVICE_ICONS = {
  hotels: '🏨',
  flights: '✈️',
  activities: '🎯',
  transfers: '🚗',
  restaurants: '🍽️',
  car_rental: '🚙',
};

const SERVICE_COLORS = {
  hotels: 'bg-blue-500/10 text-blue-700 border-blue-300',
  flights: 'bg-green-500/10 text-green-700 border-green-300',
  activities: 'bg-yellow-500/10 text-yellow-700 border-yellow-300',
  transfers: 'bg-cyan-500/10 text-cyan-700 border-cyan-300',
  restaurants: 'bg-red-500/10 text-red-700 border-red-300',
  car_rental: 'bg-gray-500/10 text-gray-700 border-gray-300',
};

const APIProvidersManagement = () => {
  const [providers, setProviders] = useState<APIProvider[]>([]);
  const [groupedProviders, setGroupedProviders] = useState<APIProvidersByService>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('grouped');
  const { toast } = useToast();

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allData, groupedData] = await Promise.all([
        apiProviderService.list(),
        apiProviderService.byService(),
      ]);

      // Handle both array and paginated response formats
      const providersArray = Array.isArray(allData)
        ? allData
        : (allData as any)?.results || [];

      setProviders(providersArray);
      setGroupedProviders(groupedData || {});
    } catch (err) {
      console.error("Error fetching API providers", err);
      setError("Impossible de charger les fournisseurs d'API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const updateProvider = async (id: string, updates: Partial<APIProvider>) => {
    setSavingId(id);
    try {
      const updated = await apiProviderService.update(id, updates);
      setProviders((prev) =>
        prev.map((provider) => (provider.id === id ? updated : provider))
      );

      // Update grouped providers as well
      setGroupedProviders((prev) => {
        const newGrouped = { ...prev };
        Object.keys(newGrouped).forEach((serviceType) => {
          newGrouped[serviceType] = newGrouped[serviceType].map((p) =>
            p.id === id ? updated : p
          );
        });
        return newGrouped;
      });

      toast({ title: "Fournisseur mis à jour avec succès" });
    } catch (err: any) {
      console.error("Error updating provider", err);
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de mettre à jour le fournisseur.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const toggleProvider = async (id: string) => {
    setSavingId(id);
    try {
      const updated = await apiProviderService.toggleActive(id);
      setProviders((prev) =>
        prev.map((provider) => (provider.id === id ? updated : provider))
      );

      // Update grouped providers as well
      setGroupedProviders((prev) => {
        const newGrouped = { ...prev };
        Object.keys(newGrouped).forEach((serviceType) => {
          newGrouped[serviceType] = newGrouped[serviceType].map((p) =>
            p.id === id ? updated : p
          );
        });
        return newGrouped;
      });

      toast({
        title: updated.is_active ? "Fournisseur activé" : "Fournisseur désactivé",
      });
    } catch (err: any) {
      console.error("Error toggling provider", err);
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de modifier le statut.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const renderProviderRow = (provider: APIProvider) => (
    <TableRow key={provider.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          {provider.is_active ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <X className="w-4 h-4 text-red-600" />
          )}
          <span className="font-medium">{provider.provider_name}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={SERVICE_COLORS[provider.service_type as keyof typeof SERVICE_COLORS] || ''}
        >
          {SERVICE_ICONS[provider.service_type as keyof typeof SERVICE_ICONS]}{' '}
          {provider.service_type_display}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={provider.priority}
            className="w-20"
            min="1"
            disabled={savingId === provider.id}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 1) {
                updateProvider(provider.id, { priority: value });
              }
            }}
          />
          <span className="text-xs text-muted-foreground">
            (1 = plus prioritaire)
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {provider.has_credentials ? (
            <Badge variant="default" className="bg-green-500">
              <Check className="w-3 h-3 mr-1" />
              Configurés
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-orange-500/20">
              <AlertCircle className="w-3 h-3 mr-1" />
              Non configurés
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Switch
          checked={provider.is_active}
          disabled={savingId === provider.id}
          onCheckedChange={() => toggleProvider(provider.id)}
        />
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Fournisseurs d'API de réservation
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
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Fournisseurs d'API de réservation
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les fournisseurs d'API pour les hôtels, vols, activités et plus
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(value: 'all' | 'grouped') => setViewMode(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mode d'affichage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grouped">Par service</SelectItem>
              <SelectItem value="all">Tous</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchProviders} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Active Providers Summary */}
        {providers.filter((p) => p.is_active).length > 0 && (
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-sm font-medium mb-2">
              ✅ {providers.filter((p) => p.is_active).length} fournisseur(s) actif(s) sur {providers.length}
            </p>
            <div className="flex flex-wrap gap-2">
              {providers
                .filter((p) => p.is_active)
                .sort((a, b) => a.priority - b.priority)
                .map((p) => (
                  <Badge key={p.id} variant="default">
                    {SERVICE_ICONS[p.service_type as keyof typeof SERVICE_ICONS]} {p.provider_name} ({p.service_type_display}) - Priorité {p.priority}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {viewMode === 'all' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Credentials</TableHead>
                <TableHead>Actif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map(renderProviderRow)}
              {providers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Aucun fournisseur configuré.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <Tabs defaultValue={Object.keys(groupedProviders)[0] || 'hotels'} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {Object.keys(groupedProviders).map((serviceType) => (
                <TabsTrigger key={serviceType} value={serviceType}>
                  {SERVICE_ICONS[serviceType as keyof typeof SERVICE_ICONS]}{' '}
                  {groupedProviders[serviceType][0]?.service_type_display}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(groupedProviders).map(([serviceType, serviceProviders]) => (
              <TabsContent key={serviceType} value={serviceType}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Credentials</TableHead>
                      <TableHead>Actif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceProviders.map(renderProviderRow)}
                    {serviceProviders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                          Aucun fournisseur pour ce service.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Guide */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Guide d'utilisation
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              <strong>Priorité :</strong> Définit l'ordre d'utilisation des fournisseurs (1 = plus haute priorité)
            </li>
            <li>
              <strong>Credentials :</strong> Indique si les clés API sont configurées dans les variables d'environnement
            </li>
            <li>
              <strong>Actif/Inactif :</strong> Active ou désactive un fournisseur pour un service spécifique
            </li>
            <li>
              <strong>Vue par service :</strong> Organisez les fournisseurs par secteur d'activité (hôtels, vols, etc.)
            </li>
          </ul>
          <div className="mt-3 p-2 bg-primary/10 rounded text-xs">
            <strong>⚠️ Important :</strong> Les clés API doivent être configurées dans le fichier backend/.env. La modification de la priorité peut affecter les résultats de recherche.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default APIProvidersManagement;
