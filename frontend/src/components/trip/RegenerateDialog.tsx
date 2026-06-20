import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

export interface RegenerateValues {
  intensity: string;
  activitiesPerDay?: number;
  specialRequests: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: RegenerateValues;
  onSubmit: (v: RegenerateValues) => void;
}

const RHYTHMS = [
  { code: "relaxed", key: "planTrip.regenerate.lighter", fallback: "Plus léger" },
  { code: "moderate", key: "planTrip.regenerate.standard", fallback: "Standard" },
  { code: "intense", key: "planTrip.regenerate.intense", fallback: "Plus intense" },
];

/** Dialogue compact « Donne-moi une autre proposition » : ajuste rythme + activités/jour + demandes,
 *  puis relance la génération (startStreaming) à partir des préférences initiales modifiées. */
export const RegenerateDialog = ({ open, onOpenChange, initial, onSubmit }: Props) => {
  const { t } = useTranslation();
  const [intensity, setIntensity] = useState(initial.intensity || "moderate");
  const [perDay, setPerDay] = useState<number | undefined>(initial.activitiesPerDay);
  const [special, setSpecial] = useState(initial.specialRequests || "");

  // Re-synchronise quand on rouvre le dialogue avec d'autres valeurs initiales.
  useEffect(() => {
    if (open) {
      setIntensity(initial.intensity || "moderate");
      setPerDay(initial.activitiesPerDay);
      setSpecial(initial.specialRequests || "");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("planTrip.regenerate.title", "Une autre proposition")}
          </DialogTitle>
          <DialogDescription>
            {t("planTrip.regenerate.desc", "Ajustez le rythme puis relancez la génération.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm">{t("planTrip.regenerate.rhythm", "Rythme")}</Label>
            <div className="flex gap-2 mt-1.5">
              {RHYTHMS.map((r) => (
                <Button key={r.code} type="button" size="sm"
                  variant={intensity === r.code ? "default" : "outline"}
                  onClick={() => setIntensity(r.code)}>
                  {t(r.key, r.fallback)}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm">{t("planTrip.activitiesStep.perDay", "Activités par jour")}</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <Button type="button" size="sm" variant={!perDay ? "default" : "outline"}
                onClick={() => setPerDay(undefined)}>
                {t("planTrip.activitiesStep.perDayAuto", "Auto")}
              </Button>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <Button key={n} type="button" size="sm" variant={perDay === n ? "default" : "outline"}
                  onClick={() => setPerDay(n)}>
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="rg-special" className="text-sm">
              {t("planTrip.regenerate.special", "Demandes spéciales")}
            </Label>
            <Textarea id="rg-special" rows={3} value={special} onChange={(e) => setSpecial(e.target.value)}
              placeholder={t("planTrip.regenerate.specialPlaceholder", "Ex. plus de culture, éviter les longues marches…")}
              className="mt-1.5" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Annuler")}
          </Button>
          <Button onClick={() => onSubmit({ intensity, activitiesPerDay: perDay, specialRequests: special })}>
            <Sparkles className="h-4 w-4 mr-2" />
            {t("planTrip.regenerate.cta", "Régénérer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegenerateDialog;
