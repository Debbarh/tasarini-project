import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import FlightComparatorWidget from "./FlightComparatorWidget";

interface Props {
  children: React.ReactNode; // déclencheur
}

/**
 * Dialogue de recherche de vols via TravelPayouts (comparateur White Label),
 * pendant des hôtels Stay22. Liens auto-affiliés TravelPayouts.
 */
export const FlightSearchDialog = ({ children }: Props) => {
  const { t } = useTranslation();
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("flights.title", "Vols")}</DialogTitle>
          <DialogDescription>
            {t("flights.desc", "Comparez et réservez vos vols.")}
          </DialogDescription>
        </DialogHeader>
        <FlightComparatorWidget />
      </DialogContent>
    </Dialog>
  );
};

export default FlightSearchDialog;
