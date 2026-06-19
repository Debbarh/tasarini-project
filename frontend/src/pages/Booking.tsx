import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Hotel } from "lucide-react";
import { Navigate } from "react-router-dom";
import { BookingEnrichmentPanel } from "@/components/trip/BookingEnrichmentPanel";
import { useSystemSettings } from "@/hooks/useSystemSettings";

/**
 * Page dédiée à la recherche/réservation (hôtels, vols, transferts, activités).
 * Les résultats s'affichent ici, plus en inline sur la page d'accueil.
 */
const Booking = () => {
  const { t } = useTranslation();
  const { settings } = useSystemSettings();

  // Module Centrale de réservation désactivé par l'admin → page inaccessible
  if (!settings.bookingCenterEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="container mx-auto px-4 py-8 sm:py-12">
      <Helmet>
        <title>{t("booking.title")} - Tasarini</title>
        <meta name="description" content={t("booking.subtitle")} />
      </Helmet>

      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 flex items-center justify-center gap-2">
          <Hotel className="h-7 w-7 text-primary" />
          {t("booking.title")}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t("booking.subtitle")}
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        <BookingEnrichmentPanel standalone={true} />
      </div>
    </main>
  );
};

export default Booking;
