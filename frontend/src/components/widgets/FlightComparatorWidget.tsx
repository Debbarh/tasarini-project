import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Comparateur de vols White Label TravelPayouts.
 *
 * ⚠️ La langue d'un White Label TP n'est PAS pilotable par paramètre d'URL :
 * elle est fixée dans le dashboard TravelPayouts pour chaque wl_id. Pour suivre
 * la langue du site, il faut créer UN White Label par langue (chacun a son wl_id)
 * puis les renseigner ci-dessous. Tant qu'une langue n'a pas de wl_id dédié, on
 * retombe sur DEFAULT_WL_ID.
 */
const WL_IDS: Record<string, string> = {
  fr: "1099",
  // en: "XXXX",   // ← créer le White Label EN dans TravelPayouts puis coller le wl_id
  // es: "XXXX",
  // de: "XXXX",
  // it: "XXXX",
  // pt: "XXXX",
  // ru: "XXXX",
  // ja: "XXXX",
  // zh: "XXXX",
  // ar: "XXXX",
  // hi: "XXXX",
};
const DEFAULT_WL_ID = "1099";

interface Props {
  className?: string;
}

export const FlightComparatorWidget = ({ className = "" }: Props) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "fr").split("-")[0];
  const wlId = WL_IDS[lang] || DEFAULT_WL_ID;

  useEffect(() => {
    const src = `https://tpwdg.com/wl_web/main.js?wl_id=${wlId}`;

    // Retirer toute instance précédente du script WL (wl_id différent) et vider
    // les conteneurs pour un rendu propre.
    document.querySelectorAll('script[src*="wl_web/main.js"]').forEach((s) => s.remove());
    ["tpwl-search", "tpwl-tickets", "tpwl-hotels", "tpwl-modals"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });

    const script = document.createElement("script");
    script.async = true;
    script.type = "module";
    script.src = src;
    script.setAttribute("data-noptimize", "1");
    script.setAttribute("data-cfasync", "false");
    script.setAttribute("data-wpfc-render", "false");
    document.head.appendChild(script);
  }, [wlId]);

  return (
    <div className={className}>
      <div id="tpwl-search"></div>
      <div id="tpwl-tickets" className="mt-4"></div>
      <div id="tpwl-hotels" className="mt-4"></div>
      <div id="tpwl-modals"></div>
    </div>
  );
};

export default FlightComparatorWidget;
