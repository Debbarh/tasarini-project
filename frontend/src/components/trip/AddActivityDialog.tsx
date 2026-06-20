import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/integrations/api/client";
import type { DailyActivity } from "@/types/trip";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Activité existante à éditer ; absent = ajout. */
  initial?: DailyActivity | null;
  /** Contexte (ville/destination) pour aider l'IA. */
  destination?: string;
  onSave: (activity: DailyActivity) => void;
}

const tipsToText = (tips?: string | string[]) =>
  Array.isArray(tips) ? tips.join("\n") : (tips || "");
const textToTips = (txt: string) =>
  txt.split("\n").map((s) => s.trim()).filter(Boolean);

/** Ajout/édition manuelle d'une activité (utilisateur authentifié) + génération IA de la
 *  description et des conseils pour ce que l'utilisateur a saisi. */
export const AddActivityDialog = ({ open, onOpenChange, initial, destination, onSave }: Props) => {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [locName, setLocName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");
  const [tipsText, setTipsText] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loc = initial?.location;
    const locObj = typeof loc === "object" && loc ? loc : null;
    setTitle(initial?.title || "");
    setTime(initial?.time || "");
    setLocName(locObj?.name || (typeof loc === "string" ? loc : "") || "");
    setAddress(locObj?.address || "");
    setLat(locObj?.latitude != null ? String(locObj.latitude) : "");
    setLng(locObj?.longitude != null ? String(locObj.longitude) : "");
    setDescription(initial?.description || "");
    setTipsText(tipsToText(initial?.tips));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    if (!title.trim()) {
      toast.error(t("planTrip.addActivity.titleRequired", "Renseignez d'abord le titre de l'activité."));
      return;
    }
    setGenerating(true);
    try {
      const res = await apiClient.post<{ description: string; tips: string[] }>(
        "travel/activity/describe/",
        { title: title.trim(), destination: destination || locName, language: i18n.language }
      );
      if (res.description) setDescription(res.description);
      if (Array.isArray(res.tips) && res.tips.length) setTipsText(res.tips.join("\n"));
      toast.success(t("planTrip.addActivity.generated", "Description et conseils générés."));
    } catch (e: any) {
      toast.error(e?.message || t("planTrip.addActivity.generateError", "Échec de la génération."));
    } finally {
      setGenerating(false);
    }
  };

  const save = () => {
    if (!title.trim()) {
      toast.error(t("planTrip.addActivity.titleRequired", "Renseignez d'abord le titre de l'activité."));
      return;
    }
    const latN = parseFloat(lat), lngN = parseFloat(lng);
    const hasCoords = !Number.isNaN(latN) && !Number.isNaN(lngN);
    const activity: DailyActivity = {
      id: initial?.id || `custom-${Date.now()}`,
      time: time.trim(),
      title: title.trim(),
      description: description.trim(),
      duration: initial?.duration || "",
      type: initial?.type || "custom",
      cost: initial?.cost ?? 0,
      difficulty: initial?.difficulty || "easy",
      tips: textToTips(tipsText),
      custom: true,
      location: {
        name: locName.trim() || title.trim(),
        address: address.trim() || undefined,
        ...(hasCoords ? { latitude: latN, longitude: lngN } : {}),
      },
    };
    onSave(activity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial
              ? t("planTrip.addActivity.editTitle", "Modifier l'activité")
              : t("planTrip.addActivity.addTitle", "Ajouter une activité")}
          </DialogTitle>
          <DialogDescription>
            {t("planTrip.addActivity.desc", "Renseignez l'activité ; l'IA peut générer une description et des conseils.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="aa-title" className="text-sm">{t("planTrip.addActivity.name", "Titre")}</Label>
              <Input id="aa-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="aa-time" className="text-sm">{t("planTrip.addActivity.time", "Heure")}</Label>
              <Input id="aa-time" placeholder="14:00" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="aa-loc" className="text-sm">{t("planTrip.addActivity.place", "Lieu")}</Label>
            <Input id="aa-loc" value={locName} onChange={(e) => setLocName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="aa-addr" className="text-sm">{t("planTrip.addActivity.address", "Adresse")}</Label>
            <Input id="aa-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="aa-lat" className="text-sm">{t("planTrip.addActivity.lat", "Latitude")}</Label>
              <Input id="aa-lat" inputMode="decimal" placeholder="48.8584" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="aa-lng" className="text-sm">{t("planTrip.addActivity.lng", "Longitude")}</Label>
              <Input id="aa-lng" inputMode="decimal" placeholder="2.2945" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="aa-desc" className="text-sm">{t("planTrip.addActivity.description", "Description")}</Label>
            <Button type="button" variant="outline" size="sm" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              {t("planTrip.addActivity.generate", "Description & conseils (IA)")}
            </Button>
          </div>
          <Textarea id="aa-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="space-y-1">
            <Label htmlFor="aa-tips" className="text-sm">{t("planTrip.addActivity.tips", "Conseils (un par ligne)")}</Label>
            <Textarea id="aa-tips" rows={3} value={tipsText} onChange={(e) => setTipsText(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel", "Annuler")}</Button>
          <Button onClick={save}>{t("common.save", "Enregistrer")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddActivityDialog;
