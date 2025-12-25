import { useEffect, useRef } from "react";

const TRANSFER_3_SCRIPT_SRC = "https://tpwdg.com/content?trs=476135&powered_by=false&shmarker=686719&language=en&display_currency=RUB&transfer_type=any&theme=white&hide_form_extras=true&hide_external_links=true&disable_currency_selector=true&campaign_id=1&promo_id=691";

interface TransferWidget3Props {
  className?: string;
}

export const TransferWidget3 = ({ className = "" }: TransferWidget3Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const loadAttemptRef = useRef(0);

  useEffect(() => {
    // TravelPayouts widgets typically inject content after script load
    // We need to ensure the script loads and processes our container
    const triggerInit = () => {
      if (initializedRef.current) return;

      // TravelPayouts automatically scans for widget containers
      // Mark as initialized to prevent duplicate loads
      initializedRef.current = true;
    };

    const appendScript = () => {
      const script = document.createElement("script");
      script.src = TRANSFER_3_SCRIPT_SRC;
      script.async = true;

      script.addEventListener("load", triggerInit);
      script.addEventListener("error", () => {
        console.error('❌ Failed to load TravelPayouts transfer (3) script');
        // Retry if load failed (ad-blockers, network hiccup)
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

    // Check if script already exists in the container
    const selector = `script[src="${TRANSFER_3_SCRIPT_SRC}"]`;
    let script = containerRef.current?.querySelector<HTMLScriptElement>(selector);
    const scriptAlreadyPresent = Boolean(script);

    if (!script && containerRef.current) {
      script = appendScript();
    } else if (script) {
      // Script exists, mark as initialized
      triggerInit();
    }

    // Periodic check to ensure widget loaded
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

export default TransferWidget3;
