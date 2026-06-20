import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Languages, Loader2, Play, RefreshCw, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import { getTranslationCronStats, runTranslationCronNow, runTranslationPass } from "@/services/poiService";

/** Réglage + suivi de la traduction des POI (translategemma:4b). Admin uniquement. */
export const TranslationCronPanel = () => {
  const [enabled, setEnabled] = useState(false);
  const [intervalMin, setIntervalMin] = useState("5");
  const [batch, setBatch] = useState("20");
  // Passe quotidienne (nuit), itérative et time-boxée.
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [dailyHour, setDailyHour] = useState("0");
  const [dailyDuration, setDailyDuration] = useState("6");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [passMode, setPassMode] = useState<null | "missing" | "full">(null);

  const loadSettings = async () => {
    try {
      const data: any = await apiClient.get("admin/system-settings/");
      const list = Array.isArray(data) ? data : (data?.results || []);
      const map: Record<string, string> = {};
      list.forEach((s: any) => { map[s.setting_key] = s.setting_value; });
      setEnabled((map["translation_cron_enabled"] || "false") === "true");
      setIntervalMin(map["translation_cron_interval_minutes"] || "5");
      setBatch(map["translation_batch_size"] || "20");
      setDailyEnabled((map["translation_daily_enabled"] || "false") === "true");
      setDailyHour(map["translation_daily_hour"] || "0");
      setDailyDuration(map["translation_daily_duration_hours"] || "6");
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
        apiClient.patch(`admin/system-settings/translation_daily_enabled/`, { setting_value: dailyEnabled ? "true" : "false" }),
        apiClient.patch(`admin/system-settings/translation_daily_hour/`, { setting_value: String(Math.min(23, Math.max(0, Number(dailyHour) || 0))) }),
        apiClient.patch(`admin/system-settings/translation_daily_duration_hours/`, { setting_value: String(Math.max(0.1, Number(dailyDuration) || 6)) }),
      ]);
      toast.success("Réglages enregistrés. Le worker les applique au cycle suivant.");
    } catch (e: any) { toast.error(e?.message || "Échec de l'enregistrement."); }
    finally { setSaving(false); }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await runTranslationCronNow(10);
      toast.success(`Lot file traité : ${r.done} traduit(s), ${r.failed} échec(s).`);
      await loadStats();
    } catch (e: any) { toast.error(e?.message || "Échec du lancement."); }
    finally { setRunning(false); }
  };

  const runPass = async (mode: "missing" | "full") => {
    setPassMode(mode);
    try {
      const r = await runTranslationPass(mode);
      toast.success(
        `Passe ${mode === "missing" ? "incrémentale" : "complète"} : ` +
        `${r.poi_completed ?? 0} POI complété(s), ${r.tax?.changed ?? 0} taxonomie(s) màj.` +
        (r.wrapped ? " (fin de table atteinte)" : "")
      );
      await loadStats();
    } catch (e: any) { toast.error(e?.message || "Échec de la passe."); }
    finally { setPassMode(null); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const poiDone = stats?.daily?.poi_done ?? 0;
  const poiTotal = stats?.daily?.poi_total ?? 0;
  const poiPct = poiTotal ? Math.min(100, Math.round((poiDone / poiTotal) * 1000) / 10) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Languages className="w-5 h-5" />Traduction des POI (file on-demand)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer la file on-demand</Label>
              <p className="text-sm text-muted-foreground">
                Traduit en arrière-plan les POI consultés (file d'attente) via translategemma:4b.
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5" />Passe quotidienne (nuit, itérative)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer la passe quotidienne</Label>
              <p className="text-sm text-muted-foreground">
                Chaque jour à l'heure choisie, traduit petit à petit taxonomies + tous les POI (détection de langue,
                correction des contenus mal placés, complétion des langues manquantes). S'arrête après la durée fixée et reprend la nuit suivante.
              </p>
            </div>
            <Switch checked={dailyEnabled} onCheckedChange={setDailyEnabled} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tc-hour">Heure de démarrage (0–23)</Label>
              <Input id="tc-hour" type="number" min={0} max={23} value={dailyHour} onChange={(e) => setDailyHour(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-dur">Durée max (heures)</Label>
              <Input id="tc-dur" type="number" min={0.1} step={0.5} value={dailyDuration} onChange={(e) => setDailyDuration(e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression backfill POI</span>
              <span className="font-medium">{poiDone.toLocaleString("fr-FR")} / {poiTotal.toLocaleString("fr-FR")} ({poiPct}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-muted">
              <div className="h-full bg-green-600" style={{ width: `${poiPct}%` }} />
            </div>
            {stats?.daily?.last_run ? (
              <p className="text-xs text-muted-foreground">Dernier déclenchement quotidien : {stats.daily.last_run}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Enregistrer les réglages</Button>
            <Button variant="ghost" onClick={refresh}><RefreshCw className="w-4 h-4 mr-2" />Rafraîchir</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => runPass("missing")} disabled={passMode !== null}>
              {passMode === "missing" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}Compléter les traductions manquantes
            </Button>
            <Button variant="outline" onClick={() => runPass("full")} disabled={passMode !== null}>
              {passMode === "full" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}Lancer une passe complète maintenant
            </Button>
            <Button variant="ghost" onClick={runNow} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}Vider la file on-demand
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            « Compléter les manquants » = incrémental (ne touche pas aux contenus déjà complets). « Passe complète » = même travail que la nuit (par lot borné, reprenable au clic suivant).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Suivi de la file</CardTitle></CardHeader>
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
