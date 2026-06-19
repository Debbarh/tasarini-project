import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Languages, Loader2, Play, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { getTranslationCronStats, runTranslationCronNow } from "@/services/poiService";

/** Réglage + suivi du cron de traduction des POI (translategemma:4b). Admin uniquement. */
export const TranslationCronPanel = () => {
  const [enabled, setEnabled] = useState(false);
  const [intervalMin, setIntervalMin] = useState("5");
  const [batch, setBatch] = useState("20");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const loadSettings = async () => {
    try {
      const data: any = await apiClient.get("admin/system-settings/");
      const list = Array.isArray(data) ? data : (data?.results || []);
      const map: Record<string, string> = {};
      list.forEach((s: any) => { map[s.setting_key] = s.setting_value; });
      setEnabled((map["translation_cron_enabled"] || "false") === "true");
      setIntervalMin(map["translation_cron_interval_minutes"] || "5");
      setBatch(map["translation_batch_size"] || "20");
    } catch { /* ignore */ }
  };
  const loadStats = async () => { try { setStats(await getTranslationCronStats()); } catch { /* ignore */ } };
  const refresh = async () => { setLoading(true); await Promise.all([loadSettings(), loadStats()]); setLoading(false); };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        apiClient.patch(`admin/system-settings/translation_cron_enabled/`, { setting_value: enabled ? "true" : "false" }),
        apiClient.patch(`admin/system-settings/translation_cron_interval_minutes/`, { setting_value: String(Math.max(1, Number(intervalMin) || 5)) }),
        apiClient.patch(`admin/system-settings/translation_batch_size/`, { setting_value: String(Math.max(1, Number(batch) || 20)) }),
      ]);
      toast.success("Réglages du cron enregistrés. Le worker les applique au cycle suivant.");
    } catch (e: any) { toast.error(e?.message || "Échec de l'enregistrement."); }
    finally { setSaving(false); }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await runTranslationCronNow(10);
      toast.success(`Lot traité : ${r.done} traduit(s), ${r.failed} échec(s).`);
      await loadStats();
    } catch (e: any) { toast.error(e?.message || "Échec du lancement."); }
    finally { setRunning(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Languages className="w-5 h-5" />Traduction automatique des POI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer le cron de traduction</Label>
              <p className="text-sm text-muted-foreground">
                Traduit en arrière-plan les POI consultés (file d'attente) via translategemma:4b. Désactivé = aucune traduction automatique.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tc-interval">Intervalle (minutes)</Label>
              <Input id="tc-interval" type="number" min={1} value={intervalMin} onChange={(e) => setIntervalMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-batch">POI par cycle (lot)</Label>
              <Input id="tc-batch" type="number" min={1} value={batch} onChange={(e) => setBatch(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Enregistrer</Button>
            <Button variant="outline" onClick={runNow} disabled={running}>{running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}Lancer un lot maintenant</Button>
            <Button variant="ghost" onClick={refresh}><RefreshCw className="w-4 h-4 mr-2" />Rafraîchir</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Suivi du cron</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3"><div className="text-2xl font-bold">{stats?.pending ?? 0}</div><div className="text-xs text-muted-foreground">En attente</div></div>
            <div className="rounded-lg border p-3"><div className="text-2xl font-bold text-green-600">{stats?.done ?? 0}</div><div className="text-xs text-muted-foreground">Traduits</div></div>
            <div className="rounded-lg border p-3"><div className="text-2xl font-bold text-red-600">{stats?.failed ?? 0}</div><div className="text-xs text-muted-foreground">Échecs</div></div>
          </div>
          <div>
            <Label className="text-sm">Dernières traductions</Label>
            <div className="mt-2 space-y-1 max-h-72 overflow-y-auto">
              {(stats?.recent || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune traduction récente.</p>
              ) : (stats.recent).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
                  <span className="truncate">{r["tourist_point__name"] || "—"}</span>
                  <span className="shrink-0 ml-2 inline-flex items-center gap-2">
                    <Badge variant="outline">{r.lang}</Badge>
                    <span className="text-muted-foreground text-xs">{r.updated_at ? new Date(r.updated_at).toLocaleString("fr-FR") : ""}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationCronPanel;
