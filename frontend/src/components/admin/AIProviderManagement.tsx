import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { aiProviderService, AIProviderConfig } from "@/services/aiProviderService";

// Modèles disponibles par provider
const AVAILABLE_MODELS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommandé - Rapide et économique)' },
    { value: 'gpt-4o', label: 'GPT-4o (Puissant)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Très puissant)' },
    { value: 'gpt-4', label: 'GPT-4 (Classique)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Économique)' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommandé - Rapide)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Plus puissant)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-flash-latest', label: 'Gemini Flash Latest (Toujours à jour)' },
    { value: 'gemini-pro-latest', label: 'Gemini Pro Latest (Toujours à jour)' },
    { value: 'gemini-exp-1206', label: 'Gemini Experimental' },
  ],
  perplexity: [
    { value: 'sonar', label: 'Sonar (Recommandé - Rapide et performant)' },
    { value: 'sonar-pro', label: 'Sonar Pro (Plus puissant, meilleure qualité)' },
    { value: 'sonar-reasoning', label: 'Sonar Reasoning (Raisonnement complexe)' },
  ],
};

const AIProviderManagement = () => {
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiProviderService.list();
      // Handle both array and paginated response formats
      const providersArray = Array.isArray(data)
        ? data
        : (data as any)?.results || [];
      setProviders(providersArray);
    } catch (err) {
      console.error("Error fetching AI providers", err);
      setError("Impossible de charger la configuration IA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const updateProvider = async (id: string, updates: Partial<AIProviderConfig>) => {
    setSavingId(id);
    try {
      const updated = await aiProviderService.update(id, updates);
      setProviders((prev) => prev.map((provider) => (provider.id === id ? updated : provider)));
      toast({ title: "Configuration mise à jour" });
    } catch (err: any) {
      console.error("Error updating provider", err);
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de mettre à jour la configuration.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Fournisseurs IA</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les modèles d'IA pour la génération d'itinéraires
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProviders} disabled={loading}>
          {loading ? "Actualisation..." : "Rafraîchir"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        {/* Info sur le provider actif */}
        {providers.some(p => p.is_enabled) && (
          <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-sm font-medium mb-1">Provider actif :</p>
            <div className="flex flex-wrap gap-2">
              {providers
                .filter(p => p.is_enabled)
                .map(p => (
                  <Badge key={p.id} variant="default">
                    {p.display_name} ({p.model_name})
                  </Badge>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Le premier provider actif (ordre alphabétique) sera utilisé pour générer les itinéraires
            </p>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead>Température</TableHead>
              <TableHead>Activation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell className="font-medium">{provider.display_name}</TableCell>
                <TableCell>
                  <Label htmlFor={`model-${provider.id}`} className="sr-only">
                    Modèle
                  </Label>
                  <Select
                    value={provider.model_name}
                    disabled={savingId === provider.id}
                    onValueChange={(value) => {
                      setProviders((prev) =>
                        prev.map((p) => (p.id === provider.id ? { ...p, model_name: value } : p))
                      );
                      updateProvider(provider.id, { model_name: value });
                    }}
                  >
                    <SelectTrigger id={`model-${provider.id}`} className="w-full">
                      <SelectValue placeholder="Sélectionner un modèle" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS[provider.provider as keyof typeof AVAILABLE_MODELS]?.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Label htmlFor={`temp-${provider.id}`} className="sr-only">
                    Température
                  </Label>
                  <Input
                    id={`temp-${provider.id}`}
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={provider.temperature}
                    disabled={savingId === provider.id}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setProviders((prev) =>
                        prev.map((p) => (p.id === provider.id ? { ...p, temperature: value } : p))
                      );
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        updateProvider(provider.id, { temperature: value });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={provider.is_enabled}
                      disabled={savingId === provider.id}
                      onCheckedChange={(checked) => updateProvider(provider.id, { is_enabled: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {provider.is_enabled ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {providers.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Aucun fournisseur configuré.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Guide d'utilisation */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="text-sm font-semibold">💡 Guide d'utilisation</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Modèle :</strong> Sélectionnez le modèle d'IA dans la liste déroulante. Les modèles "Flash" sont plus rapides, les "Pro" plus puissants.</li>
            <li><strong>Température :</strong> Contrôle la créativité (0 = déterministe, 1 = très créatif). Recommandé : 0.7</li>
            <li><strong>Activation :</strong> Activez/désactivez un provider. Si plusieurs sont actifs, le premier par ordre alphabétique est utilisé.</li>
            <li><strong>Sauvegarde :</strong> Les changements sont sauvegardés automatiquement.</li>
          </ul>
          <div className="mt-3 p-2 bg-primary/10 rounded text-xs">
            <strong>⚠️ Important :</strong> Les clés API doivent être configurées dans le fichier backend/.env
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIProviderManagement;
