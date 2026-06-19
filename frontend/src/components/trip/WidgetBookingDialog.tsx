import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Compass, Plane, Car, CarTaxiFront, Bus, CarFront, Smartphone, Utensils, Scale } from "lucide-react";
import { ToursWidget } from "@/components/widgets/ToursWidget";
import { ExpediaSearchWidget } from "@/components/widgets/ExpediaSearchWidget";
import { CarRentalWidget } from "@/components/widgets/CarRentalWidget";
import { TransferWidget } from "@/components/widgets/TransferWidget";
import { PublicTransportWidget } from "@/components/widgets/PublicTransportWidget";
import { InDriveCityWidget } from "@/components/widgets/InDriveCityWidget";
import { AiraloEsimWidget } from "@/components/widgets/AiraloEsimWidget";
import { EatWithWidget } from "@/components/widgets/EatWithWidget";
import { AirHelpWidget } from "@/components/widgets/AirHelpWidget";

export type WidgetTab =
  | "tours" | "expedia" | "car" | "transfer" | "public" | "urban" | "esim" | "dining" | "compensation";

interface WidgetBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: WidgetTab;
}

const TABS: { key: WidgetTab; icon: typeof Compass; labelKey: string; fallback: string; Widget: React.ComponentType<{ className?: string }> }[] = [
  { key: "tours", icon: Compass, labelKey: "booking.tabs.tours", fallback: "Activités & visites", Widget: ToursWidget },
  { key: "expedia", icon: Plane, labelKey: "booking.tabs.flightsHotels", fallback: "Vols & hôtels", Widget: ExpediaSearchWidget },
  { key: "car", icon: Car, labelKey: "booking.tabs.carRental", fallback: "Location voiture", Widget: CarRentalWidget },
  { key: "transfer", icon: CarTaxiFront, labelKey: "booking.tabs.transfers", fallback: "Transferts", Widget: TransferWidget },
  { key: "public", icon: Bus, labelKey: "booking.tabs.publicTransport", fallback: "Bus & train", Widget: PublicTransportWidget },
  { key: "urban", icon: CarFront, labelKey: "booking.tabs.urban", fallback: "Transport urbain", Widget: InDriveCityWidget },
  { key: "esim", icon: Smartphone, labelKey: "booking.tabs.esim", fallback: "Carte eSIM", Widget: AiraloEsimWidget },
  { key: "dining", icon: Utensils, labelKey: "booking.tabs.dining", fallback: "Repas locaux", Widget: EatWithWidget },
  { key: "compensation", icon: Scale, labelKey: "booking.tabs.compensation", fallback: "Indemnisation vol", Widget: AirHelpWidget },
];

/**
 * Popup compacte de réservation : onglets vers les widgets d'affiliation
 * (TravelPayouts / Expedia). Le widget de l'onglet actif est monté à la demande
 * (Radix démonte les onglets inactifs), évitant de charger 9 scripts d'un coup.
 */
export default function WidgetBookingDialog({ open, onOpenChange, defaultTab = "tours" }: WidgetBookingDialogProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<WidgetTab>(defaultTab);

  // Repositionner sur l'onglet demandé à chaque ouverture
  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[92vw] max-h-[88vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{t("booking.dialogTitle", "Réserver vos prestations")}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as WidgetTab)} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 overflow-x-auto">
            <TabsList className="inline-flex w-max">
              {TABS.map(({ key, icon: Icon, labelKey, fallback }) => (
                <TabsTrigger key={key} value={key} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(labelKey, fallback)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {TABS.map(({ key, Widget }) => (
              <TabsContent key={key} value={key} className="mt-0">
                {/* monté uniquement quand l'onglet est actif */}
                <Widget />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
