import { useEffect, useRef } from "react";

interface EatWithWidgetProps {
  className?: string;
}

const EATWITH_SCRIPT_SRC =
  "https://tpwdg.com/content?trs=476135&shmarker=686719&location=New-York&pricemin=&pricemax=&powered_by=false&limit=5&scroll_height=&promo_id=5075&campaign_id=164";

export const EatWithWidget = ({ className = "" }: EatWithWidgetProps) => {
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
      script.src = EATWITH_SCRIPT_SRC;
      script.async = true;
      script.addEventListener("load", triggerInit);
      script.addEventListener("error", () => {
        console.error('❌ Failed to load TravelPayouts EatWith restaurant script');
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

    const selector = `script[src="${EATWITH_SCRIPT_SRC}"]`;
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

export default EatWithWidget;
