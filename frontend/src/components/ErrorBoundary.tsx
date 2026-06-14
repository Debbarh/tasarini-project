import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * Capture les erreurs de rendu d'une sous-arborescence et affiche un message de
 * repli au lieu de faire disparaître toute la page (écran blanc). Indispensable
 * autour des étapes du wizard et des sections riches.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-warning" />
          <p className="text-muted-foreground max-w-md">
            {this.props.fallbackMessage ||
              "Une erreur est survenue lors de l'affichage de cette section."}
          </p>
          <Button variant="outline" onClick={this.reset}>
            Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
