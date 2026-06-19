import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import Stay22HotelMap from "./Stay22HotelMap";

interface Props {
  children: React.ReactNode; // élément déclencheur (bouton…)
  lat?: number;
  lng?: number;
  title?: string;
  destinationName?: string;
}

/**
 * Dialogue de réservation d'hôtels via Stay22 (carte embed GEM centrée sur la zone).
 * Remplace la recherche Amadeus (données de test) — Stay22 fournit des hôtels réels
 * avec prix + réservation, et les liens sont auto-affiliés (script letmeallez).
 */
export const Stay22HotelDialog = ({ children, lat, lng, title, destinationName }: Props) => {
  const { t } = useTranslation();
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title || t("hotels.stay22Title", "Hôtels & hébergements")}</DialogTitle>
          <DialogDescription>
            {destinationName
              ? t("hotels.stay22DescDest", { dest: destinationName, defaultValue: "Hébergements autour de {{dest}}" })
              : t("hotels.stay22Desc", "Comparez et réservez un hébergement autour de cette zone.")}
          </DialogDescription>
        </DialogHeader>
        <Stay22HotelMap lat={lat} lng={lng} height={520} />
      </DialogContent>
    </Dialog>
  );
};

export default Stay22HotelDialog;
