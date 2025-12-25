import { useEffect, useRef } from "react";

interface InDriveCityWidgetProps {
  className?: string;
}

const INDRIVE_CITY_SCRIPT_SRC =
  "https://tpwdg.com/content?trs=476135&shmarker=686719&locale=en&powered_by=false&color_button=%23A7E92F&color_icons=%23A7E92F&dark=%23323942&light=%23FFFFFF&secondary=%23016A2B&special=%23a7e92f&color_focused=%23A7E92F&border_radius=30&plain=false&promo_id=8450&campaign_id=371";

export const InDriveCityWidget = ({ className = "" }: InDriveCityWidgetProps) => {
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
      script.src = INDRIVE_CITY_SCRIPT_SRC;
      script.async = true;
      script.addEventListener("load", triggerInit);
      script.addEventListener("error", () => {
        console.error('❌ Failed to load TravelPayouts inDrive City script');
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

    const selector = `script[src="${INDRIVE_CITY_SCRIPT_SRC}"]`;
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

export default InDriveCityWidget;
