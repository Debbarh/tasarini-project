import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createPOIClaim } from "@/services/poiService";

interface Props {
  children?: React.ReactNode;   // déclencheur (optionnel : mode contrôlé sinon)
  poiId: string;                // UUID réel (POI déjà persisté)
  poiName: string;
  open?: boolean;               // mode contrôlé
  onOpenChange?: (o: boolean) => void;
}

/**
 * Revendiquer la gestion d'un POI (« ce lieu m'appartient »).
 * Soumet motivation + lien de preuve optionnel → validation admin → devient partenaire.
 */
export const POIClaimDialog = ({ children, poiId, poiName, open: openProp, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (o: boolean) => { onOpenChange ? onOpenChange(o) : setInternalOpen(o); };
  const [motivation, setMotivation] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!motivation.trim()) {
      toast.error(t("beInspired.claim.motivationRequired", "Veuillez expliquer votre lien avec ce lieu."));
      return;
    }
    setSubmitting(true);
    try {
      await createPOIClaim(poiId, { motivation: motivation.trim(), proof_url: proofUrl.trim() });
      toast.success(t("beInspired.claim.success", "Demande envoyée ! Un administrateur la validera."));
      setOpen(false);
      setMotivation("");
      setProofUrl("");
    } catch (e: any) {
      toast.error(e?.payload?.detail || e?.message || t("beInspired.claim.error", "Impossible d'envoyer la demande."));
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
            <BadgeCheck className="w-5 h-5 text-primary" />
            {t("beInspired.claim.title", "Revendiquer ce lieu")}
          </DialogTitle>
          <DialogDescription>
            {t("beInspired.claim.desc", { name: poiName, defaultValue: "Demandez la gestion de « {{name}} ». Après validation, vous devenez partenaire et pouvez l'éditer." })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="claim-motivation">{t("beInspired.claim.motivationLabel", "Votre lien avec ce lieu *")}</Label>
            <Textarea
              id="claim-motivation"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder={t("beInspired.claim.motivationPlaceholder", "Ex. je suis le propriétaire / gérant de cet établissement…")}
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="claim-proof">{t("beInspired.claim.proofLabel", "Lien justificatif (optionnel)")}</Label>
            <Input
              id="claim-proof"
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BadgeCheck className="w-4 h-4 mr-2" />}
            {t("beInspired.claim.submit", "Envoyer la demande")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default POIClaimDialog;
