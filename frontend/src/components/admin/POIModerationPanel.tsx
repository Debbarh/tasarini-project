import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BadgeCheck, PencilLine, Check, X, ExternalLink, Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPendingPOIClaims, moderatePOIClaim,
  getPendingPOISuggestions, moderatePOISuggestion,
  getPendingPOIReports, moderatePOIReport,
} from "@/services/poiService";
import { extractArrayFromResponse } from "@/integrations/api/client";
import { getLocalizedLabel } from "@/utils/multilingualHelpers";
import { useBudgetSettings } from "@/hooks/useBudgetSettings";
import { useDifficultyLevels } from "@/hooks/useDifficultyLevels";
import { useActivitySettings } from "@/hooks/useActivitySettings";
import { useCulinarySettings } from "@/hooks/useCulinarySettings";
import { useAccommodationSettings } from "@/hooks/useAccommodationSettings";

export const POIModerationPanel = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { budgetLevels } = useBudgetSettings();
  const { difficultyLevels } = useDifficultyLevels();
  const { categories: activityCategories, intensityLevels, interests, avoidances } = useActivitySettings();
  const { cuisineTypes, dietaryRestrictions, adventureLevels, restaurantCategories } = useCulinarySettings();
  const { accommodationTypes, accommodationAmenities, accommodationLocations, accommodationAccessibility, accommodationSecurity, accommodationAmbiance } = useAccommodationSettings();

  // Résolution code/id → libellé localisé, par champ.
  const byCode = (items: any[], code: string) => {
    const it = (items || []).find((x) => String(x.code) === String(code) || String(x.id) === String(code));
    return it ? (getLocalizedLabel(it, lang) || code) : code;
  };
  const labelArr = (items: any[], v: any) => (Array.isArray(v) ? v.map((c) => byCode(items, c)).join(", ") : String(v));
  const FIELD_ITEMS: Record<string, any[]> = {
    cuisine_types: cuisineTypes, dietary_restrictions_supported: dietaryRestrictions, restaurant_categories: restaurantCategories,
    accommodation_types: accommodationTypes, accommodation_amenities: accommodationAmenities, accommodation_locations: accommodationLocations,
    accommodation_accessibility: accommodationAccessibility, accommodation_security: accommodationSecurity, accommodation_ambiance: accommodationAmbiance,
    activity_categories: activityCategories, activity_interests: interests, activity_avoidances: avoidances,
  };
  const LEVEL_ITEMS: Record<string, any[]> = {
    budget_level_id: budgetLevels, difficulty_level_id: difficultyLevels,
    culinary_adventure_level_id: adventureLevels, activity_intensity_level_id: intensityLevels,
  };

  const renderChange = (k: string, v: any) => {
    if (k === "media_images" || k === "images") {
      const urls: string[] = Array.isArray(v) ? v : [];
      return (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noopener noreferrer">
              <img src={u} alt="" className="w-12 h-12 object-cover rounded border" />
            </a>
          ))}
        </div>
      );
    }
    if (k === "recommendation_level") return <span>{"★".repeat(Number(v) || 0)}<span className="text-muted-foreground"> {Number(v) || 0}/5</span></span>;
    if (typeof v === "boolean") return <span>{v ? t("common.yes", "Oui") : t("common.no", "Non")}</span>;
    if (FIELD_ITEMS[k]) return <span>{labelArr(FIELD_ITEMS[k], v)}</span>;
    if (LEVEL_ITEMS[k]) return <span>{byCode(LEVEL_ITEMS[k], v)}</span>;
    return <span>{String(v)}</span>;
  };
  const fieldLabel = (k: string) => t(`beInspired.suggest.field.${k}`, k);

  const [claims, setClaims] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s, r] = await Promise.all([getPendingPOIClaims(), getPendingPOISuggestions(), getPendingPOIReports()]);
      setClaims(extractArrayFromResponse<any>(c));
      setSuggestions(extractArrayFromResponse<any>(s));
      setReports(extractArrayFromResponse<any>(r));
    } catch {
      toast.error(t("admin.poiModeration.loadError", "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const actClaim = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      await moderatePOIClaim(id, action);
      toast.success(action === "approve" ? t("admin.poiModeration.approved", "Approuvé") : t("admin.poiModeration.rejected", "Rejeté"));
      setClaims((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e?.message || t("admin.poiModeration.actionError", "Action impossible."));
    } finally { setBusyId(null); }
  };
  const actSuggestion = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      await moderatePOISuggestion(id, action);
      toast.success(action === "approve" ? t("admin.poiModeration.approved", "Approuvé") : t("admin.poiModeration.rejected", "Rejeté"));
      setSuggestions((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e?.message || t("admin.poiModeration.actionError", "Action impossible."));
    } finally { setBusyId(null); }
  };

  const actReport = async (id: string, action: "delete" | "keep") => {
    setBusyId(id);
    try {
      await moderatePOIReport(id, action);
      toast.success(action === "delete"
        ? t("admin.poiReports.deleted", "POI supprimé")
        : t("admin.poiReports.kept", "POI conservé (dégelé)"));
      setReports((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e?.message || t("admin.poiModeration.actionError", "Action impossible."));
    } finally { setBusyId(null); }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Signalements (POI gelés) — prioritaire */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="w-5 h-5 text-destructive" />
            {t("admin.poiReports.title", "Signalements de POI (gelés)")}
            <Badge variant="destructive">{reports.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.poiReports.none", "Aucun signalement en attente.")}</p>
          ) : reports.map((r) => (
            <div key={r.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{r.tourist_point_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.reported_by_detail?.email || r.reported_by_detail?.display_name || `#${r.reported_by}`}
                  </p>
                  <p className="text-sm mt-1">
                    <Badge variant="outline" className="mr-1">{r.reason_display || r.reason}</Badge>
                    {r.description}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => actReport(r.id, "delete")} title={t("admin.poiReports.delete", "Supprimer le POI")}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => actReport(r.id, "keep")} title={t("admin.poiReports.keep", "Garder (dégeler)")}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Revendications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="w-5 h-5 text-primary" />
            {t("admin.poiClaims.title", "Revendications de POI")}
            <Badge variant="secondary">{claims.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.poiModeration.noClaims", "Aucune revendication en attente.")}</p>
          ) : claims.map((c) => (
            <div key={c.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{c.tourist_point_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.claimed_by_detail?.email || c.claimed_by_detail?.display_name || `#${c.claimed_by}`}
                  </p>
                  <p className="text-sm mt-1">{c.motivation}</p>
                  {c.proof_url && (
                    <a href={c.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1">
                      <ExternalLink className="w-3 h-3" /> {t("admin.poiClaims.proof", "Justificatif")}
                    </a>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" disabled={busyId === c.id} onClick={() => actClaim(c.id, "approve")}><Check className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => actClaim(c.id, "reject")}><X className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggestions wiki */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PencilLine className="w-5 h-5 text-primary" />
            {t("admin.poiSuggestions.title", "Suggestions d'enrichissement")}
            <Badge variant="secondary">{suggestions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.poiModeration.noSuggestions", "Aucune suggestion en attente.")}</p>
          ) : suggestions.map((s) => (
            <div key={s.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{s.tourist_point_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.suggested_by_detail?.email || s.suggested_by_detail?.display_name || `#${s.suggested_by}`}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(s.proposed_changes || {}).map(([k, v]) => (
                      <div key={k} className="text-xs"><span className="font-medium">{fieldLabel(k)}:</span> {renderChange(k, v)}</div>
                    ))}
                  </div>
                  {s.comment && <p className="text-xs italic text-muted-foreground mt-1">“{s.comment}”</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" disabled={busyId === s.id} onClick={() => actSuggestion(s.id, "approve")}><Check className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => actSuggestion(s.id, "reject")}><X className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default POIModerationPanel;
