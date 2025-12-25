import { useEffect, useRef } from "react";
import { Widget } from "@/services/widgetService";
import { useWidgets } from "@/hooks/useWidgets";
import { useUserRegion } from "@/hooks/useUserRegion";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getWidgetComponent, isRegisteredWidget } from "./widgetRegistry";

interface WidgetRendererProps {
  placement: string;
  serviceType?: string;
  className?: string;
}

/**
 * Component to render a single widget
 */
const SingleWidgetRenderer = ({ widget }: { widget: Widget }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const styleRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    // Load CSS if provided
    if (widget.css_url && !styleRef.current) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = widget.css_url;
      document.head.appendChild(link);
      styleRef.current = link;
    }

    // Load script if provided
    if (widget.script_url && !scriptRef.current) {
      const script = document.createElement("script");
      script.src = widget.script_url;

      // Don't use async for Expedia widgets - need synchronous loading
      if (!widget.script_url.includes('expediagroup.com')) {
        script.async = true;
      }

      // Apply configuration from widget settings
      if (widget.configuration?.type) {
        script.type = widget.configuration.type;
      }

      // Add Expedia-specific class if it's an Expedia widget
      if (widget.script_url.includes('expediagroup.com')) {
        script.className = 'eg-widgets-script';

        // For Expedia, wait for script to load, then reinitialize
        script.onload = () => {
          // Give the script time to initialize and scan for widgets
          setTimeout(() => {
            // Try to trigger widget initialization if the global object exists
            if ((window as any).EG && (window as any).EG.init) {
              (window as any).EG.init();
            }
          }, 500);
        };
      }

      // Pass widget configuration to the script
      script.setAttribute("data-widget-config", JSON.stringify(widget.configuration));
      script.setAttribute("data-widget-content", JSON.stringify(widget.content));
      script.setAttribute("data-widget-id", widget.id);

      // Add error handling for external scripts
      script.onerror = (error) => {
        console.warn(`Failed to load widget script: ${widget.script_url}`, error);
        // Silently fail - don't break the page for failed external widgets
      };

      // Add script to document head (required for TravelPayouts and similar widgets)
      document.head.appendChild(script);
      scriptRef.current = script;
    }

    // Cleanup function
    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, [widget]);

  // Execute scripts from HTML after rendering (for third-party widgets)
  useEffect(() => {
    if (!containerRef.current || !widget.content?.html) return;

    // Parse HTML to find scripts
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = widget.content.html;
    const scripts = tempDiv.querySelectorAll('script');

    scripts.forEach((oldScript) => {
      const scriptSrc = oldScript.getAttribute('src');

      if (scriptSrc) {
        // External script - load if not already loaded
        const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
        if (!existingScript) {
          const newScript = document.createElement('script');
          newScript.src = scriptSrc;
          newScript.async = true;

          const className = oldScript.getAttribute('class');
          if (className) {
            newScript.className = className;
          }

          // Add error handling for inline scripts from widget HTML
          newScript.onerror = (error) => {
            console.warn(`Failed to load inline widget script: ${scriptSrc}`, error);
          };

          document.head.appendChild(newScript);
        }
      }
    });
  }, [widget]);

  // Render custom HTML content if provided
  const renderContent = () => {
    // Check if this is a registered React component widget
    if (widget.widget_code && isRegisteredWidget(widget.widget_code)) {
      const WidgetComponent = getWidgetComponent(widget.widget_code);
      if (WidgetComponent) {
        return <WidgetComponent {...(widget.configuration || {})} />;
      }
    }

    if (widget.content?.html) {
      // Remove script tags from HTML (will be executed separately)
      const htmlWithoutScript = widget.content.html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

      return (
        <div
          ref={containerRef}
          dangerouslySetInnerHTML={{ __html: htmlWithoutScript }}
          className="widget-content"
        />
      );
    }

    // Render based on widget type
    switch (widget.widget_type) {
      case 'booking':
        return (
          <div className="widget-booking p-4 border rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-2">{widget.widget_name}</h3>
            {widget.content?.description && (
              <p className="text-sm text-muted-foreground mb-4">{widget.content.description}</p>
            )}
            {widget.content?.button_text && widget.content?.button_url && (
              <a
                href={widget.content.button_url}
                className="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
                target={widget.content?.open_in_new_tab ? "_blank" : "_self"}
                rel={widget.content?.open_in_new_tab ? "noopener noreferrer" : undefined}
              >
                {widget.content.button_text}
              </a>
            )}
          </div>
        );

      case 'search':
        return (
          <div className="widget-search p-4 border rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-2">{widget.widget_name}</h3>
            {widget.content?.iframe_url && (
              <iframe
                src={widget.content.iframe_url}
                className="w-full"
                style={{
                  height: widget.configuration?.height || '400px',
                  border: 'none',
                }}
                title={widget.widget_name}
              />
            )}
          </div>
        );

      case 'promotion':
        return (
          <div
            className="widget-promotion p-6 rounded-lg shadow-sm"
            style={{
              backgroundColor: widget.configuration?.background_color || '#f3f4f6',
              color: widget.configuration?.text_color || '#1f2937',
            }}
          >
            {widget.content?.image_url && (
              <img
                src={widget.content.image_url}
                alt={widget.widget_name}
                className="w-full h-auto mb-4 rounded"
              />
            )}
            <h3 className="text-xl font-bold mb-2">{widget.widget_name}</h3>
            {widget.content?.description && (
              <p className="text-sm mb-4">{widget.content.description}</p>
            )}
            {widget.content?.cta_text && widget.content?.cta_url && (
              <a
                href={widget.content.cta_url}
                className="inline-block px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
                target={widget.content?.open_in_new_tab ? "_blank" : "_self"}
                rel={widget.content?.open_in_new_tab ? "noopener noreferrer" : undefined}
              >
                {widget.content.cta_text}
              </a>
            )}
          </div>
        );

      case 'information':
        return (
          <div className="widget-information p-4 border rounded-lg bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold mb-2 text-blue-900">{widget.widget_name}</h3>
            {widget.content?.text && (
              <p className="text-sm text-blue-800">{widget.content.text}</p>
            )}
          </div>
        );

      case 'partner':
      case 'social':
      case 'custom':
      default:
        return (
          <div
            className="widget-custom"
            ref={containerRef}
            style={{
              minHeight: widget.configuration?.min_height || 'auto',
              ...widget.configuration?.styles,
            }}
          >
            {!widget.script_url && !widget.content?.html && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-muted-foreground">
                  Widget: {widget.widget_name}
                </p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div
      className="widget-wrapper"
      data-widget-id={widget.id}
      data-widget-type={widget.widget_type}
      data-placement={widget.placement}
    >
      {renderContent()}
    </div>
  );
};

/**
 * Component to render all widgets for a specific placement
 */
export const WidgetRenderer = ({ placement, serviceType, className = "" }: WidgetRendererProps) => {
  const { region, loading: regionLoading } = useUserRegion();
  const { widgets, loading, error } = useWidgets({
    placement,
    serviceType,
    activeOnly: true,
  });

  // Filter widgets based on region (if region filter is enabled)
  const filteredWidgets = widgets;

  if (loading || regionLoading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des widgets: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (filteredWidgets.length === 0) {
    return null;
  }

  return (
    <div className={`widgets-container space-y-4 ${className}`} data-placement={placement} data-region={region}>
      {filteredWidgets.map((widget) => (
        <SingleWidgetRenderer key={widget.id} widget={widget} />
      ))}
    </div>
  );
};

export default WidgetRenderer;
