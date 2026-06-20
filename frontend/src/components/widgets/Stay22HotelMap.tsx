import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Carte hôtels Stay22 PERSONNALISÉE via l'API GEM (Generate Embed Map).
 *
 * L'« API » Stay22 = une URL d'embed entièrement paramétrable :
 *   https://www.stay22.com/embed/gm?aid=&lat=&lng=&maincolor=&mapstyle=&ljs=...
 * On la centre dynamiquement, on applique la charte (azur) et la langue du site.
 * Le script letmeallez (auto-affiliation des liens) est injecté une seule fois.
 */
const STAY22_AID = "6a31ba38924c59c0ff9b7338"; // identifiant affilié Stay22 (lmaID)
const STAY22_LMA_ID = "6a31ba38924c59c0ff9b7338";
const LETMEALLEZ_SRC = "https://scripts.stay22.com/letmeallez.js";
const BRAND_COLOR = "1899D6"; // azur Tasarini (sans #)

// Init global une seule fois (letmeallez fige window.Stay22.params après chargement).
let stay22Initialized = false;

interface Props {
  className?: string;
  height?: number;
  /** Hauteur responsive via classes Tailwind (ex. "h-[300px] sm:h-[440px]"). Prioritaire sur `height`. */
  heightClass?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
}

export const Stay22HotelMap = ({
  className = "",
  height = 460,
  heightClass = "",
  lat = 48.8566,
  lng = 2.3522,
  zoom = 13,
}: Props) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "fr").split("-")[0];

  useEffect(() => {
    if (typeof window === "undefined" || stay22Initialized) return;
    stay22Initialized = true;
    const w = window as any;
    try {
      if (!w.Stay22 || !Object.isFrozen(w.Stay22)) {
        w.Stay22 = w.Stay22 || {};
        w.Stay22.params = { lmaID: STAY22_LMA_ID };
      }
    } catch {
      /* params en lecture seule après chargement du script */
    }
    if (!document.querySelector(`script[src="${LETMEALLEZ_SRC}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = LETMEALLEZ_SRC;
      document.head.appendChild(script);
    }
  }, []);

  const params = new URLSearchParams({
    aid: STAY22_AID,
    lat: String(lat),
    lng: String(lng),
    zoom: String(zoom),
    maincolor: BRAND_COLOR,
    mapstyle: "light",
    viewmode: "all", // hybride carte + liste
    ljs: lang,
    campaign: "tasarini-home",
  });
  const src = `https://www.stay22.com/embed/gm?${params.toString()}`;

  return (
    <div className={className}>
      <iframe
        id="stay22-widget"
        title="Stay22 — hôtels & hébergements"
        width="100%"
        {...(heightClass ? {} : { height })}
        src={src}
        frameBorder="0"
        loading="lazy"
        className={`rounded-xl w-full ${heightClass}`}
      />
    </div>
  );
};

export default Stay22HotelMap;
