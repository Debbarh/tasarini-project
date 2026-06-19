import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { POI, createPOIReport } from "@/services/poiService";

interface Props {
  children?: React.ReactNode;
  poi: POI;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  onReported?: () => void; // pour retirer le POI gelé de la carte
}

const REASONS = ["spam", "offensive", "wrong_location", "closed", "duplicate", "other"] as const;

/** Signaler un POI. Au 1er signalement, le POI est gelé (masqué) jusqu'à décision admin. */
export const POIReportDialog = ({ children, poi, open: openProp, onOpenChange, onReported }: Props) => {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (o: boolean) => { onOpenChange ? onOpenChange(o) : setInternalOpen(o); };
  const [reason, setReason] = useState<string>("other");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await createPOIReport(poi.id, reason, description.trim());
      toast.success(t("beInspired.report.success", "Merci, ce lieu a été signalé et mis en attente de vérification."));
      setOpen(false);
      setDescription("");
      onReported?.();
    } catch (e: any) {
      toast.error(e?.payload?.detail || e?.message || t("beInspired.report.error", "Impossible d'envoyer le signalement."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            {t("beInspired.report.title", "Signaler ce lieu")}
          </DialogTitle>
          <DialogDescription>
            {t("beInspired.report.desc", { name: poi.name, defaultValue: "Signalez un problème avec « {{name}} ». Le lieu sera mis en attente le temps qu'un administrateur vérifie." })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("beInspired.report.reason", "Motif")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{t(`beInspired.report.reasons.${r}`, r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rp-desc">{t("beInspired.report.description", "Détails (optionnel)")}</Label>
            <Textarea id="rp-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button className="w-full" variant="destructive" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Flag className="w-4 h-4 mr-2" />}
            {t("beInspired.report.submit", "Envoyer le signalement")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default POIReportDialog;
