import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Languages, Loader2, Play, RefreshCw, Save, Square, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import {
  getTranslationCronStats, runTranslationCronNow,
  startTranslationPass, stopTranslationPass, clearTranslationLogs,
} from "@/services/poiService";

/** Réglage, pilotage et suivi de la traduction des POI (translategemma:4b). Admin uniquement. */
export const TranslationCronPanel = () => {
  const [enabled, setEnabled] = useState(false);
  const [intervalMin, setIntervalMin] = useState("5");
  const [batch, setBatch] = useState("20");
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [dailyHour, setDailyHour] = useState("0");
  const [dailyDuration, setDailyDuration] = useState("6");
  const [manualMode, setManualMode] = useState<"missing" | "full">("missing");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<null | "start" | "stop" | "queue" | "clear">(null);
  const pollRef = useRef<number | null>(null);

  const manualRunning = !!stats?.manual?.running;

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
      if (map["translation_manual_mode"] === "full" || map["translation_manual_mode"] === "missing")
        setManualMode(map["translation_manual_mode"] as "missing" | "full");
    } catch { /* ignore */ }
  };
  const loadStats = async () => { try { setStats(await getTranslationCronStats()); } catch { /* ignore */ } };
  const refresh = async () => { setLoading(true); await Promise.all([loadSettings(), loadStats()]); setLoading(false); };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  // Pendant qu'une passe manuelle tourne, on rafraîchit l'état toutes les 6 s.
  useEffect(() => {
    if (manualRunning && pollRef.current == null) {
      pollRef.current = window.setInterval(loadStats, 6000);
    } else if (!manualRunning && pollRef.current != null) {
      window.clearInterval(pollRef.current); pollRef.current = null;
    }
    return () => { if (pollRef.current != null) { window.clearInterval(pollRef.current); pollRef.current = null; } };
  }, [manualRunning]);

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

  const start = async () => {
    setBusy("start");
    try { await startTranslationPass(manualMode); toast.success(`Passe manuelle démarrée (${manualMode}).`); await loadStats(); }
    catch (e: any) { toast.error(e?.message || "Échec du démarrage."); }
    finally { setBusy(null); }
  };
  const stop = async () => {
    setBusy("stop");
    try { await stopTranslationPass(); toast.success("Arrêt demandé. La passe s'arrête sous quelques secondes."); await loadStats(); }
    catch (e: any) { toast.error(e?.message || "Échec de l'arrêt."); }
    finally { setBusy(null); }
  };
  const drainQueue = async () => {
    setBusy("queue");
    try { const r = await runTranslationCronNow(10); toast.success(`File : ${r.done} traduit(s), ${r.failed} échec(s).`); await loadStats(); }
    catch (e: any) { toast.error(e?.message || "Échec."); }
    finally { setBusy(null); }
  };
  const clearLogs = async () => {
    if (!window.confirm("Supprimer l'historique des exécutions et les entrées de file traitées ?\nLes traductions des POI ne sont PAS touchées.")) return;
    setBusy("clear");
    try { const r = await clearTranslationLogs(); toast.success(`Logs purgés : ${r.runs_deleted} exécution(s), ${r.jobs_deleted} entrée(s) de file.`); await loadStats(); }
    catch (e: any) { toast.error(e?.message || "Échec de la purge."); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const poiDone = stats?.daily?.poi_done ?? 0;
  const poiTotal = stats?.daily?.poi_total ?? 0;
  const poiPct = poiTotal ? Math.min(100, Math.round((poiDone / poiTotal) * 1000) / 10) : 0;
  const runs: any[] = stats?.runs || [];
  const fmt = (s?: string) => (s ? new Date(s).toLocaleString("fr-FR") : "—");

  return (
    <div className="space-y-6">
      {/* File on-demand */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Languages className="w-5 h-5" />Traduction des POI (file on-demand)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activer la file on-demand</Label>
              <p className="text-sm text-muted-foreground">Traduit en arrière-plan les POI consultés (file d'attente) via translategemma:4b.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="tc-interval">Intervalle (minutes)</Label>
              <Input id="tc-interval" type="number" min={1} value={intervalMin} onChange={(e) => setIntervalMin(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="tc-batch">POI par cycle (lot)</Label>
              <Input id="tc-batch" type="number" min={1} value={batch} onChange={(e) => setBatch(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Passe quotidienne */}
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
                correction des contenus mal placés, complétion des langues manquantes). S'arrête après la durée fixée, reprend la nuit suivante.
              </p>
            </div>
            <Switch checked={dailyEnabled} onCheckedChange={setDailyEnabled} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="tc-hour">Heure de démarrage (0–23)</Label>
              <Input id="tc-hour" type="number" min={0} max={23} value={dailyHour} onChange={(e) => setDailyHour(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="tc-dur">Durée max (heures)</Label>
              <Input id="tc-dur" type="number" min={0.1} step={0.5} value={dailyDuration} onChange={(e) => setDailyDuration(e.target.value)} /></div>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression backfill POI</span>
              <span className="font-medium">{poiDone.toLocaleString("fr-FR")} / {poiTotal.toLocaleString("fr-FR")} ({poiPct}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-muted"><div className="h-full bg-green-600" style={{ width: `${poiPct}%` }} /></div>
            {stats?.daily?.last_run ? <p className="text-xs text-muted-foreground">Dernier déclenchement quotidien : {stats.daily.last_run}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Enregistrer les réglages</Button>
            <Button variant="ghost" onClick={refresh}><RefreshCw className="w-4 h-4 mr-2" />Rafraîchir</Button>
          </div>
        </CardContent>
      </Card>

      {/* Passe manuelle (start/stop, sans limite de temps) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5" />Lancement manuel (sans limite de temps)
            {manualRunning ? <Badge className="ml-2 bg-green-600">en cours</Badge> : <Badge variant="outline" className="ml-2">arrêté</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Démarre une traduction continue (taxonomies + POI) jusqu'à l'arrêt manuel. <b>Compléter les manquants</b> = ne touche pas
            aux contenus déjà complets. <b>Passe complète</b> = corrige aussi les contenus mal placés.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Mode :</span>
            <Button size="sm" variant={manualMode === "missing" ? "default" : "outline"} disabled={manualRunning} onClick={() => setManualMode("missing")}>Compléter les manquants</Button>
            <Button size="sm" variant={manualMode === "full" ? "default" : "outline"} disabled={manualRunning} onClick={() => setManualMode("full")}>Passe complète</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {!manualRunning ? (
              <Button onClick={start} disabled={busy !== null}>{busy === "start" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}Démarrer</Button>
            ) : (
              <Button variant="destructive" onClick={stop} disabled={busy !== null}>{busy === "stop" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Square className="w-4 h-4 mr-2" />}Arrêter</Button>
            )}
            <Button variant="ghost" onClick={drainQueue} disabled={busy !== null}>{busy === "queue" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}Vider la file on-demand</Button>
          </div>
        </CardContent>
      </Card>

      {/* État : historique des exécutions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>État des exécutions</span>
            <Button size="sm" variant="outline" onClick={clearLogs} disabled={busy !== null}>
              {busy === "clear" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}Vider les logs
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3"><div className="text-2xl font-bold">{stats?.pending ?? 0}</div><div className="text-xs text-muted-foreground">File en attente</div></div>
            <div className="rounded-lg border p-3"><div className="text-2xl font-bold text-green-600">{stats?.done ?? 0}</div><div className="text-xs text-muted-foreground">File traduits</div></div>
            <div className="rounded-lg border p-3"><div className="text-2xl font-bold text-red-600">{stats?.failed ?? 0}</div><div className="text-xs text-muted-foreground">File échecs</div></div>
          </div>
          <div>
            <Label className="text-sm">Historique des passes (manuelles & quotidiennes)</Label>
            <div className="mt-2 overflow-x-auto">
              {runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune exécution enregistrée.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left py-1 pr-2">Type</th><th className="text-left pr-2">Mode</th><th className="text-left pr-2">État</th>
                      <th className="text-right pr-2">Taxo.</th><th className="text-right pr-2">POI ✓</th><th className="text-left pr-2">Début</th><th className="text-left">Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-b border-border/40">
                        <td className="py-1 pr-2"><Badge variant="outline">{r.source === "manual" ? "Manuel" : "Quotidien"}</Badge></td>
                        <td className="pr-2">{r.mode || "—"}</td>
                        <td className="pr-2">
                          <Badge className={r.status === "running" ? "bg-green-600" : r.status === "done" ? "bg-blue-600" : "bg-muted text-foreground"}>
                            {r.status === "running" ? "en cours" : r.status === "done" ? "terminé" : "arrêté"}
                          </Badge>
                        </td>
                        <td className="text-right pr-2">{r.tax_changed}</td>
                        <td className="text-right pr-2 text-green-700">{r.poi_completed}</td>
                        <td className="pr-2 text-xs text-muted-foreground">{fmt(r.started_at)}</td>
                        <td className="text-xs text-muted-foreground">{fmt(r.finished_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationCronPanel;
