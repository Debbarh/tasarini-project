import { useEffect, useRef } from "react";

const EXPEDIA_WIDGET_SRC = "https://creator.expediagroup.com/products/widgets/assets/eg-widgets.js";

interface ExpediaSearchWidgetProps {
  className?: string;
}

export const ExpediaSearchWidget = ({ className = "" }: ExpediaSearchWidgetProps) => {
  const initializedRef = useRef(false);
  const loadAttemptRef = useRef(0);

  useEffect(() => {
    // Expedia script attaches a DOMContentLoaded listener to scan .eg-widget elements.
    // In a SPA we need to trigger it manually after the script loads.
    const triggerInit = () => {
      if (initializedRef.current) return;

      const egGlobal = (window as typeof window & { eg?: { widgets?: any } }).eg;
      if (egGlobal?.widgets) {
        // Force re-scan of widgets
        egGlobal.widgets.loaded = false;
        window.dispatchEvent(new Event("DOMContentLoaded"));
        initializedRef.current = true;
      }
    };

    const appendScript = () => {
      const script = document.createElement("script");
      script.src = EXPEDIA_WIDGET_SRC;
      script.className = "eg-widgets-script";
      script.async = false; // Needed so the script scans the DOM after load
      script.addEventListener("load", triggerInit);
      script.addEventListener("error", () => {
        // Retry if load failed (ad-blockers, network hiccup)
        if (loadAttemptRef.current < 3) {
          loadAttemptRef.current += 1;
          setTimeout(appendScript, 1200);
        }
      });
      document.body.appendChild(script);
      return script;
    };

    const selector = `script.eg-widgets-script[src="${EXPEDIA_WIDGET_SRC}"]`;
    let script = document.querySelector<HTMLScriptElement>(selector);
    const scriptAlreadyPresent = Boolean(script);

    if (!script) {
      script = appendScript();
    } else if ((window as any).EG?.init) {
      triggerInit();
    } else {
      script.addEventListener("load", triggerInit);
    }

    const retry = setInterval(triggerInit, 1200);

    return () => {
      if (scriptAlreadyPresent) {
        script?.removeEventListener("load", triggerInit);
      }
      clearInterval(retry);
    };
  }, []);

  return (
    <div className={`max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div
        className="eg-widget"
        data-widget="search"
        data-program="us-expedia"
        data-lobs="stays,flights"
        data-network="pz"
        data-camref="1101lw5zj"
        data-pubref=""
      />
    </div>
  );
};

export default ExpediaSearchWidget;
