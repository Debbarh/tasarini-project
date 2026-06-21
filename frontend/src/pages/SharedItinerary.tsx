import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { DetailedItineraryView } from "@/components/trip/DetailedItineraryView";
import { savedItineraryService } from "@/services/savedItineraryService";
import { DetailedItinerary } from "@/types/trip";

/** Vue publique en lecture d'un itinéraire partagé : /itinerary/<jeton>. */
export default function SharedItinerary() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [itinerary, setItinerary] = useState<DetailedItinerary | null>(null);
  const [title, setTitle] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setStatus("notfound"); return; }
      try {
        const data = await savedItineraryService.getShared(token);
        if (!active) return;
        setItinerary(data.itinerary_data as DetailedItinerary);
        setTitle(data.title || "");
        setStatus("ok");
      } catch {
        if (active) setStatus("notfound");
      }
    })();
    return () => { active = false; };
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "notfound" || !itinerary) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-md">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-xl font-semibold mb-2">
          {t('sharedItinerary.notFoundTitle', 'Itinéraire indisponible')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t('sharedItinerary.notFoundDescription', 'Ce lien de partage est invalide ou l’itinéraire n’est plus public.')}
        </p>
        <Button onClick={() => navigate('/plan')}>
          {t('sharedItinerary.planMyTrip', 'Planifier mon voyage')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{title ? `${title} - TASARINI` : 'Itinéraire partagé - TASARINI'}</title>
      </Helmet>
      <DetailedItineraryView
        itinerary={itinerary}
        onStartOver={() => navigate('/plan')}
      />
    </>
  );
}
