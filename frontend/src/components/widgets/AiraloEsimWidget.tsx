import { useEffect, useRef } from "react";

interface AiraloEsimWidgetProps {
  className?: string;
}

const AIRALO_ESIM_SCRIPT_SRC =
  "https://tpwdg.com/content?trs=476135&shmarker=686719&locale=en&powered_by=false&color_button=%23f2685f&color_focused=%23f2685f&secondary=%23FFFFFF&dark=%2311100f&light=%23FFFFFF&special=%23C4C4C4&border_radius=5&plain=false&no_labels=true&promo_id=8588&campaign_id=541";

export const AiraloEsimWidget = ({ className = "" }: AiraloEsimWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const loadAttemptRef = useRef(0);

  useEffect(() => {
    const triggerInit = () => {
      if (initializedRef.current) return;
      initializedRef.current = true;
    };

    const appendScript = () => {
      const script = document.createElement("script");
      script.src = AIRALO_ESIM_SCRIPT_SRC;
      script.async = true;
      script.addEventListener("load", triggerInit);
      script.addEventListener("error", () => {
        console.error('❌ Failed to load TravelPayouts Airalo eSIM script');
        if (loadAttemptRef.current < 3) {
          loadAttemptRef.current += 1;
          setTimeout(appendScript, 1200);
        }
      });
      if (containerRef.current) {
        containerRef.current.appendChild(script);
      }
      return script;
    };

    const selector = `script[src="${AIRALO_ESIM_SCRIPT_SRC}"]`;
    let script = containerRef.current?.querySelector<HTMLScriptElement>(selector);
    const scriptAlreadyPresent = Boolean(script);

    if (!script && containerRef.current) {
      script = appendScript();
    } else if (script) {
      triggerInit();
    }

    const retry = setInterval(() => {
      if (!initializedRef.current && containerRef.current) {
        triggerInit();
      }
    }, 1500);

    return () => {
      if (scriptAlreadyPresent) {
        script?.removeEventListener("load", triggerInit);
      }
      clearInterval(retry);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6 ${className}`}
    />
  );
};

export default AiraloEsimWidget;
